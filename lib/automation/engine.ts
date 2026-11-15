import { prisma } from '@/lib/db/client';
import { createInstagramClient, type InstagramClient } from '@/lib/instagram/client';
import { decrypt } from '@/lib/crypto/encryption';
import {
  BUTTON_PREFIX,
  buttonPayload,
  DEFAULT_FOLLOW_RECHECK_LABEL,
  evaluateKeywordMatch,
  followCheckPayload,
  followRecheckPayload,
  buildTemplateVars,
  interpolateTemplate,
  pickActionText,
  pickButtonText,
  pickFollowNudgeMessage,
  type ActionConfig,
  type ActionsConfigEnvelope,
  type KeywordTriggerConfig,
  type TriggerConfigEnvelope,
  type TriggerKind,
  type VariantPickMode,
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
  /** Re-enter after ask_input; skips duplicate-execution guard. */
  resume?: boolean;
};

type ContactState = {
  tags: string[];
  customData: Record<string, unknown>;
};

function variantSeqKey(automationId: string, slot: string) {
  return `_variantSeq:${automationId}:${slot}`;
}

function readVariantSequence(state: ContactState, automationId: string, slot: string) {
  const value = Number(state.customData[variantSeqKey(automationId, slot)] || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

async function persistVariantSequence(
  contactId: string,
  state: ContactState,
  automationId: string,
  slot: string,
  nextSequence: number | undefined
) {
  if (nextSequence == null || !contactId) return;
  state.customData[variantSeqKey(automationId, slot)] = nextSequence;
  await saveContactState(contactId, state);
}

function resolveCopy(
  action: ActionConfig,
  vars: Record<string, string>,
  options?: {
    pool?: 'text' | 'prompt' | 'notFollowing' | 'reward';
    sequence?: number;
  }
) {
  const picked = pickActionText(action, options);
  return {
    text: interpolateTemplate(picked.text, vars),
    nextSequence: picked.nextSequence,
  };
}

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
  automationId?: string;
  automationName?: string;
  buttons?: Array<{ title: string; type?: 'postback' | 'web_url' | 'quick_reply'; url?: string }>;
  attachments?: string | null;
  isNote?: boolean;
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
        attachments: params.attachments || null,
        automationId: params.automationId || null,
        automationName: params.automationName || null,
        buttonsJson: params.buttons?.length ? JSON.stringify(params.buttons) : null,
        isNote: Boolean(params.isNote),
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
  automationId?: string;
  automationName?: string;
}) {
  const existing = await prisma.contact.findFirst({
    where: { igAccountId: params.igAccountId, igUserId: params.igUserId },
  });

  let profilePic = existing?.profilePic || undefined;
  let fullName = existing?.fullName || undefined;
  let profileUsername = params.igUsername || undefined;
  const usernameLooksLikeId =
    !existing?.igUsername || /^\d{5,}$/.test(existing.igUsername);
  if ((!profilePic || !fullName || usernameLooksLikeId) && params.client) {
    const profile = await params.client.getScopedUserProfile(params.igUserId);
    if (profile?.profilePic) profilePic = profile.profilePic;
    if (profile?.name) fullName = profile.name;
    if (profile?.username) profileUsername = profile.username;
  }

  const automationPatch =
    params.automationId || params.automationName
      ? {
          lastAutomationId: params.automationId || null,
          lastAutomationName: params.automationName || null,
          ...(!existing?.sourceAutomationName
            ? {
                sourceAutomationId: params.automationId || null,
                sourceAutomationName: params.automationName || null,
              }
            : {}),
        }
      : {};

  if (existing) {
    return prisma.contact.update({
      where: { id: existing.id },
      data: {
        lastSeenAt: new Date(),
        ...(profileUsername &&
        (profileUsername !== existing.igUsername || usernameLooksLikeId)
          ? { igUsername: profileUsername }
          : {}),
        ...(profilePic && profilePic !== existing.profilePic ? { profilePic } : {}),
        ...(fullName && fullName !== existing.fullName ? { fullName } : {}),
        ...automationPatch,
      },
    });
  }
  return prisma.contact.create({
    data: {
      userId: params.userId,
      igAccountId: params.igAccountId,
      igUserId: params.igUserId,
      igUsername: profileUsername || params.igUserId,
      profilePic: profilePic || null,
      fullName: fullName || null,
      lastSeenAt: new Date(),
      sourceAutomationId: params.automationId || null,
      sourceAutomationName: params.automationName || null,
      lastAutomationId: params.automationId || null,
      lastAutomationName: params.automationName || null,
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

async function sendActionMedia(params: {
  client: InstagramClient;
  recipientId: string;
  automationId: string;
  imageUrl?: string;
  imageAttachmentId?: string;
  audioUrl?: string;
  audioAttachmentId?: string;
}) {
  const {
    client,
    recipientId,
    automationId,
    imageUrl,
    imageAttachmentId,
    audioUrl,
    audioAttachmentId,
  } = params;

  if (imageAttachmentId || imageUrl) {
    try {
      if (imageAttachmentId) {
        await client.sendMediaAttachment(recipientId, 'image', imageAttachmentId);
      } else if (imageUrl) {
        await client.sendMediaByUrl(recipientId, 'image', imageUrl);
      }
    } catch (error) {
      console.error('send media image failed', {
        automationId,
        imageUrl,
        imageAttachmentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  if (audioAttachmentId || audioUrl) {
    try {
      if (audioAttachmentId) {
        await client.sendMediaAttachment(recipientId, 'audio', audioAttachmentId);
      } else if (audioUrl) {
        await client.sendMediaByUrl(recipientId, 'audio', audioUrl);
      }
    } catch (error) {
      console.error('send media audio failed', {
        automationId,
        audioUrl,
        audioAttachmentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }
}

function canUsePrivateReply(context: AutomationContext): boolean {
  if (!context.commentId) return false;
  const source = context.source;
  return (
    source !== 'dm_keyword' &&
    source !== 'default_reply' &&
    source !== 'story_reply' &&
    source !== 'story_mention'
  );
}

/** Meta #10 / outside messaging window — not worth retrying. */
export function isPermanentMessagingError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  const code =
    error && typeof error === 'object' && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';
  return (
    code === '10' ||
    /fora da janela permitida/i.test(message) ||
    /outside (of )?the allowed window/i.test(message) ||
    /this message is sent outside/i.test(message) ||
    /message.*outside.*window/i.test(message)
  );
}

async function sendOutboundDm(params: {
  client: InstagramClient;
  context: AutomationContext;
  text: string;
  buttons?: ActionConfig['buttons'];
  quickReplies?: ActionConfig['quickReplies'];
  automationId: string;
  imageUrl?: string;
  imageAttachmentId?: string;
  audioUrl?: string;
  audioAttachmentId?: string;
}) {
  const {
    client,
    context,
    text,
    buttons,
    quickReplies,
    automationId,
    imageUrl,
    imageAttachmentId,
    audioUrl,
    audioAttachmentId,
  } = params;

  const hasMedia = Boolean(imageUrl || imageAttachmentId || audioUrl || audioAttachmentId);
  const privateReply = canUsePrivateReply(context);

  // Comment → DM must open via private reply first. Messaging API (media/user id)
  // fails with (#10) outside the 24h window and used to run BEFORE private reply.
  if (privateReply) {
    if (buttons && buttons.length > 0) {
      const mapped = buttons.slice(0, 3).map((button, index) => {
        const url = button.url?.trim();
        if (url) {
          return { title: button.title, url };
        }
        return {
          title: button.title,
          payload: buttonPayload(automationId, index),
        };
      });
      await client.sendPrivateReplyWithButtons(context.commentId!, text || ' ', mapped);
    } else if (text.trim()) {
      await client.sendPrivateReply(context.commentId!, text);
    }

    if (hasMedia && context.userId) {
      try {
        await sendActionMedia({
          client,
          recipientId: context.userId,
          automationId,
          imageUrl,
          imageAttachmentId,
          audioUrl,
          audioAttachmentId,
        });
      } catch (error) {
        // Private reply already delivered; media needs an open messaging window.
        console.warn('send_dm media skipped after private reply', {
          automationId,
          commentId: context.commentId,
          error: error instanceof Error ? error.message : error,
        });
      }
    }
    return;
  }

  if (hasMedia && context.userId) {
    await sendActionMedia({
      client,
      recipientId: context.userId,
      automationId,
      imageUrl,
      imageAttachmentId,
      audioUrl,
      audioAttachmentId,
    });
  }

  if (!text.trim() && !buttons?.length && !quickReplies?.length) {
    return;
  }

  if (buttons && buttons.length > 0) {
    const mapped = buttons.slice(0, 3).map((button, index) => {
      const url = button.url?.trim();
      if (url) {
        return { title: button.title, url };
      }
      return {
        title: button.title,
        payload: buttonPayload(automationId, index),
      };
    });
    if (context.userId) {
      await client.sendMessageWithButtons(context.userId, text || ' ', mapped);
    }
    return;
  }

  if (quickReplies && quickReplies.length > 0 && context.userId) {
    await client.sendMessageWithQuickReplies(
      context.userId,
      text || ' ',
      quickReplies.slice(0, 13).map((item, index) => ({
        title: item.title,
        payload: buttonPayload(automationId, index),
      }))
    );
    return;
  }

  if (!text.trim()) return;

  if (context.userId) {
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
    name: string;
    userId: string;
    igAccountId: string;
    businessIgUserId: string;
  };
  client: InstagramClient;
  context: AutomationContext;
  contactId: string;
  state: ContactState;
  templateVars: Record<string, string>;
  executionId?: string;
  completedActions?: Set<string>;
}): Promise<'ok' | 'waiting_input' | 'stopped' | 'delayed'> {
  const { actions, automation, client, context, templateVars } = params;
  let { state } = params;
  const completedActions = params.completedActions || new Set<string>();
  const liveVars = () => ({
    ...templateVars,
    ...buildTemplateVars({
      fullName: templateVars.nome || templateVars.name,
      igUsername: templateVars.username,
      commentText: context.commentText,
      messageText: context.messageText,
      customData: state.customData,
    }),
  });

  const trackOutbound = async (
    text: string,
    messageType: string,
    suffix: string,
    buttons?: Array<{ title: string; type?: 'postback' | 'web_url' | 'quick_reply' }>
  ) => {
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
        dedupeKey: `out:${automation.id}:${context.commentId || context.userId}:${suffix}:${Date.now()}`,
        automationId: automation.id,
        automationName: automation.name,
        buttons,
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
        if (seconds > 0 && params.executionId) {
          const { scheduleAutomationResume, shouldScheduleDurableDelay } = await import(
            '@/lib/automation/delay'
          );
          if (shouldScheduleDurableDelay(seconds)) {
            const scheduled = await scheduleAutomationResume({
              automationId: automation.id,
              context,
              executionId: params.executionId,
              actionIndex: index,
              seconds,
            });
            if (scheduled === 'queued') {
              await markDone(key);
              return 'delayed';
            }
          }
          await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
        } else if (seconds > 0) {
          await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
        }
        await markDone(key);
        break;
      }

      case 'reply_comment': {
        const picked = resolveCopy(action, liveVars(), {
          sequence: readVariantSequence(state, automation.id, key),
        });
        if (context.commentId && picked.text) {
          await client.replyToComment(context.commentId, picked.text);
          await persistVariantSequence(
            params.contactId,
            state,
            automation.id,
            key,
            picked.nextSequence
          );
        }
        await markDone(key);
        break;
      }

      case 'send_dm': {
        if (action.delay && action.delay > 0 && params.executionId) {
          const seconds = Math.max(0, action.delay);
          const { scheduleAutomationResume, shouldScheduleDurableDelay } = await import(
            '@/lib/automation/delay'
          );
          const delayKey = `${key}:predelay`;
          if (shouldScheduleDurableDelay(seconds) && !completedActions.has(delayKey)) {
            await persistCompletedAction(params.executionId, completedActions, delayKey);
            const scheduled = await scheduleAutomationResume({
              automationId: automation.id,
              context,
              executionId: params.executionId,
              actionIndex: index,
              seconds,
            });
            if (scheduled === 'queued') {
              return 'delayed';
            }
            // Sem Redis: remove marker e cai no sleep inline
            completedActions.delete(delayKey);
          }
          if (!completedActions.has(delayKey)) {
            await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
          }
        } else if (action.delay && action.delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, action.delay! * 1000));
        }
        const picked = resolveCopy(action, liveVars(), {
          sequence: readVariantSequence(state, automation.id, key),
        });
        const imageUrl = action.imageUrl?.trim() || '';
        const imageAttachmentId = action.imageAttachmentId?.trim() || '';
        const audioUrl = action.audioUrl?.trim() || '';
        const audioAttachmentId = action.audioAttachmentId?.trim() || '';
        const hasMedia = Boolean(
          imageUrl || imageAttachmentId || audioUrl || audioAttachmentId
        );
        if (
          (picked.text || hasMedia || action.buttons?.length || action.quickReplies?.length) &&
          (context.userId || context.commentId)
        ) {
          try {
            await sendOutboundDm({
              client,
              context,
              text: picked.text,
              buttons: action.buttons,
              quickReplies: action.quickReplies,
              automationId: automation.id,
              imageUrl: imageUrl || undefined,
              imageAttachmentId: imageAttachmentId || undefined,
              audioUrl: audioUrl || undefined,
              audioAttachmentId: audioAttachmentId || undefined,
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
          await persistVariantSequence(
            params.contactId,
            state,
            automation.id,
            key,
            picked.nextSequence
          );
          const mediaLabel = audioUrl || audioAttachmentId
            ? '[áudio]'
            : imageUrl || imageAttachmentId
              ? '[imagem]'
              : '';
          await trackOutbound(
            picked.text || mediaLabel,
            action.buttons?.length
              ? 'buttons'
              : action.quickReplies?.length
                ? 'quick_replies'
                : mediaLabel && !picked.text
                  ? audioUrl || audioAttachmentId
                    ? 'audio'
                    : 'image'
                  : 'text',
            `dm:${(picked.text || mediaLabel).slice(0, 24)}`,
            action.buttons?.map((b) => ({
              title: b.title,
              type: (b.url?.trim() ? 'web_url' : 'postback') as 'postback' | 'web_url',
            })) ||
              action.quickReplies?.map((b) => ({
                title: b.title,
                type: 'quick_reply' as const,
              }))
          );
          const { bumpAutomationStat } = await import('@/lib/automation/stats');
          await bumpAutomationStat(automation.id, 'dms');
        }
        await markDone(key);
        break;
      }

      case 'add_tag':
        if (action.tag && !state.tags.includes(action.tag)) {
          state.tags.push(action.tag);
          await saveContactState(params.contactId, state);
          const { bumpAutomationStat } = await import('@/lib/automation/stats');
          await bumpAutomationStat(automation.id, 'tags');
        }
        await markDone(key);
        break;

      case 'follow_gate': {
        const prompt = resolveCopy(action, liveVars(), {
          pool: 'prompt',
          sequence: readVariantSequence(state, automation.id, `${key}:prompt`),
        });
        if (prompt.text && (context.commentId || context.userId)) {
          const gateButton = {
            title: action.buttonLabel || 'Já sigo',
            payload: followCheckPayload(automation.id),
          };
          if (
            context.commentId &&
            context.source !== 'dm_keyword' &&
            context.source !== 'default_reply' &&
            context.source !== 'story_reply' &&
            context.source !== 'story_mention'
          ) {
            await client.sendPrivateReplyWithButtons(context.commentId, prompt.text, [
              gateButton,
            ]);
          } else if (context.userId) {
            await client.sendMessageWithButtons(context.userId, prompt.text, [gateButton]);
          }
          await persistVariantSequence(
            params.contactId,
            state,
            automation.id,
            `${key}:prompt`,
            prompt.nextSequence
          );
          await trackOutbound(prompt.text, 'follow_gate', 'follow_gate', [
            { title: gateButton.title, type: 'postback' },
          ]);
        }
        await markDone(key);
        break;
      }

      case 'human_handoff': {
        const note =
          interpolateTemplate(action.text || '', liveVars()) ||
          'Um atendente vai te responder em breve.';
        if (context.userId && note) {
          await client.sendMessage(context.userId, note);
          await trackOutbound(note, 'human_handoff', 'handoff');
        }
        if (params.contactId) {
          state.customData._automationPausedUntil = 'until_closed';
          state.customData._handoffAt = new Date().toISOString();
          state.customData._handoffAutomationId = automation.id;
          await saveContactState(params.contactId, state);
          await prisma.contact.update({
            where: { id: params.contactId },
            data: { automationPaused: true },
          });
        }
        await markDone(key);
        return 'stopped';
      }

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
        if (result === 'stopped') return 'stopped';
        if (result === 'delayed') return 'delayed';
        break;
      }

      case 'ask_input': {
        if (!context.userId || !action.prompt || !action.saveKey) break;
        const askPrompt = interpolateTemplate(action.prompt, liveVars());
        await client.sendMessage(context.userId, askPrompt);
        await trackOutbound(askPrompt, 'ask_input', `ask:${action.saveKey}`);
        state.customData._pendingInput = {
          automationId: automation.id,
          saveKey: action.saveKey,
          fieldType: action.fieldType || 'text',
          expiresAt: Date.now() + 1000 * 60 * 60 * 24,
          context: {
            commentId: context.commentId,
            commentText: context.commentText,
            messageText: context.messageText,
            userId: context.userId,
            username: context.username,
            source: context.source,
          },
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
  if (context.commentId && !context.resume) {
    const duplicate = await prisma.automationExecution.findFirst({
      where: {
        automationId: automation.id,
        triggeredBy: context.commentId,
        status: { in: ['processing', 'completed', 'delayed', 'waiting_input'] },
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

    const permanentFail = await prisma.automationExecution.findFirst({
      where: {
        automationId: automation.id,
        triggeredBy: context.commentId,
        status: 'failed',
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, error: true },
    });
    if (permanentFail && isPermanentMessagingError(permanentFail.error)) {
      await prisma.webhookEvent.updateMany({
        where: {
          externalId: `comment_${context.commentId}`,
          processed: false,
        },
        data: {
          processed: true,
          error: permanentFail.error,
        },
      });
      console.log('Skipping permanently failed automation execution', {
        automationId,
        commentId: context.commentId,
        error: permanentFail.error,
      });
      return;
    }
  }

  if (context.resume && triggeredBy) {
    await prisma.automationExecution.updateMany({
      where: {
        automationId: automation.id,
        triggeredBy,
        status: 'delayed',
      },
      data: { status: 'completed' },
    });
  }

  if (!automation.igAccount.igUserId) {
    throw new Error('Conta Instagram sem igUserId — reconecte a conta');
  }

  const completedActions = await loadCompletedActions(automation.id, triggeredBy);

  // Disparo = 1 por comentário/remetente, não por retry de recovery/BullMQ.
  if (!context.resume && triggeredBy) {
    const prior = await prisma.automationExecution.findFirst({
      where: { automationId: automation.id, triggeredBy },
      select: { id: true },
    });
    if (!prior) {
      const { bumpAutomationStat } = await import('@/lib/automation/stats');
      await bumpAutomationStat(automation.id, 'triggers');
    }
  } else if (!context.resume && !triggeredBy) {
    const { bumpAutomationStat } = await import('@/lib/automation/stats');
    await bumpAutomationStat(automation.id, 'triggers');
  }

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
    let facebookPageId = automation.igAccount.facebookPageId;
    if (!facebookPageId && !accessToken.startsWith('IG')) {
      const { resolveFacebookPageMessaging } = await import('@/lib/instagram/client');
      const resolved = await resolveFacebookPageMessaging({
        accessToken,
        igUserId: automation.igAccount.igUserId,
      });
      if (resolved.pageId) {
        facebookPageId = resolved.pageId;
        await prisma.instagramAccount
          .update({
            where: { id: automation.igAccount.id },
            data: { facebookPageId: resolved.pageId },
          })
          .catch(() => {});
      }
    }
    const client = createInstagramClient(
      accessToken,
      automation.igAccount.igUserId,
      facebookPageId
    );

    let contactId = '';
    let state: ContactState = { tags: [], customData: {} };
    let contactFullName: string | null = null;
    let contactUsername: string | null = context.username || null;
    let automationPaused = false;
    if (context.userId) {
      const contact = await getOrCreateContact({
        userId: automation.userId,
        igAccountId: automation.igAccountId,
        igUserId: context.userId,
        igUsername: context.username,
        client,
        automationId: automation.id,
        automationName: automation.name,
      });
      contactId = contact.id;
      state = readContactState(contact);
      contactFullName = contact.fullName;
      contactUsername = contact.igUsername || context.username || null;
      const { isAutomationTemporarilyPaused, clearInboxAutomationSuspend } = await import(
        '@/lib/inbox/settings'
      );
      if (contact.automationPaused && !isAutomationTemporarilyPaused(contact)) {
        await clearInboxAutomationSuspend(contact.id);
        automationPaused = false;
      } else {
        automationPaused = isAutomationTemporarilyPaused(contact);
      }
    }

    if (automationPaused) {
      await prisma.automationExecution.update({
        where: { id: execution.id },
        data: {
          status: 'completed',
          metadata: JSON.stringify({
            ...context,
            skipped: 'automation_paused',
            completedActions: Array.from(completedActions),
          }),
        },
      });
      return;
    }

    const templateVars = buildTemplateVars({
      fullName: contactFullName,
      igUsername: contactUsername,
      commentText: context.commentText,
      messageText: context.messageText,
      customData: state.customData,
    });

    const runResult = await runActions({
      actions,
      automation: {
        id: automation.id,
        name: automation.name,
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
      templateVars,
      executionId: execution.id,
      completedActions,
    });

    if (runResult === 'delayed') {
      // status already set to delayed by scheduleAutomationResume
      return;
    }

    await prisma.automationExecution.update({
      where: { id: execution.id },
      data: {
        status: runResult === 'waiting_input' ? 'waiting_input' : 'completed',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await prisma.automationExecution.update({
      where: { id: execution.id },
      data: {
        status: 'failed',
        error: message,
      },
    });

    // Stop recovery/BullMQ from infinitely retrying Meta messaging-window errors.
    if (isPermanentMessagingError(error) && context.commentId) {
      await prisma.webhookEvent.updateMany({
        where: {
          externalId: `comment_${context.commentId}`,
          processed: false,
        },
        data: {
          processed: true,
          error: message,
        },
      });
      console.error('automation permanently failed (messaging window)', {
        automationId,
        commentId: context.commentId,
        error: message,
      });
      return;
    }

    throw error;
  }
}

async function applyHandoffPause(contactId: string, state: ContactState, automationId: string) {
  state.customData._automationPausedUntil = 'until_closed';
  state.customData._handoffAt = new Date().toISOString();
  state.customData._handoffAutomationId = automationId;
  await saveContactState(contactId, state);
  await prisma.contact.update({
    where: { id: contactId },
    data: { automationPaused: true },
  });
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
    const client = createInstagramClient(
      accessToken,
      automation.igAccount.igUserId,
      automation.igAccount.facebookPageId
    );
    const contact = await getOrCreateContact({
      userId: automation.userId,
      igAccountId: automation.igAccountId,
      igUserId: params.senderId,
      client,
      automationId: automation.id,
      automationName: automation.name,
    });

    const { isAutomationTemporarilyPaused, clearInboxAutomationSuspend } = await import(
      '@/lib/inbox/settings'
    );
    if (contact.automationPaused && !isAutomationTemporarilyPaused(contact)) {
      await clearInboxAutomationSuspend(contact.id);
    } else if (isAutomationTemporarilyPaused(contact)) {
      await prisma.automationExecution.update({
        where: { id: execution.id },
        data: {
          status: 'completed',
          metadata: JSON.stringify({
            type: 'follow_gate_postback',
            kind: params.kind,
            skipped: 'automation_paused',
          }),
        },
      });
      return;
    }

    const state = readContactState(contact);
    const follows = await client.isUserFollowBusiness(params.senderId);
    const businessIgUserId = automation.igAccount.igUserId!;
    const vars = buildTemplateVars({
      fullName: contact.fullName,
      igUsername: contact.igUsername,
      customData: state.customData,
    });
    const pickMode: VariantPickMode =
      gate.textPickMode === 'sequential' ? 'sequential' : 'random';

    if (follows === null) {
      const unsure =
        'Não consegui verificar se você segue agora. Toca de novo em alguns segundos.';
      const recheckLabel =
        !gate.recheckButtonLabel || gate.recheckButtonLabel === 'Verificar de novo'
          ? DEFAULT_FOLLOW_RECHECK_LABEL
          : gate.recheckButtonLabel;
      await client.sendMessageWithButtons(params.senderId, unsure, [
        {
          title: recheckLabel.slice(0, 20),
          payload: followRecheckPayload(automation.id),
        },
      ]);
      await logDm({
        userId: automation.userId,
        igAccountId: automation.igAccountId,
        contactId: contact.id,
        text: unsure,
        messageType: 'follow_gate_unknown',
      });
      await recordOutboundInbox({
        userId: automation.userId,
        igAccountId: automation.igAccountId,
        contactId: contact.id,
        businessIgUserId,
        recipientIgUserId: params.senderId,
        text: unsure,
        messageType: 'follow_gate_unknown',
        dedupeKey: `out:${automation.id}:${params.senderId}:follow-null:${Date.now()}`,
        automationId: automation.id,
        automationName: automation.name,
        buttons: [{ title: recheckLabel.slice(0, 20), type: 'postback' }],
      });
    } else if (follows === true) {
      const nudgeKey = `_followNudge:${automation.id}`;
      if (nudgeKey in state.customData) {
        delete state.customData[nudgeKey];
        await saveContactState(contact.id, state);
      }
      const rewardSlot = `follow_gate:${automation.id}:reward`;
      const reward = resolveCopy(
        { ...gate, textPickMode: pickMode },
        vars,
        {
          pool: 'reward',
          sequence: readVariantSequence(state, automation.id, rewardSlot),
        }
      );
      if (reward.text || gate.imageUrl || gate.imageAttachmentId || gate.audioUrl || gate.audioAttachmentId) {
        await sendActionMedia({
          client,
          recipientId: params.senderId,
          automationId: automation.id,
          imageUrl: gate.imageUrl?.trim() || undefined,
          imageAttachmentId: gate.imageAttachmentId?.trim() || undefined,
          audioUrl: gate.audioUrl?.trim() || undefined,
          audioAttachmentId: gate.audioAttachmentId?.trim() || undefined,
        });
        if (reward.text) {
          await client.sendMessage(params.senderId, reward.text);
        }
        await persistVariantSequence(
          contact.id,
          state,
          automation.id,
          rewardSlot,
          reward.nextSequence
        );
        const rewardLabel =
          reward.text ||
          (gate.audioUrl || gate.audioAttachmentId
            ? '[áudio]'
            : gate.imageUrl || gate.imageAttachmentId
              ? '[imagem]'
              : '');
        await logDm({
          userId: automation.userId,
          igAccountId: automation.igAccountId,
          contactId: contact.id,
          text: rewardLabel,
          messageType: 'follow_gate_reward',
        });
        await recordOutboundInbox({
          userId: automation.userId,
          igAccountId: automation.igAccountId,
          contactId: contact.id,
          businessIgUserId,
          recipientIgUserId: params.senderId,
          text: rewardLabel,
          messageType: 'follow_gate_reward',
          dedupeKey: `out:${automation.id}:${params.senderId}:reward:${Date.now()}`,
          automationId: automation.id,
          automationName: automation.name,
        });
      }
    } else {
      const nudgeKey = `_followNudge:${automation.id}`;
      const attempt = Number(state.customData[nudgeKey] || 0);
      const notFollowingPool = resolveCopy(
        { ...gate, textPickMode: pickMode },
        vars,
        {
          pool: 'notFollowing',
          sequence: attempt,
        }
      );
      const ask =
        notFollowingPool.text ||
        interpolateTemplate(pickFollowNudgeMessage(attempt, gate.notFollowingText), vars);
      state.customData[nudgeKey] = attempt + 1;
      await saveContactState(contact.id, state);

      const recheckLabel =
        !gate.recheckButtonLabel || gate.recheckButtonLabel === 'Verificar de novo'
          ? DEFAULT_FOLLOW_RECHECK_LABEL
          : gate.recheckButtonLabel;

      await client.sendMessageWithButtons(params.senderId, ask, [
        {
          title: recheckLabel.slice(0, 20),
          payload: followRecheckPayload(automation.id),
        },
      ]);
      await logDm({
        userId: automation.userId,
        igAccountId: automation.igAccountId,
        contactId: contact.id,
        text: ask,
        messageType: 'follow_gate_ask',
      });
      await recordOutboundInbox({
        userId: automation.userId,
        igAccountId: automation.igAccountId,
        contactId: contact.id,
        businessIgUserId,
        recipientIgUserId: params.senderId,
        text: ask,
        messageType: 'follow_gate_ask',
        dedupeKey: `out:${automation.id}:${params.senderId}:ask:${Date.now()}`,
        automationId: automation.id,
        automationName: automation.name,
        buttons: [{ title: recheckLabel.slice(0, 20), type: 'postback' }],
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

function collectActionsDeep(actions: ActionConfig[]): ActionConfig[] {
  const out: ActionConfig[] = [];
  for (const action of actions) {
    out.push(action);
    if (action.then?.length) out.push(...collectActionsDeep(action.then));
    if (action.else?.length) out.push(...collectActionsDeep(action.else));
  }
  return out;
}

function findButtonByIndex(
  actions: ActionConfig[],
  index: number
): { button: NonNullable<ActionConfig['buttons']>[number]; parent: ActionConfig } | null {
  for (const action of collectActionsDeep(actions)) {
    if (action.type !== 'send_dm') continue;
    const fromButtons = action.buttons?.[index];
    if (fromButtons) {
      if (fromButtons.url?.trim()) return null;
      return { button: fromButtons, parent: action };
    }
    const fromQr = action.quickReplies?.[index];
    if (fromQr) return { button: fromQr, parent: action };
  }
  return null;
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
  const found = findButtonByIndex(actions, params.index);
  if (!found) return;
  const { button, parent: withButtons } = found;

  const accessToken = decrypt(automation.igAccount.accessToken);
  const client = createInstagramClient(
    accessToken,
    automation.igAccount.igUserId,
    automation.igAccount.facebookPageId
  );
  const contact = await getOrCreateContact({
    userId: automation.userId,
    igAccountId: automation.igAccountId,
    igUserId: params.senderId,
    client,
    automationId: automation.id,
    automationName: automation.name,
  });

  {
    const { isAutomationTemporarilyPaused, clearInboxAutomationSuspend } = await import(
      '@/lib/inbox/settings'
    );
    if (contact.automationPaused && !isAutomationTemporarilyPaused(contact)) {
      await clearInboxAutomationSuspend(contact.id);
    } else if (isAutomationTemporarilyPaused(contact)) {
      return;
    }
  }

  const state = readContactState(contact);
  const businessIgUserId = automation.igAccount.igUserId!;
  const vars = buildTemplateVars({
    fullName: contact.fullName,
    igUsername: contact.igUsername,
    customData: state.customData,
  });
  const pickMode: VariantPickMode =
    withButtons?.textPickMode === 'sequential' ? 'sequential' : 'random';

  if (button.requireFollow) {
    const follows = await client.isUserFollowBusiness(params.senderId);
    if (follows === null) {
      const unsure =
        'Não consegui verificar se você segue agora. Toca de novo em alguns segundos.';
      await client.sendMessageWithButtons(params.senderId, unsure, [
        {
          title: DEFAULT_FOLLOW_RECHECK_LABEL,
          payload: buttonPayload(automation.id, params.index),
        },
      ]);
      await logDm({
        userId: automation.userId,
        igAccountId: automation.igAccountId,
        contactId: contact.id,
        text: unsure,
        messageType: 'button_follow_unknown',
      });
      await recordOutboundInbox({
        userId: automation.userId,
        igAccountId: automation.igAccountId,
        contactId: contact.id,
        businessIgUserId,
        recipientIgUserId: params.senderId,
        text: unsure,
        messageType: 'button_follow_unknown',
        dedupeKey: `out:${automation.id}:${params.senderId}:btn-null:${params.index}:${Date.now()}`,
        automationId: automation.id,
        automationName: automation.name,
        buttons: [{ title: DEFAULT_FOLLOW_RECHECK_LABEL, type: 'postback' }],
      });
      return;
    }
    if (follows === false) {
      const nudgeKey = `_followNudgeBtn:${automation.id}:${params.index}`;
      const attempt = Number(state.customData[nudgeKey] || 0);
      const picked = pickButtonText(button, 'notFollowing', pickMode, attempt);
      const ask =
        interpolateTemplate(picked.text, vars) ||
        interpolateTemplate(pickFollowNudgeMessage(attempt, button.notFollowingText), vars);
      state.customData[nudgeKey] = attempt + 1;
      await saveContactState(contact.id, state);

      await client.sendMessageWithButtons(params.senderId, ask, [
        {
          title: DEFAULT_FOLLOW_RECHECK_LABEL,
          payload: buttonPayload(automation.id, params.index),
        },
      ]);
      await logDm({
        userId: automation.userId,
        igAccountId: automation.igAccountId,
        contactId: contact.id,
        text: ask,
        messageType: 'button_follow_ask',
      });
      await recordOutboundInbox({
        userId: automation.userId,
        igAccountId: automation.igAccountId,
        contactId: contact.id,
        businessIgUserId,
        recipientIgUserId: params.senderId,
        text: ask,
        messageType: 'button_follow_ask',
        dedupeKey: `out:${automation.id}:${params.senderId}:btnask:${params.index}:${Date.now()}`,
        automationId: automation.id,
        automationName: automation.name,
        buttons: [{ title: DEFAULT_FOLLOW_RECHECK_LABEL, type: 'postback' }],
      });
      return;
    }

    const nudgeKey = `_followNudgeBtn:${automation.id}:${params.index}`;
    if (nudgeKey in state.customData) {
      delete state.customData[nudgeKey];
      await saveContactState(contact.id, state);
    }
  }

  const { bumpAutomationStat } = await import('@/lib/automation/stats');
  await bumpAutomationStat(automation.id, 'taps');

  if (button.addTag && !state.tags.includes(button.addTag)) {
    state.tags.push(button.addTag);
    await saveContactState(contact.id, state);
    await bumpAutomationStat(automation.id, 'tags');
  }

  const responseSlot = `btn:${automation.id}:${params.index}:response`;
  const response = pickButtonText(
    button,
    'response',
    pickMode,
    readVariantSequence(state, automation.id, responseSlot)
  );
  let responseText = interpolateTemplate(response.text, vars);
  if (button.handoff && !responseText) {
    responseText = 'Um atendente vai te responder em breve.';
  }
  if (responseText) {
    await client.sendMessage(params.senderId, responseText);
    await persistVariantSequence(
      contact.id,
      state,
      automation.id,
      responseSlot,
      response.nextSequence
    );
    await logDm({
      userId: automation.userId,
      igAccountId: automation.igAccountId,
      contactId: contact.id,
      text: responseText,
      messageType: button.handoff ? 'human_handoff' : 'button_response',
    });
    await recordOutboundInbox({
      userId: automation.userId,
      igAccountId: automation.igAccountId,
      contactId: contact.id,
      businessIgUserId,
      recipientIgUserId: params.senderId,
      text: responseText,
      messageType: button.handoff ? 'human_handoff' : 'button_response',
      dedupeKey: `out:${automation.id}:${params.senderId}:btn:${params.index}:${Date.now()}`,
      automationId: automation.id,
      automationName: automation.name,
    });
  }

  if (button.handoff) {
    await applyHandoffPause(contact.id, state, automation.id);
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
    | {
        automationId: string;
        saveKey: string;
        fieldType?: string;
        expiresAt?: number;
        context?: AutomationContext;
      }
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
    const client = createInstagramClient(
      decrypt(account.accessToken),
      account.igUserId,
      account.facebookPageId
    );
    await client.sendMessage(params.senderId, 'Envie um e-mail válido, por favor.');
    return true;
  }

  state.customData[pending.saveKey] = value;
  delete state.customData._pendingInput;
  await saveContactState(contact.id, state);

  const resumeContext: AutomationContext = {
    ...(pending.context || {}),
    userId: params.senderId,
    messageText: value,
    resume: true,
  };

  try {
    await executeAutomation(pending.automationId, resumeContext);
  } catch (error) {
    console.error('resume after ask_input failed', {
      automationId: pending.automationId,
      error: error instanceof Error ? error.message : error,
    });
    const client = createInstagramClient(
      decrypt(account.accessToken),
      account.igUserId,
      account.facebookPageId
    );
    await client.sendMessage(params.senderId, 'Recebido, obrigado!');
  }
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
    take: 200,
    select: {
      id: true,
      automationId: true,
      triggeredBy: true,
      metadata: true,
      error: true,
    },
  });

  // Uma tentativa por par automação+comentário por pass (evita flood do recovery)
  const seen = new Set<string>();
  let queued = 0;
  for (const exec of failed) {
    if (!exec.triggeredBy) continue;
    if (isPermanentMessagingError(exec.error)) continue;
    const key = `${exec.automationId}_${exec.triggeredBy}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (queued >= limit) break;

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

  return { scanned: seen.size, queued };
}

/** @deprecated alias kept for older imports */
export const BUTTON_PAYLOAD_PREFIX = BUTTON_PREFIX;
