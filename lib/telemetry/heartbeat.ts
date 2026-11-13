import { prisma } from '@/lib/db';
import { getLocalVersion } from '@/lib/updates/version';
import { getHeartbeatUrl, isTelemetryEnabled } from '@/lib/telemetry/config';
import { getOrCreateInstallId } from '@/lib/telemetry/install-id';
import { getSystemConfig, setSystemConfig } from '@/lib/system-config';

const LAST_HEARTBEAT_KEY = 'telemetry_last_heartbeat_at';
const MIN_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12h

function publicHost(): string | null {
  const raw = process.env.NEXT_PUBLIC_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).host || null;
  } catch {
    return null;
  }
}

export type HeartbeatReason = 'boot' | 'ping' | 'manual';

export async function maybeSendHeartbeat(reason: HeartbeatReason = 'ping') {
  if (!isTelemetryEnabled()) {
    return { ok: false as const, skipped: 'disabled' as const };
  }

  try {
    if (reason !== 'boot' && reason !== 'manual') {
      const last = await getSystemConfig(LAST_HEARTBEAT_KEY);
      if (last) {
        const ts = Date.parse(last);
        if (Number.isFinite(ts) && Date.now() - ts < MIN_INTERVAL_MS) {
          return { ok: true as const, skipped: 'throttled' as const };
        }
      }
    }

    const [installId, igAccountCount] = await Promise.all([
      getOrCreateInstallId(),
      prisma.instagramAccount.count().catch(() => 0),
    ]);

    const payload = {
      installId,
      version: getLocalVersion(),
      edition: 'selfhost' as const,
      reason,
      publicHost: publicHost(),
      igAccountCount,
      nodeEnv: process.env.NODE_ENV || 'production',
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    try {
      const res = await fetch(getHeartbeatUrl(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'User-Agent': `Flowcomments-SelfHost/${payload.version}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        cache: 'no-store',
      });
      if (!res.ok) {
        return { ok: false as const, status: res.status };
      }
      await setSystemConfig(LAST_HEARTBEAT_KEY, new Date().toISOString());
      return { ok: true as const, installId };
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    console.warn('[telemetry] heartbeat failed', error instanceof Error ? error.message : error);
    return { ok: false as const, error: true as const };
  }
}
