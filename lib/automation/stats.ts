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
