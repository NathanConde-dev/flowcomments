import { prisma } from '@/lib/db/client';

export type AutomationStats = {
  triggers: number;
  dms: number;
  taps: number;
  tags: number;
};

const EMPTY_STATS: AutomationStats = {
  triggers: 0,
  dms: 0,
  taps: 0,
  tags: 0,
};

export function parseAutomationStats(raw: string | null | undefined): AutomationStats {
  if (!raw) return { ...EMPTY_STATS };
  try {
    const parsed = JSON.parse(raw) as Partial<AutomationStats>;
    return {
      triggers: Number(parsed.triggers) || 0,
      dms: Number(parsed.dms) || 0,
      taps: Number(parsed.taps) || 0,
      tags: Number(parsed.tags) || 0,
    };
  } catch {
    return { ...EMPTY_STATS };
  }
}

export async function bumpAutomationStat(
  automationId: string,
  key: keyof AutomationStats,
  by = 1
): Promise<void> {
  if (!automationId || by === 0) return;
  try {
    const row = await prisma.automation.findUnique({
      where: { id: automationId },
      select: { stats: true },
    });
    if (!row) return;
    const stats = parseAutomationStats(row.stats);
    stats[key] = Math.max(0, stats[key] + by);
    await prisma.automation.update({
      where: { id: automationId },
      data: { stats: JSON.stringify(stats) },
    });
  } catch (error) {
    console.warn('[stats] bump failed', { automationId, key, error });
  }
}

/**
 * Rebuild trigger count from distinct comment/sender ids.
 * Fixes inflated counters caused by recovery/BullMQ retries.
 */
export async function reconcileAutomationTriggerStats(
  automationId: string
): Promise<AutomationStats> {
  const automation = await prisma.automation.findUnique({
    where: { id: automationId },
    select: { id: true, stats: true },
  });
  if (!automation) return { ...EMPTY_STATS };

  const grouped = await prisma.automationExecution.groupBy({
    by: ['triggeredBy'],
    where: {
      automationId: automation.id,
      triggeredBy: { not: null },
    },
  });
  const triggers = grouped.filter((row) => Boolean(row.triggeredBy)).length;
  const stats = parseAutomationStats(automation.stats);
  if (stats.triggers !== triggers) {
    stats.triggers = triggers;
    await prisma.automation.update({
      where: { id: automation.id },
      data: { stats: JSON.stringify(stats) },
    });
  }
  return stats;
}
