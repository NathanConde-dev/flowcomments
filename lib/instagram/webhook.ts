import { prisma } from '@/lib/db/client';
import { findMatchingAutomations } from '@/lib/automation/engine';
import { createQueue, QUEUE_NAMES } from '@/lib/queue/client';

export interface WebhookEntry {
  id: string;
  time: number;
  changes?: Array<{
    field: string;
    value: any;
  }>;
  messaging?: Array<{
    sender: { id: string };
    recipient: { id: string };
    timestamp: number;
    message?: {
      mid: string;
      text: string;
    };
  }>;
}

export interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

export async function verifyWebhook(
  mode: string,
  token: string,
  challenge: string
): Promise<string | null> {
  if (mode !== 'subscribe') {
    return null;
  }

  try {
    // Get stored webhook verify token from SystemConfig
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'META_WEBHOOK_VERIFY_TOKEN' },
    });

    // Fall back to env var if not in DB
    const storedToken = config?.value || process.env.WEBHOOK_VERIFY_TOKEN;

    if (storedToken && token === storedToken) {
      console.log('Webhook verified successfully');
      return challenge;
    }

    console.warn('Webhook verification failed: token mismatch');
    return null;
  } catch (error) {
    console.error('Webhook verification error:', error);
    return null;
  }
}

export async function handleWebhookEvent(payload: WebhookPayload): Promise<void> {
  const queue = createQueue(QUEUE_NAMES.WEBHOOK);

  if (queue) {
    await queue.add('process-webhook', payload, {
      priority: 1,
    });
  } else {
    await processWebhookEvent(payload);
  }
}

export async function processWebhookEvent(payload: WebhookPayload): Promise<void> {
  if (payload.object !== 'instagram' && payload.object !== 'page') {
    return;
  }

  for (const entry of payload.entry) {
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === 'comments') {
          await handleCommentEvent(change.value);
        } else if (change.field === 'mentions') {
          await handleMentionEvent(change.value);
        }
      }
    }

    if (entry.messaging) {
      for (const message of entry.messaging) {
        await handleMessagingEvent(message);
      }
    }
  }
}

async function handleCommentEvent(value: any): Promise<void> {
  const comment = value;
  const igUserId = comment.from?.id;
  const commentId = comment.id;
  const commentText = comment.text;

  if (!igUserId || !commentId || !commentText) {
    return;
  }

  const igAccount = await prisma.instagramAccount.findFirst({
    where: { 
      igUserId: value.media?.owner?.id || value.owner?.id,
      isActive: true 
    },
  });

  if (!igAccount) {
    return;
  }

  await prisma.webhookEvent.create({
    data: {
      userId: igAccount.userId,
      igAccountId: igAccount.id,
      eventType: 'comment',
      payload: JSON.stringify(value),
      processed: false,
    },
  });

  const matchedAutomations = await findMatchingAutomations(igAccount.id, { text: commentText });

  for (const automationId of matchedAutomations) {
    const queue = createQueue(QUEUE_NAMES.AUTOMATION);
    const jobData = {
      automationId,
      context: {
        commentId,
        commentText,
        userId: igUserId,
        username: comment.from?.username,
      },
    };
    
    if (queue) {
      await queue.add('execute-automation', jobData);
    } else {
      const { executeAutomation } = await import('@/lib/automation/engine');
      await executeAutomation(automationId, jobData.context);
    }
  }

  let contact = await prisma.contact.findFirst({
    where: {
      igAccountId: igAccount.id,
      igUserId,
    },
  });

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        userId: igAccount.userId,
        igAccountId: igAccount.id,
        igUserId,
        igUsername: comment.from?.username || igUserId,
        lastSeenAt: new Date(),
      },
    });
  } else {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastSeenAt: new Date() },
    });
  }
}

async function handleMentionEvent(value: any): Promise<void> {
  console.log('Mention event received:', value);
}

async function handleMessagingEvent(message: any): Promise<void> {
  const senderId = message.sender?.id;
  const recipientId = message.recipient?.id;
  const messageText = message.message?.text;
  const messageId = message.message?.mid;

  if (!senderId || !recipientId || !messageText || !messageId) {
    return;
  }

  const igAccount = await prisma.instagramAccount.findFirst({
    where: { igUserId: recipientId, isActive: true },
  });

  if (!igAccount) {
    return;
  }

  await prisma.webhookEvent.create({
    data: {
      userId: igAccount.userId,
      igAccountId: igAccount.id,
      eventType: 'message',
      payload: JSON.stringify(message),
      processed: true,
    },
  });

  let contact = await prisma.contact.findFirst({
    where: {
      igAccountId: igAccount.id,
      igUserId: senderId,
    },
  });

  if (!contact) {
    contact = await prisma.contact.create({
      data: {
        userId: igAccount.userId,
        igAccountId: igAccount.id,
        igUserId: senderId,
        igUsername: senderId,
        lastSeenAt: new Date(),
      },
    });
  }

  const conversation = await prisma.conversation.upsert({
    where: {
      igThreadId: `${recipientId}_${senderId}`,
    },
    create: {
      userId: igAccount.userId,
      igAccountId: igAccount.id,
      contactId: contact.id,
      igThreadId: `${recipientId}_${senderId}`,
      lastMessageAt: new Date(message.timestamp),
      unreadCount: 1,
    },
    update: {
      lastMessageAt: new Date(message.timestamp),
      unreadCount: { increment: 1 },
    },
  });

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      igMessageId: messageId,
      fromIgUserId: senderId,
      toIgUserId: recipientId,
      messageType: 'text',
      text: messageText,
      isFromPage: false,
      sentAt: new Date(message.timestamp),
    },
  });
}
