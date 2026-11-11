import { prisma } from '@/lib/db/client';
import { createInstagramClient, type InstagramClient } from '@/lib/instagram/client';
import { decrypt } from '@/lib/crypto/encryption';
import {
  BUTTON_PREFIX,
  buttonPayload,
  evaluateKeywordMatch,
  followCheckPayload,
  followRecheckPayload,
  type ActionConfig,
  type ActionsConfigEnvelope,
  type KeywordTriggerConfig,
  type TriggerConfigEnvelope,
  type TriggerKind,
} from './types';

export type {
  ActionConfig,
  KeywordTriggerConfig as CommentTriggerConfig,
  TriggerKind,
} from './types';

export {
  FOLLOW_CHECK_PREFIX,
  FOLLOW_RECHECK_PREFIX,
  buttonPayload,
  followCheckPayload,
  followRecheckPayload,
  parseButtonPayload,
  parseFollowGatePayload,
  parseIcePayload,
  icePayload,
  iceBreakersConfigKey,
} from './types';

export type AutomationContext = {
  commentId?: string;
  commentText?: string;
  messageText?: string;
  userId?: string;
  username?: string;
  source?: TriggerKind | 'postback' | 'icebreaker';
};

type ContactState = {
  tags: string[];
  customData: Record<string, unknown>;
};

function parseActions(raw: string): ActionConfig[] {
  const parsed = JSON.parse(raw) as ActionsConfigEnvelope | ActionConfig[];
  if (Array.isArray(parsed)) return parsed;
  return parsed.actions || [];
}

function parseTrigger(raw: string): KeywordTriggerConfig {
  const parsed = JSON.parse(raw) as TriggerConfigEnvelope | KeywordTriggerConfig;
  if ('trigger' in parsed && parsed.trigger) return parsed.trigger;
  return parsed as KeywordTriggerConfig;
}

async function logDm(params: {
  userId: string;
  igAccountId: string;
  text: string;
  messageType?: string;
  contactId?: string;
}) {
  await prisma.dmLog.create({
    data: {
      userId: params.userId,
      igAccountId: params.igAccountId,
      contactId: params.contactId || null,
      status: 'sent',
      messageType: params.messageType || 'text',
      payload: JSON.stringify({ text: params.text }),
      sentAt: new Date(),
    },
  });
}

async function recordOutboundInbox(params: {
  userId: string;
  igAccountId: string;
  contactId: string;
  businessIgUserId: string;
  recipientIgUserId: string;
  text: string;
  messageType: string;
  dedupeKey: string;
}) {
  const igThreadId = `${params.businessIgUserId}_${params.recipientIgUserId}`;
  const conversation = await prisma.conversation.upsert({
    where: { igThreadId },
    create: {
      userId: params.userId,
      igAccountId: params.igAccountId,
      contactId: params.contactId,
      igThreadId,
      lastMessageAt: new Date(),
      unreadCount: 0,
      status: 'open',
    },
    update: {
      lastMessageAt: new Date(),
    },
  });

  try {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        igMessageId: params.dedupeKey,
        fromIgUserId: params.businessIgUserId,
        toIgUserId: params.recipientIgUserId,
        messageType: params.messageType,
        text: params.text,
        isFromPage: true,
        sentAt: new Date(),
      },
    });
  } catch {
    // duplicate outbound mid — ignore
  }
}

function readContactState(contact: { tags: string | null; customData: string | null }): ContactState {
  let tags: string[] = [];
  let customData: Record<string, unknown> = {};
  try {
    tags = contact.tags ? JSON.parse(contact.tags) : [];
  } catch {
    tags = [];
  }
  try {
    customData = contact.customData ? JSON.parse(contact.customData) : {};
  } catch {
    customData = {};
  }
  return { tags: Array.isArray(tags) ? tags : [], customData };
}

async function getOrCreateContact(params: {
  userId: string;
  igAccountId: string;
  igUserId: string;
  igUsername?: string;
  client?: InstagramClient;
}) {
  const existing = await prisma.contact.findFirst({
    where: { igAccountId: params.igAccountId, igUserId: params.igUserId },
  });

  let profilePic = existing?.profilePic || undefined;
  let fullName = existing?.fullName || undefined;
  if ((!profilePic || !fullName) && params.client) {
    const profile = await params.client.getScopedUserProfile(params.igUserId);
    if (profile?.profilePic) profilePic = profile.profilePic;
    if (profile?.name) fullName = profile.name;
  }

  if (existing) {
    return prisma.contact.update({
      where: { id: existing.id },
      data: {
        lastSeenAt: new Date(),
        ...(params.igUsername ? { igUsername: params.igUsername } : {}),
        ...(profilePic && profilePic !== existing.profilePic ? { profilePic } : {}),
        ...(fullName && fullName !== existing.fullName ? { fullName } : {}),
      },
    });
  }
  return prisma.contact.create({
    data: {
      userId: params.userId,
      igAccountId: params.igAccountId,
      igUserId: params.igUserId,
      igUsername: params.igUsername || params.igUserId,
      profilePic: profilePic || null,
      fullName: fullName || null,
      lastSeenAt: new Date(),
    },
  });
}

async function saveContactState(
  contactId: string,
  state: ContactState
) {
  await prisma.contact.update({
    where: { id: contactId },
    data: {
      tags: JSON.stringify(state.tags),
      customData: JSON.stringify(state.customData),
      lastSeenAt: new Date(),
    },
  });
}

export async function evaluateCommentTrigger(
  comment: { text: string },
  config: KeywordTriggerConfig
): Promise<boolean> {
  return evaluateKeywordMatch(comment.text, config);
}

async function sendOutboundDm(params: {
  client: InstagramClient;
  context: AutomationContext;
  text: string;
  buttons?: ActionConfig['buttons'];
  quickReplies?: ActionConfig['quickReplies'];
  automationId: string;
}) {
  const { client, context, text, buttons, quickReplies, automationId } = params;

  if (buttons && buttons.length > 0) {
    const mapped = buttons.slice(0, 3).map((button, index) => ({
      title: button.title,
      payload: buttonPayload(automationId, index),
    }));
    if (context.commentId && context.source !== 'dm_keyword' && context.source !== 'default_reply') {
      await client.sendPrivateReplyWithButtons(context.commentId, text, mapped);
    } else if (context.userId) {
      await client.sendMessageWithButtons(context.userId, text, mapped);
    }
    return;
  }

  if (quickReplies && quickReplies.length > 0 && context.userId) {
    await client.sendMessageWithQuickReplies(
      context.userId,
      text,
      quickReplies.slice(0, 13).map((item, index) => ({
        title: item.title,
        payload: buttonPayload(automationId, index),
      }))
    );
    return;
  }

  if (context.commentId && (context.source === 'comment' || context.source === 'live_comment')) {
    await client.sendPrivateReply(context.commentId, text);
  } else if (context.userId) {
    await client.sendMessage(context.userId, text);
  }
}

async function evaluateCondition(
  action: ActionConfig,
  params: {
    client: InstagramClient;
    context: AutomationContext;
    state: ContactState;
  }
): Promise<boolean> {
  const { client, context, state } = params;
  switch (action.rule) {
    case 'has_tag':
      return Boolean(action.tag && state.tags.includes(action.tag));
    case 'field_equals': {
      if (!action.field) return false;
      const current = state.customData[action.field];
      return String(current ?? '') === String(action.value ?? '');
    }
    case 'follows': {
      if (!context.userId) return false;
      const follows = await client.isUserFollowBusiness(context.userId);
      return follows === true;
    }
    default:
      return false;
  }
}

function actionKey(action: ActionConfig, index: number) {
  return `${index}:${action.type}`;
}

async function loadCompletedActions(automationId: string, triggeredBy: string | null) {
  const done = new Set<string>();
  if (!triggeredBy) return done;
  const priors = await prisma.automationExecution.findMany({
    where: { automationId, triggeredBy },
    orderBy: { createdAt: 'desc' },
    take: 8,
    select: { metadata: true },
  });
  for (const prior of priors) {
    try {
      const meta = JSON.parse(prior.metadata || '{}') as { completedActions?: string[] };
      for (const key of meta.completedActions || []) done.add(key);
    } catch {
      // ignore
    }
  }
  return done;
}

async function persistCompletedAction(
  executionId: string,
  completedActions: Set<string>,
  key: string
) {
  completedActions.add(key);
  const execution = await prisma.automationExecution.findUnique({
    where: { id: executionId },
    select: { metadata: true },
  });
  let meta: Record<string, unknown> = {};
  try {
    meta = execution?.metadata ? JSON.parse(execution.metadata) : {};
  } catch {
    meta = {};
  }
  meta.completedActions = Array.from(completedActions);
  await prisma.automationExecution.update({
    where: { id: executionId },
    data: { metadata: JSON.stringify(meta) },
  });
}

async function runActions(params: {
  actions: ActionConfig[];
  automation: {
    id: string;
    userId: string;
    igAccountId: string;
    businessIgUserId: string;
  };
  client: InstagramClient;
  context: AutomationContext;
  contactId: string;
  state: ContactState;
  executionId?: string;
  completedActions?: Set<string>;
}): Promise<'ok' | 'waiting_input'> {
  const { actions, automation, client, context } = params;
  let { state } = params;
  const completedActions = params.completedActions || new Set<string>();

  const trackOutbound = async (text: string, messageType: string, suffix: string) => {
    await logDm({
      userId: automation.userId,
      igAccountId: automation.igAccountId,
      contactId: params.contactId || undefined,
      text,
      messageType,
    });
    if (params.contactId && context.userId) {
      await recordOutboundInbox({
        userId: automation.userId,
        igAccountId: automation.igAccountId,
        contactId: params.contactId,
        businessIgUserId: automation.businessIgUserId,
        recipientIgUserId: context.userId,
        text,
        messageType,
        dedupeKey: `out:${automation.id}:${context.commentId || context.userId}:${suffix}`,
      });
    }
  };

  const markDone = async (key: string) => {
    if (!params.executionId) {
      completedActions.add(key);
      return;
    }
    await persistCompletedAction(params.executionId, completedActions, key);
  };

  for (let index = 0; index < actions.length; index++) {
    const action = actions[index];
    const key = actionKey(action, index);
    if (completedActions.has(key)) {
      continue;
    }

    switch (action.type) {
      case 'delay': {
        const seconds = Math.max(0, action.delay || 0);
        if (seconds > 0) {
          await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
        }
        await markDone(key);
        break;
      }

      case 'reply_comment':
        if (context.commentId && action.text) {
          await client.replyToComment(context.commentId, action.text);
        }
        await markDone(key);
        break;

      case 'send_dm':
        if (action.delay && action.delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, action.delay! * 1000));
        }
        if (action.text && (context.userId || context.commentId)) {
          try {
            await sendOutboundDm({
              client,
              context,
              text: action.text,
              buttons: action.buttons,
              quickReplies: action.quickReplies,
              automationId: automation.id,
            });
          } catch (error) {
            console.error('send_dm/private_reply failed', {
              automationId: automation.id,
              commentId: context.commentId,
              userId: context.userId,
              error: error instanceof Error ? error.message : error,
              details: error instanceof Error ? (error as { details?: unknown }).details : undefined,
            });
            throw error;
          }
          await trackOutbound(
            action.text,
            action.buttons?.length ? 'buttons' : 'text',
            `dm:${action.text.slice(0, 24)}`
          );
        }
        await markDone(key);
        break;

      case 'add_tag':
        if (action.tag && !state.tags.includes(action.tag)) {
          state.tags.push(action.tag);
          await saveContactState(params.contactId, state);
        }
        await markDone(key);
        break;

      case 'follow_gate':
        if (context.commentId && action.prompt) {
          await client.sendPrivateReplyWithButtons(context.commentId, action.prompt, [
            {
              title: action.buttonLabel || 'Já sigo',
              payload: followCheckPayload(automation.id),
            },
          ]);
          await trackOutbound(action.prompt, 'follow_gate', 'follow_gate');
        }
        await markDone(key);
        break;

      case 'condition': {
        const passed = await evaluateCondition(action, { client, context, state });
        const branch = passed ? action.then || [] : action.else || [];
        const result = await runActions({
          ...params,
          actions: branch,
          state,
          completedActions,
        });
        state = params.state;
        await markDone(key);
        if (result === 'waiting_input') return 'waiting_input';
        break;
      }

      case 'ask_input': {
        if (!context.userId || !action.prompt || !action.saveKey) break;
        await client.sendMessage(context.userId, action.prompt);
        await trackOutbound(action.prompt, 'ask_input', `ask:${action.saveKey}`);
        state.customData._pendingInput = {
          automationId: automation.id,
          saveKey: action.saveKey,
          fieldType: action.fieldType || 'text',
          expiresAt: Date.now() + 1000 * 60 * 60 * 24,
        };
        await saveContactState(params.contactId, state);
        await markDone(key);
        return 'waiting_input';
      }
    }
  }

  return 'ok';
}

export async function executeAutomation(
  automationId: string,
  context: AutomationContext
): Promise<void> {
  const automation = await prisma.automation.findUnique({
    where: { id: automationId },
    include: { igAccount: true },
  });

  if (!automation || !automation.isActive) {
    throw new Error('Automation not found or inactive');
  }

  const triggeredBy = context.commentId || context.userId || null;
  if (context.commentId) {
    const duplicate = await prisma.automationExecution.findFirst({
      where: {
        automationId: automation.id,
        triggeredBy: context.commentId,
        status: { in: ['processing', 'completed'] },
      },
      select: { id: true, status: true },
    });
    if (duplicate) {
      console.log('Skipping duplicate automation execution', {
        automationId,
        commentId: context.commentId,
        existingStatus: duplicate.status,
      });
      return;
    }
  }

  if (!automation.igAccount.igUserId) {
    throw new Error('Conta Instagram sem igUserId — reconecte a conta');
  }

  const completedActions = await loadCompletedActions(automation.id, triggeredBy);

  const execution = await prisma.automationExecution.create({
    data: {
      automationId: automation.id,
      triggeredBy,
      status: 'processing',
      metadata: JSON.stringify({
        ...context,
        completedActions: Array.from(completedActions),
      }),
    },
  });

  try {
    const actions = parseActions(automation.actionsConfig);
    const accessToken = decrypt(automation.igAccount.accessToken);
    const client = createInstagramClient(accessToken, automation.igAccount.igUserId);

    let contactId = '';
    let state: ContactState = { tags: [], customData: {} };
    if (context.userId) {
      const contact = await getOrCreateContact({
        userId: automation.userId,
        igAccountId: automation.igAccountId,
        igUserId: context.userId,
        igUsername: context.username,
        client,
      });
      contactId = contact.id;
      state = readContactState(contact);
    }

    await runActions({
      actions,
      automation: {
        id: automation.id,
        userId: automation.userId,
        igAccountId: automation.igAccountId,
        businessIgUserId: automation.igAccount.igUserId,
      },
      client,
      context: {
        ...context,
        source: context.source || (automation.triggerType as TriggerKind),
      },
      contactId,
      state,
      executionId: execution.id,
      completedActions,
    });

    await prisma.automationExecution.update({
      where: { id: execution.id },
      data: { status: 'completed' },
    });
  } catch (error) {
    await prisma.automationExecution.update({
      where: { id: execution.id },
      data: {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    throw error;
  }
}

export async function executeFollowGatePostback(params: {
  automationId: string;
  senderId: string;
  kind: 'check' | 'recheck';
}): Promise<void> {
  const automation = await prisma.automation.findUnique({
    where: { id: params.automationId },
    include: { igAccount: true },
  });

  if (!automation || !automation.isActive) return;

  const actions = parseActions(automation.actionsConfig);
  const gate = actions.find((action) => action.type === 'follow_gate');
  if (!gate) return;

  const execution = await prisma.automationExecution.create({
    data: {
      automationId: automation.id,
      triggeredBy: params.senderId,
      status: 'processing',
      metadata: JSON.stringify({
        type: 'follow_gate_postback',
        kind: params.kind,
        senderId: params.senderId,
      }),
    },
  });

  try {
    const accessToken = decrypt(automation.igAccount.accessToken);
    const client = createInstagramClient(accessToken, automation.igAccount.igUserId);
    const follows = await client.isUserFollowBusiness(params.senderId);

    if (follows === true) {
      const reward = gate.rewardText || '';
      if (reward) {
        await client.sendMessage(params.senderId, reward);
        await logDm({
          userId: automation.userId,
          igAccountId: automation.igAccountId,
          text: reward,
          messageType: 'follow_gate_reward',
        });
      }
    } else {
      const ask =
        gate.notFollowingText ||
        'Me segue e toca em Verificar de novo pra eu liberar o conteúdo.';
      await client.sendMessageWithButtons(params.senderId, ask, [
        {
          title: gate.recheckButtonLabel || 'Verificar de novo',
          payload: followRecheckPayload(automation.id),
        },
      ]);
      await logDm({
        userId: automation.userId,
        igAccountId: automation.igAccountId,
        text: ask,
        messageType: 'follow_gate_ask',
      });
    }

    await prisma.automationExecution.update({
      where: { id: execution.id },
      data: { status: 'completed' },
    });
  } catch (error) {
    await prisma.automationExecution.update({
      where: { id: execution.id },
      data: {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    throw error;
  }
}

export async function executeButtonPostback(params: {
  automationId: string;
  senderId: string;
  index: number;
}): Promise<void> {
  const automation = await prisma.automation.findUnique({
    where: { id: params.automationId },
    include: { igAccount: true },
  });
  if (!automation || !automation.isActive) return;

  const actions = parseActions(automation.actionsConfig);
  const withButtons = actions.find(
    (action) =>
      (action.type === 'send_dm' && (action.buttons?.length || action.quickReplies?.length)) ||
      false
  );
  const button =
    withButtons?.buttons?.[params.index] || withButtons?.quickReplies?.[params.index];
  if (!button) return;

  const accessToken = decrypt(automation.igAccount.accessToken);
  const client = createInstagramClient(accessToken, automation.igAccount.igUserId);
  const contact = await getOrCreateContact({
    userId: automation.userId,
    igAccountId: automation.igAccountId,
    igUserId: params.senderId,
    client,
  });
  const state = readContactState(contact);

  if (button.requireFollow) {
    const follows = await client.isUserFollowBusiness(params.senderId);
    if (follows !== true) {
      const ask =
        button.notFollowingText ||
        'Me segue e toca em Verificar de novo pra eu liberar.';
      await client.sendMessageWithButtons(params.senderId, ask, [
        {
          title: 'Verificar de novo',
          payload: buttonPayload(automation.id, params.index),
        },
      ]);
      await logDm({
        userId: automation.userId,
        igAccountId: automation.igAccountId,
        text: ask,
        messageType: 'button_follow_ask',
      });
      return;
    }
  }

  if (button.addTag && !state.tags.includes(button.addTag)) {
    state.tags.push(button.addTag);
    await saveContactState(contact.id, state);
  }

  if (button.responseText) {
    await client.sendMessage(params.senderId, button.responseText);
    await logDm({
      userId: automation.userId,
      igAccountId: automation.igAccountId,
      text: button.responseText,
      messageType: 'button_response',
    });
  }
}

export async function handlePendingInputReply(params: {
  igAccountId: string;
  userId: string;
  senderId: string;
  text: string;
}): Promise<boolean> {
  const contact = await prisma.contact.findFirst({
    where: { igAccountId: params.igAccountId, igUserId: params.senderId },
  });
  if (!contact) return false;

  const state = readContactState(contact);
  const pending = state.customData._pendingInput as
    | { automationId: string; saveKey: string; fieldType?: string; expiresAt?: number }
    | undefined;

  if (!pending?.saveKey || !pending.automationId) return false;
  if (pending.expiresAt && pending.expiresAt < Date.now()) {
    delete state.customData._pendingInput;
    await saveContactState(contact.id, state);
    return false;
  }

  const value = params.text.trim();
  const account = await prisma.instagramAccount.findUniqueOrThrow({
    where: { id: params.igAccountId },
  });

  if (pending.fieldType === 'email' && !value.includes('@')) {
    const client = createInstagramClient(decrypt(account.accessToken), account.igUserId);
    await client.sendMessage(params.senderId, 'Envie um e-mail válido, por favor.');
    return true;
  }

  state.customData[pending.saveKey] = value;
  delete state.customData._pendingInput;
  await saveContactState(contact.id, state);

  const client = createInstagramClient(decrypt(account.accessToken), account.igUserId);
  await client.sendMessage(params.senderId, 'Recebido, obrigado!');
  return true;
}

export async function findMatchingAutomations(
  igAccountId: string,
  comment: { text: string; mediaId?: string },
  triggerType: TriggerKind = 'comment'
): Promise<string[]> {
  const automations = await prisma.automation.findMany({
    where: {
      igAccountId,
      isActive: true,
      triggerType,
    },
    orderBy: { priority: 'desc' },
  });

  const matched: string[] = [];

  for (const automation of automations) {
    try {
      const trigger = parseTrigger(automation.triggerConfig);

      if (triggerType === 'comment' || triggerType === 'live_comment') {
        const scope = trigger.mediaScope || (trigger.mediaIds?.length ? 'specific' : 'any');
        if (scope === 'specific') {
          const allowed = trigger.mediaIds || [];
          if (!comment.mediaId || !allowed.includes(comment.mediaId)) {
            continue;
          }
        }
      }

      if (evaluateKeywordMatch(comment.text, trigger)) {
        matched.push(automation.id);
      }
    } catch (error) {
      console.error(`Error evaluating automation ${automation.id}:`, error);
    }
  }

  return matched;
}

export async function findMatchingDmAutomation(
  igAccountId: string,
  text: string
): Promise<{ automationId: string; kind: 'dm_keyword' | 'default_reply' } | null> {
  const keywordMatches = await findMatchingAutomations(
    igAccountId,
    { text },
    'dm_keyword'
  );
  if (keywordMatches[0]) {
    return { automationId: keywordMatches[0], kind: 'dm_keyword' };
  }

  const defaults = await prisma.automation.findMany({
    where: {
      igAccountId,
      isActive: true,
      triggerType: 'default_reply',
    },
    orderBy: { priority: 'desc' },
    take: 1,
  });

  if (defaults[0]) {
    return { automationId: defaults[0].id, kind: 'default_reply' };
  }

  return null;
}

export async function queueOrExecuteAutomation(
  automationId: string,
  context: AutomationContext
) {
  const { createQueue, QUEUE_NAMES } = await import('@/lib/queue/client');
  const queue = createQueue(QUEUE_NAMES.AUTOMATION);
  if (queue) {
    // BullMQ: custom jobId cannot contain ":"
    const jobId = context.commentId
      ? `auto_${automationId}_c_${context.commentId}`
      : undefined;

    if (jobId) {
      const existing = await queue.getJob(jobId);
      if (existing) {
        const state = await existing.getState();
        if (state === 'completed') return;
        if (state === 'failed' || state === 'waiting' || state === 'delayed') {
          // Re-enfileira recovery: remove job morto/travado e sobe de novo
          if (state === 'failed') {
            await existing.remove();
          } else {
            return;
          }
        }
        if (state === 'active') return;
      }
    }

    await queue.add(
      'execute-automation',
      { automationId, context },
      jobId
        ? {
            jobId,
            attempts: 3,
          }
        : undefined
    );
  } else {
    await executeAutomation(automationId, context);
  }
}

/** Reprocessa execuções de comentário que falharam e ainda não têm completed. */
export async function recoverFailedCommentAutomations(limit = 30): Promise<{
  scanned: number;
  queued: number;
}> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const failed = await prisma.automationExecution.findMany({
    where: {
      status: 'failed',
      createdAt: { gte: since },
      triggeredBy: { not: null },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
      id: true,
      automationId: true,
      triggeredBy: true,
      metadata: true,
    },
  });

  let queued = 0;
  for (const exec of failed) {
    if (!exec.triggeredBy) continue;
    const done = await prisma.automationExecution.findFirst({
      where: {
        automationId: exec.automationId,
        triggeredBy: exec.triggeredBy,
        status: 'completed',
      },
      select: { id: true },
    });
    if (done) continue;

    let meta: AutomationContext = {};
    try {
      meta = JSON.parse(exec.metadata || '{}') as AutomationContext;
    } catch {
      meta = {};
    }

    await queueOrExecuteAutomation(exec.automationId, {
      commentId: meta.commentId || exec.triggeredBy,
      commentText: meta.commentText,
      userId: meta.userId,
      username: meta.username,
      source: meta.source,
    });
    queued += 1;
  }

  return { scanned: failed.length, queued };
}

/** @deprecated alias kept for older imports */
export const BUTTON_PAYLOAD_PREFIX = BUTTON_PREFIX;
