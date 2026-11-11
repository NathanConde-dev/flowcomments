import { recoverFailedCommentAutomations } from '@/lib/automation/engine';
import { recoverPendingCommentEvents } from '@/lib/instagram/webhook';

const RECOVERY_INTERVAL_MS = 45_000;

let recoveryTimer: NodeJS.Timeout | null = null;
let running = false;

export async function runCommentRecoveryPass() {
  if (running) return;
  running = true;
  try {
    const events = await recoverPendingCommentEvents(40);
    const failed = await recoverFailedCommentAutomations(40);
    if (events.scanned || failed.scanned) {
      console.log('[RECOVERY] comment pass', { events, failed });
    }
  } catch (error) {
    console.error('[RECOVERY] comment pass failed', error);
  } finally {
    running = false;
  }
}

export function startCommentRecoveryLoop() {
  if (recoveryTimer) return;
  console.log(
    `[RECOVERY] Comment recovery loop started (every ${RECOVERY_INTERVAL_MS / 1000}s, 7-day window)`
  );
  // Primeira passagem após boot (dá tempo do worker subir)
  setTimeout(() => {
    void runCommentRecoveryPass();
  }, 8_000);
  recoveryTimer = setInterval(() => {
    void runCommentRecoveryPass();
  }, RECOVERY_INTERVAL_MS);
  recoveryTimer.unref?.();
}

export function stopCommentRecoveryLoop() {
  if (!recoveryTimer) return;
  clearInterval(recoveryTimer);
  recoveryTimer = null;
}
