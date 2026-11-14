import { recoverFailedCommentAutomations } from '@/lib/automation/engine';
import { recoverDelayedAutomations } from '@/lib/automation/delay';
import { recoverPendingCommentEvents } from '@/lib/instagram/webhook';
import { refreshExpiringTokens } from '@/lib/instagram/token-refresh';

const RECOVERY_INTERVAL_MS = 45_000;
/** Token refresh roughly every ~30 recovery passes (~22 min). */
const TOKEN_REFRESH_EVERY_N_PASSES = 30;

let recoveryTimer: NodeJS.Timeout | null = null;
let running = false;
let passCount = 0;

export async function runCommentRecoveryPass() {
  if (running) return;
  running = true;
  try {
    const events = await recoverPendingCommentEvents(40);
    const failed = await recoverFailedCommentAutomations(40);
    const delayed = await recoverDelayedAutomations(40);
    if (events.scanned || failed.scanned || delayed.scanned) {
      console.log('[RECOVERY] comment pass', { events, failed, delayed });
    }

    passCount += 1;
    if (passCount === 1 || passCount % TOKEN_REFRESH_EVERY_N_PASSES === 0) {
      const tokens = await refreshExpiringTokens(10);
      if (tokens.scanned) {
        console.log('[RECOVERY] token refresh', tokens);
      }
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
