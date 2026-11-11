import { prisma } from '@/lib/db/client';
import {
  executeButtonPostback,
  executeFollowGatePostback,
  findMatchingAutomations,
  findMatchingDmAutomation,
  handlePendingInputReply,
  parseButtonPayload,
  parseFollowGatePayload,
  parseIcePayload,
  queueOrExecuteAutomation,
} from '@/lib/automation/engine';
import { createQueue, QUEUE_NAMES } from '@/lib/queue/client';
import { decrypt } from '@/lib/crypto/encryption';
import { timingSafeEqualString } from '@/lib/crypto/security';
import { getMetaConfig } from '@/lib/instagram/oauth';

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
      text?: string;
      is_echo?: boolean;
      quick_reply?: { payload?: string };
      reply_to?: {
        story?: { url?: string; id?: string };
      };
      attachments?: Array<{
        type?: string;
        payload?: { url?: string; title?: string; story_media_id?: string };
      }>;
    };
    postback?: {
      mid?: string;
      title?: string;
      payload?: string;
    };
  }>;
}

export interface WebhookPayload {
  object: string;
  entry: WebhookEntry[];
}

async function resolveWebhookVerifyToken(): Promise<string | null> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'WEBHOOK_VERIFY_TOKEN' },
    });

    if (config?.value) {
      return config.encrypted ? decrypt(config.value) : config.value;
    }
  } catch (error) {
    console.warn('Webhook verify token DB lookup failed, falling back to env');
  }

  return process.env.WEBHOOK_VERIFY_TOKEN || null;
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
    const storedToken = await resolveWebhookVerifyToken();

    if (storedToken && timingSafeEqualString(token, storedToken)) {
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

/** Returns Meta App Secret for HMAC verification of webhook POSTs. */
export async function getWebhookAppSecret(): Promise<string | null> {
  const config = await getMetaConfig();
  return config?.appSecret || process.env.META_APP_SECRET || null;
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
  console.log('Webhook received', {
    object: payload.object,
    entries: (payload.entry || []).map((entry) => ({
      id: entry.id,
      changes: entry.changes?.map((change) => change.field),
      messaging: entry.messaging?.length || 0,
    })),
  });

  if (payload.object !== 'instagram' && payload.object !== 'page') {
    return;
  }

  for (const entry of payload.entry) {
    if (entry.changes) {
      for (const change of entry.changes) {
        if (change.field === 'comments') {
          await handleCommentEvent(change.value, 'comment', entry.id);
        } else if (change.field === 'live_comments') {
          await handleCommentEvent(change.value, 'live_comment', entry.id);
        } else if (change.field === 'mentions') {
          await handleMentionEvent(change.value, entry.id);
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

async function handleCommentEvent(
  value: any,
  triggerType: 'comment' | 'live_comment',
  entryIgUserId?: string
): Promise<void> {
  const comment = value;
  const igUserId = comment.from?.id;
  const commentId = comment.id;
  const commentText = comment.text;

  if (!igUserId || !commentId || !commentText) {
    console.warn('Comment event missing fields', {
      hasFrom: Boolean(igUserId),
      hasId: Boolean(commentId),
      hasText: Boolean(commentText),
    });
    return;
  }

  // Meta puts the IG business account on entry.id; media.owner.id is often absent.
  const ownerCandidates = [
    entryIgUserId,
    value.media?.owner?.id,
    value.owner?.id,
  ].filter((id): id is string => typeof id === 'string' && id.length > 0);

  const igAccount = ownerCandidates.length
    ? await prisma.instagramAccount.findFirst({
        where: {
          igUserId: { in: ownerCandidates },
          isActive: true,
        },
      })
    : null;

  if (!igAccount) {
    console.warn('Comment event: IG account not found', {
      ownerCandidates,
      mediaId: value.media?.id || value.media_id,
      commentId,
    });
    return;
  }

  // Evita loop: resposta pública / comentário da própria conta re-dispara o webhook
  if (igUserId === igAccount.igUserId) {
    console.log('Comment event: ignoring own-account comment', { commentId, igUserId });
    return;
  }

  await prisma.webhookEvent.create({
    data: {
      userId: igAccount.userId,
      igAccountId: igAccount.id,
      eventType: triggerType,
      payload: JSON.stringify(value),
      processed: false,
    },
  });

  const mediaId = comment.media?.id || value.media?.id || value.media_id;
  const matchedAutomations = await findMatchingAutomations(
    igAccount.id,
    { text: commentText, mediaId },
    triggerType
  );

  if (matchedAutomations.length === 0) {
    console.log('Comment event: no matching automation', {
      igAccountId: igAccount.id,
      mediaId,
      text: commentText,
      triggerType,
    });
  }

  for (const automationId of matchedAutomations) {
    await queueOrExecuteAutomation(automationId, {
      commentId,
      commentText,
      userId: igUserId,
      username: comment.from?.username,
      source: triggerType,
    });
  }

  const existing = await prisma.contact.findFirst({
    where: { igAccountId: igAccount.id, igUserId },
  });

  if (!existing) {
    await prisma.contact.create({
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
      where: { id: existing.id },
      data: { lastSeenAt: new Date() },
    });
  }
}

async function handleMentionEvent(value: any, entryIgUserId?: string): Promise<void> {
  // Story mention / @mention payloads vary; try common shapes.
  const igUserId =
    value.from?.id || value.sender?.id || value.user?.id || value.mentioner?.id;
  const mediaOwnerId =
    value.media?.owner?.id || value.owner?.id || value.recipient?.id;
  const mentionText =
    value.text || value.comment?.text || value.message || 'story_mention';

  if (!igUserId) {
    console.log('Mention event missing user id:', value);
    return;
  }

  const ownerCandidates = [
    entryIgUserId,
    mediaOwnerId,
    value.instagram_id,
    value.id,
  ].filter((id): id is string => typeof id === 'string' && id.length > 0);

  const igAccount = ownerCandidates.length
    ? await prisma.instagramAccount.findFirst({
        where: {
          igUserId: { in: ownerCandidates },
          isActive: true,
        },
      })
    : null;

  if (!igAccount) {
    console.log('Mention event: no IG account matched', value);
    return;
  }

  await prisma.webhookEvent.create({
    data: {
      userId: igAccount.userId,
      igAccountId: igAccount.id,
      eventType: 'story_mention',
      payload: JSON.stringify(value),
      processed: true,
    },
  });

  const matched = await findMatchingAutomations(
    igAccount.id,
    { text: String(mentionText) },
    'story_mention'
  );

  for (const automationId of matched) {
    await queueOrExecuteAutomation(automationId, {
      userId: igUserId,
      username: value.from?.username,
      messageText: String(mentionText),
      source: 'story_mention',
    });
  }
}

async function handleMessagingEvent(message: any): Promise<void> {
  if (message.message?.is_echo) return;

  const senderId = message.sender?.id;
  const recipientId = message.recipient?.id;
  const postbackPayload =
    message.postback?.payload || message.message?.quick_reply?.payload || null;
  const messageText = message.message?.text || message.postback?.title || '';
  const messageId =
    message.message?.mid || message.postback?.mid || `pb_${message.timestamp}`;
  const isStoryReply = Boolean(message.message?.reply_to?.story);

  if (!senderId || !recipientId) {
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
      eventType: postbackPayload ? 'postback' : isStoryReply ? 'story_reply' : 'message',
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
  } else {
    await prisma.contact.update({
      where: { id: contact.id },
      data: { lastSeenAt: new Date() },
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

  if (messageText || postbackPayload) {
    try {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          igMessageId: messageId,
          fromIgUserId: senderId,
          toIgUserId: recipientId,
          messageType: postbackPayload ? 'postback' : 'text',
          text: messageText || postbackPayload || '',
          isFromPage: false,
          sentAt: new Date(message.timestamp),
        },
      });
    } catch {
      // duplicate mid — ignore
    }
  }

  if (postbackPayload) {
    const follow = parseFollowGatePayload(postbackPayload);
    if (follow) {
      const automation = await prisma.automation.findFirst({
        where: {
          id: follow.automationId,
          igAccountId: igAccount.id,
          isActive: true,
        },
      });
      if (!automation) return;

      const queue = createQueue(QUEUE_NAMES.AUTOMATION);
      const jobData = {
        type: 'follow_gate_postback',
        automationId: follow.automationId,
        senderId,
        kind: follow.kind,
      };
      if (queue) {
        await queue.add('follow-gate-postback', jobData);
      } else {
        await executeFollowGatePostback({
          automationId: follow.automationId,
          senderId,
          kind: follow.kind,
        });
      }
      return;
    }

    const button = parseButtonPayload(postbackPayload);
    if (button) {
      const queue = createQueue(QUEUE_NAMES.AUTOMATION);
      const jobData = {
        type: 'button_postback',
        automationId: button.automationId,
        senderId,
        index: button.index,
      };
      if (queue) {
        await queue.add('button-postback', jobData);
      } else {
        await executeButtonPostback({
          automationId: button.automationId,
          senderId,
          index: button.index,
        });
      }
      return;
    }

    const ice = parseIcePayload(postbackPayload);
    if (ice) {
      await queueOrExecuteAutomation(ice.automationId, {
        userId: senderId,
        messageText: messageText || postbackPayload,
        source: 'icebreaker',
      });
      return;
    }

    return;
  }

  if (!messageText) return;

  const handledPending = await handlePendingInputReply({
    igAccountId: igAccount.id,
    userId: igAccount.userId,
    senderId,
    text: messageText,
  });
  if (handledPending) return;

  if (isStoryReply) {
    const matched = await findMatchingAutomations(
      igAccount.id,
      { text: messageText },
      'story_reply'
    );
    for (const automationId of matched) {
      await queueOrExecuteAutomation(automationId, {
        userId: senderId,
        messageText,
        source: 'story_reply',
      });
    }
    if (matched.length > 0) return;
  }

  const match = await findMatchingDmAutomation(igAccount.id, messageText);
  if (!match) return;

  await queueOrExecuteAutomation(match.automationId, {
    userId: senderId,
    messageText,
    source: match.kind,
  });
}
