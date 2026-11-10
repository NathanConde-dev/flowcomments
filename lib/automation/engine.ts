import { prisma } from '@/lib/db/client';
import { createInstagramClient } from '@/lib/instagram/client';
import { decrypt } from '@/lib/crypto/encryption';

export interface CommentTriggerConfig {
  keywords: string[];
  matchType: 'exact' | 'contains' | 'starts_with' | 'ends_with';
  caseSensitive: boolean;
  /** When set, only comments on these media IDs match. Empty/undefined = any post. */
  mediaIds?: string[];
  mediaScope?: 'specific' | 'any';
}

export interface ActionConfig {
  type: 'reply_comment' | 'send_dm' | 'add_tag';
  text?: string;
  tag?: string;
  delay?: number;
}

export interface AutomationConfig {
  trigger: CommentTriggerConfig;
  conditions?: any;
  actions: ActionConfig[];
}

export async function evaluateCommentTrigger(
  comment: { text: string },
  config: CommentTriggerConfig
): Promise<boolean> {
  const text = config.caseSensitive ? comment.text : comment.text.toLowerCase();
  const keywords = config.caseSensitive ? config.keywords : config.keywords.map(k => k.toLowerCase());

  switch (config.matchType) {
    case 'exact':
      return keywords.some(keyword => text === keyword);
    case 'contains':
      return keywords.some(keyword => text.includes(keyword));
    case 'starts_with':
      return keywords.some(keyword => text.startsWith(keyword));
    case 'ends_with':
      return keywords.some(keyword => text.endsWith(keyword));
    default:
      return false;
  }
}

export async function executeAutomation(
  automationId: string,
  context: {
    commentId?: string;
    commentText?: string;
    userId?: string;
    username?: string;
  }
): Promise<void> {
  const automation = await prisma.automation.findUnique({
    where: { id: automationId },
    include: { igAccount: true },
  });

  if (!automation || !automation.isActive) {
    throw new Error('Automation not found or inactive');
  }

  const executionId = await prisma.automationExecution.create({
    data: {
      automationId: automation.id,
      triggeredBy: context.commentId || context.userId,
      status: 'processing',
      metadata: JSON.stringify(context),
    },
  });

  try {
    const config: AutomationConfig = JSON.parse(automation.actionsConfig);
    const accessToken = decrypt(automation.igAccount.accessToken);
    const client = createInstagramClient(accessToken);

    for (const action of config.actions) {
      if (action.delay && action.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, (action.delay || 0) * 1000));
      }

      switch (action.type) {
        case 'reply_comment':
          if (context.commentId && action.text) {
            await client.replyToComment(context.commentId, action.text);
          }
          break;
        
        case 'send_dm':
          if (context.userId && action.text) {
            await client.sendMessage(context.userId, action.text);
            await prisma.dmLog.create({
              data: {
                userId: automation.userId,
                igAccountId: automation.igAccountId,
                status: 'sent',
                messageType: 'text',
                payload: JSON.stringify({ text: action.text }),
                sentAt: new Date(),
              },
            });
          }
          break;

        case 'add_tag':
          if (context.userId && action.tag) {
            const contact = await prisma.contact.findFirst({
              where: {
                igAccountId: automation.igAccountId,
                igUserId: context.userId,
              },
            });
            if (contact) {
              const tags = contact.tags ? JSON.parse(contact.tags) : [];
              if (!tags.includes(action.tag)) {
                tags.push(action.tag);
                await prisma.contact.update({
                  where: { id: contact.id },
                  data: { tags: JSON.stringify(tags) },
                });
              }
            }
          }
          break;
      }
    }

    await prisma.automationExecution.update({
      where: { id: executionId.id },
      data: { status: 'completed' },
    });
  } catch (error) {
    await prisma.automationExecution.update({
      where: { id: executionId.id },
      data: {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    throw error;
  }
}

export async function findMatchingAutomations(
  igAccountId: string,
  comment: { text: string; mediaId?: string }
): Promise<string[]> {
  const automations = await prisma.automation.findMany({
    where: {
      igAccountId,
      isActive: true,
      triggerType: 'comment',
    },
    orderBy: { priority: 'desc' },
  });

  const matched: string[] = [];

  for (const automation of automations) {
    try {
      const config: AutomationConfig = JSON.parse(automation.triggerConfig);
      const trigger = config.trigger;

      const scope = trigger.mediaScope || (trigger.mediaIds?.length ? 'specific' : 'any');
      if (scope === 'specific') {
        const allowed = trigger.mediaIds || [];
        if (!comment.mediaId || !allowed.includes(comment.mediaId)) {
          continue;
        }
      }

      const isMatch = await evaluateCommentTrigger(comment, trigger);
      if (isMatch) {
        matched.push(automation.id);
      }
    } catch (error) {
      console.error(`Error evaluating automation ${automation.id}:`, error);
    }
  }

  return matched;
}
