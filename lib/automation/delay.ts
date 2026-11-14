import { createQueue, QUEUE_NAMES } from '@/lib/queue/client';
import { prisma } from '@/lib/db/client';
import type { AutomationContext } from './engine';

/** Inline sleep only for short waits; longer delays use Redis (or DB resumeAt). */
export const INLINE_DELAY_MAX_SECONDS = 10;

export function shouldScheduleDurableDelay(seconds: number): boolean {
  return seconds > INLINE_DELAY_MAX_SECONDS;
}

export async function scheduleAutomationResume(params: {
  automationId: string;
  context: AutomationContext;
  executionId: string;
  actionIndex: number;
  seconds: number;
}): Promise<'queued' | 'inline'> {
  const seconds = Math.max(0, params.seconds);
  if (seconds <= 0) return 'inline';

  if (!shouldScheduleDurableDelay(seconds)) {
    return 'inline';
  }

  const queue = createQueue(QUEUE_NAMES.AUTOMATION);
  // Sem Redis não dá pra atrasar de forma durável — caller usa setTimeout.
  if (!queue) return 'inline';

  const resumeAt = new Date(Date.now() + seconds * 1000).toISOString();
  const execution = await prisma.automationExecution.findUnique({
    where: { id: params.executionId },
    select: { metadata: true },
  });
  let meta: Record<string, unknown> = {};
  try {
    meta = execution?.metadata ? JSON.parse(execution.metadata) : {};
  } catch {
    meta = {};
  }
  meta.resumeAt = resumeAt;
  meta.delaySeconds = seconds;
  meta.delayActionIndex = params.actionIndex;

  await prisma.automationExecution.update({
    where: { id: params.executionId },
    data: {
      status: 'delayed',
      metadata: JSON.stringify(meta),
    },
  });

  const jobId = `auto_${params.automationId}_delay_${params.executionId}_${params.actionIndex}`;
  const existing = await queue.getJob(jobId);
  if (existing) {
    const state = await existing.getState();
    if (state === 'delayed' || state === 'waiting' || state === 'active') {
      return 'queued';
    }
    await existing.remove().catch(() => undefined);
  }

  await queue.add(
    'execute-automation',
    {
      automationId: params.automationId,
      context: { ...params.context, resume: true },
    },
    {
      jobId,
      delay: seconds * 1000,
      attempts: 3,
    }
  );
  return 'queued';
}

export async function recoverDelayedAutomations(limit = 40): Promise<{
  scanned: number;
  queued: number;
}> {
  const now = new Date();
  const delayed = await prisma.automationExecution.findMany({
    where: {
      status: 'delayed',
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
    select: {
      id: true,
      automationId: true,
      metadata: true,
    },
  });

  let queued = 0;
  for (const row of delayed) {
    let meta: {
      resumeAt?: string;
      commentId?: string;
      commentText?: string;
      messageText?: string;
      userId?: string;
      username?: string;
      source?: AutomationContext['source'];
    } = {};
    try {
      meta = row.metadata ? JSON.parse(row.metadata) : {};
    } catch {
      continue;
    }
    if (!meta.resumeAt || new Date(meta.resumeAt) > now) continue;

    const { queueOrExecuteAutomation } = await import('./engine');
    await queueOrExecuteAutomation(row.automationId, {
      commentId: meta.commentId,
      commentText: meta.commentText,
      messageText: meta.messageText,
      userId: meta.userId,
      username: meta.username,
      source: meta.source,
      resume: true,
    });

    await prisma.automationExecution.update({
      where: { id: row.id },
      data: { status: 'completed' },
    });
    queued += 1;
  }

  return { scanned: delayed.length, queued };
}
