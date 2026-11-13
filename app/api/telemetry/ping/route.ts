import { NextResponse } from 'next/server';
import { maybeSendHeartbeat } from '@/lib/telemetry/heartbeat';
import { isTelemetryEnabled } from '@/lib/telemetry/config';
import { getOrCreateInstallId } from '@/lib/telemetry/install-id';

export const dynamic = 'force-dynamic';

/** Soft ping from the logged-in app shell (throttled server-side). */
export async function POST() {
  if (!isTelemetryEnabled()) {
    return NextResponse.json({ ok: true, skipped: 'disabled' });
  }

  const result = await maybeSendHeartbeat('ping');
  const installId = await getOrCreateInstallId().catch(() => null);
  return NextResponse.json({ ...result, installId });
}
