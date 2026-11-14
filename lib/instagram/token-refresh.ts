import { prisma } from '@/lib/db/client';
import { decrypt, encrypt } from '@/lib/crypto/encryption';
import {
  getLongLivedToken,
  getMetaConfig,
  resolveTokenExpiresAt,
} from '@/lib/instagram/oauth';

/** Refresh when fewer than this many days remain. */
const REFRESH_WITHIN_DAYS = 14;

export type TokenRefreshResult = {
  scanned: number;
  refreshed: number;
  failed: number;
  skipped: number;
};

/**
 * Exchange a long-lived Meta user token for a fresh one (~60 days).
 * Safe to call repeatedly before expiry.
 */
export async function refreshAccountAccessToken(accountId: string): Promise<{
  ok: boolean;
  expiresAt?: Date;
  error?: string;
}> {
  const account = await prisma.instagramAccount.findUnique({ where: { id: accountId } });
  if (!account?.accessToken) {
    return { ok: false, error: 'account_not_found' };
  }

  const config = await getMetaConfig();
  if (!config) {
    return { ok: false, error: 'meta_not_configured' };
  }

  try {
    const current = decrypt(account.accessToken);
    const refreshed = await getLongLivedToken(current, config.appId, config.appSecret);
    const expiresAt = resolveTokenExpiresAt(refreshed.expires_in);

    await prisma.instagramAccount.update({
      where: { id: account.id },
      data: {
        accessToken: encrypt(refreshed.access_token),
        tokenExpiresAt: expiresAt,
        lastSyncAt: new Date(),
        isActive: true,
      },
    });

    return { ok: true, expiresAt };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'refresh_failed';
    console.error('[token-refresh] failed', { accountId, message });
    return { ok: false, error: message };
  }
}

/**
 * Refresh all active accounts whose token expires within REFRESH_WITHIN_DAYS.
 */
export async function refreshExpiringTokens(
  limit = 20
): Promise<TokenRefreshResult> {
  const cutoff = new Date(Date.now() + REFRESH_WITHIN_DAYS * 24 * 60 * 60 * 1000);
  const accounts = await prisma.instagramAccount.findMany({
    where: {
      isActive: true,
      OR: [{ tokenExpiresAt: null }, { tokenExpiresAt: { lte: cutoff } }],
    },
    orderBy: { tokenExpiresAt: 'asc' },
    take: limit,
    select: { id: true, igUsername: true, tokenExpiresAt: true },
  });

  const result: TokenRefreshResult = {
    scanned: accounts.length,
    refreshed: 0,
    failed: 0,
    skipped: 0,
  };

  for (const account of accounts) {
    const outcome = await refreshAccountAccessToken(account.id);
    if (outcome.ok) {
      result.refreshed += 1;
      console.log('[token-refresh] refreshed', {
        accountId: account.id,
        username: account.igUsername,
        expiresAt: outcome.expiresAt?.toISOString(),
      });
    } else if (outcome.error === 'meta_not_configured') {
      result.skipped += 1;
      break;
    } else {
      result.failed += 1;
    }
  }

  return result;
}
