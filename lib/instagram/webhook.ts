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

function commentExternalId(triggerType: string, commentId: string) {
  return `${triggerType}_${commentId}`;
}

async function upsertCommentWebhookEvent(params: {
  externalId: string;
  userId?: string | null;
  igAccountId?: string | null;
  eventType: string;
  payload: unknown;
}) {
  return prisma.webhookEvent.upsert({
    where: { externalId: params.externalId },
    create: {
      externalId: params.externalId,
      userId: params.userId || null,
      igAccountId: params.igAccountId || null,
      eventType: params.eventType,
      payload: JSON.stringify(params.payload),
      processed: false,
      attempts: 0,
    },
    update: {
      userId: params.userId || undefined,
      igAccountId: params.igAccountId || undefined,
      payload: JSON.stringify(params.payload),
      // keep processed as-is; recovery/handler manages it
    },
  });
}

async function markWebhookProcessed(eventId: string, error?: string | null) {
  await prisma.webhookEvent.update({
    where: { id: eventId },
    data: error
      ? {
          processed: false,
          error,
          attempts: { increment: 1 },
        }
      : {
          processed: true,
          processedAt: new Date(),
          error: null,
          attempts: { increment: 1 },
        },
  });
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

  const externalId = commentExternalId(triggerType, commentId);

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
    const orphan = await upsertCommentWebhookEvent({
      externalId,
      eventType: triggerType,
      payload: { ...value, entryIgUserId },
    });
    await markWebhookProcessed(orphan.id, 'IG account not found');
    return;
  }

  // Evita loop: resposta pública / comentário da própria conta re-dispara o webhook
  if (igUserId === igAccount.igUserId) {
    console.log('Comment event: ignoring own-account comment', { commentId, igUserId });
    const own = await upsertCommentWebhookEvent({
      externalId,
      userId: igAccount.userId,
      igAccountId: igAccount.id,
      eventType: triggerType,
      payload: { ...value, entryIgUserId: igAccount.igUserId },
    });
    await markWebhookProcessed(own.id);
    return;
  }

  const event = await upsertCommentWebhookEvent({
    externalId,
    userId: igAccount.userId,
    igAccountId: igAccount.id,
    eventType: triggerType,
    payload: { ...value, entryIgUserId: igAccount.igUserId },
  });

  if (event.processed) {
    console.log('Comment event already processed', { commentId, externalId });
    return;
  }

  try {
    // Contacts are created only when an automation runs (engine.getOrCreateContact).
    // Organic comments must not pollute the Contatos list.
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
      await markWebhookProcessed(event.id);
      return;
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

    // Só marca processado quando todas as automações casadas concluíram.
    // Se a fila ainda está rodando / falhou, fica pending p/ recovery.
    const pendingAutomations: string[] = [];
    for (const automationId of matchedAutomations) {
      const done = await prisma.automationExecution.findFirst({
        where: {
          automationId,
          triggeredBy: commentId,
          status: 'completed',
        },
        select: { id: true },
      });
      if (!done) pendingAutomations.push(automationId);
    }

    if (pendingAutomations.length === 0) {
      await markWebhookProcessed(event.id);
    } else {
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: {
          processed: false,
          error: `pending_automations:${pendingAutomations.length}`,
          attempts: { increment: 1 },
        },
      });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await markWebhookProcessed(event.id, message);
    throw error;
  }
}

/**
 * Reprocessa comentários persistidos que ainda não foram concluídos
 * (queda, falha de fila, token temporário, etc.) — janela de 7 dias.
 */
export async function recoverPendingCommentEvents(limit = 30): Promise<{
  scanned: number;
  recovered: number;
  failed: number;
}> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const pending = await prisma.webhookEvent.findMany({
    where: {
      processed: false,
      eventType: { in: ['comment', 'live_comment'] },
      createdAt: { gte: since },
      attempts: { lt: 20 },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  });

  let recovered = 0;
  let failed = 0;

  for (const event of pending) {
    try {
      const value = JSON.parse(event.payload);
      const triggerType = (event.eventType === 'live_comment' ? 'live_comment' : 'comment') as
        | 'comment'
        | 'live_comment';
      const entryIgUserId =
        (typeof value.entryIgUserId === 'string' && value.entryIgUserId) ||
        (event.igAccountId
          ? (
              await prisma.instagramAccount.findUnique({
                where: { id: event.igAccountId },
                select: { igUserId: true },
              })
            )?.igUserId
          : undefined);

      // Force reprocess: clear processed flag path by ensuring not processed
      await prisma.webhookEvent.update({
        where: { id: event.id },
        data: { processed: false, error: null },
      });

      await handleCommentEvent(value, triggerType, entryIgUserId);
      const refreshed = await prisma.webhookEvent.findUnique({ where: { id: event.id } });
      if (refreshed?.processed) recovered += 1;
      else failed += 1;
    } catch (error) {
      failed += 1;
      console.error('recoverPendingCommentEvents failed', {
        eventId: event.id,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  return { scanned: pending.length, recovered, failed };
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

  const existingConversation = await prisma.conversation.findUnique({
    where: { igThreadId: `${recipientId}_${senderId}` },
    select: { id: true, status: true },
  });

  const { getInboxSettings } = await import('@/lib/inbox/settings');
  const inboxSettings = await getInboxSettings(igAccount.userId);
  const manualStart = inboxSettings.conversationStartMode === 'manual';

  let shouldOpen = !manualStart;
  if (existingConversation?.status === 'open') {
    shouldOpen = true;
  } else if (existingConversation?.status === 'closed' && !manualStart) {
    const humanAgentReply = await prisma.message.findFirst({
      where: {
        conversationId: existingConversation.id,
        isFromPage: true,
        isNote: false,
        automationId: null,
        NOT: { messageType: 'system' },
      },
      select: { id: true },
    });
    // Closed automated threads stay closed until opened manually.
    shouldOpen = Boolean(humanAgentReply);
  } else if (!existingConversation && manualStart) {
    shouldOpen = false;
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
      unreadCount: shouldOpen ? 1 : 0,
      status: shouldOpen ? 'open' : 'closed',
    },
    update: {
      lastMessageAt: new Date(message.timestamp),
      ...(shouldOpen
        ? {
            unreadCount: { increment: 1 },
            status: 'open',
          }
        : {}),
    },
  });

  if (existingConversation?.status === 'closed' && shouldOpen) {
    const { appendInboxSystemEvent, statusMoveText } = await import('@/lib/inbox/events');
    await appendInboxSystemEvent({
      conversationId: conversation.id,
      businessIgUserId: recipientId,
      contactIgUserId: senderId,
      kind: 'status_reopened',
      text: `${statusMoveText('closed', 'open')} (nova mensagem)`,
      meta: { from: 'closed', to: 'open', reason: 'inbound_message' },
    });
  }

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
