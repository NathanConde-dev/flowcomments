import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import {
  getMetaConfig,
  exchangeCodeForToken,
  getLongLivedToken,
  discoverInstagramAccounts,
  subscribePageToWebhooks,
  getErrorHintPtBR,
} from '@/lib/instagram/oauth';
import { encrypt } from '@/lib/crypto/encryption';

function absoluteUrl(request: Request, path: string) {
  const base = process.env.NEXT_PUBLIC_URL || new URL(request.url).origin;
  return new URL(path, base);
}

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(absoluteUrl(request, path));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      const hint = getErrorHintPtBR(errorDescription || error);
      const params = new URLSearchParams({
        error: 'oauth_failed',
        message: errorDescription || error,
        hint,
      });
      return redirectTo(request, `/settings/instagram?${params.toString()}`);
    }

    if (!code || !state) {
      return redirectTo(request, '/settings/instagram?error=missing_params');
    }

    const session = await getSession();
    if (!session.isLoggedIn) {
      return redirectTo(request, '/login');
    }

    const stateConfig = await prisma.systemConfig.findUnique({
      where: { key: `oauth_state_${session.userId}` },
    });

    if (!stateConfig) {
      return redirectTo(request, '/settings/instagram?error=invalid_state');
    }

    const stateData = JSON.parse(stateConfig.value);
    if (stateData.state !== state) {
      return redirectTo(request, '/settings/instagram?error=csrf_mismatch');
    }

    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return redirectTo(request, '/settings/instagram?error=state_expired');
    }

    const config = await getMetaConfig();
    if (!config) {
      return redirectTo(request, '/settings/meta?needConfig=1');
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_URL || new URL(request.url).origin}/api/instagram/callback`;

    let shortLivedToken: string;
    try {
      const tokenResponse = await exchangeCodeForToken(code, redirectUri, config.appId, config.appSecret);
      shortLivedToken = tokenResponse.access_token;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Token exchange failed';
      const hint = getErrorHintPtBR(message);
      const params = new URLSearchParams({
        error: 'token_exchange_failed',
        message,
        hint,
      });
      return redirectTo(request, `/settings/instagram?${params.toString()}`);
    }

    let longLivedToken: string;
    let expiresIn: number;
    try {
      const longTokenResponse = await getLongLivedToken(shortLivedToken, config.appId, config.appSecret);
      longLivedToken = longTokenResponse.access_token;
      expiresIn = longTokenResponse.expires_in;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Long-lived token failed';
      const hint = getErrorHintPtBR(message);
      const params = new URLSearchParams({
        error: 'long_token_failed',
        message,
        hint,
      });
      return redirectTo(request, `/settings/instagram?${params.toString()}`);
    }

    let accounts;
    try {
      accounts = await discoverInstagramAccounts(longLivedToken, config.appId, config.appSecret);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Account discovery failed';
      const hint = getErrorHintPtBR(message);
      const params = new URLSearchParams({
        error: 'discovery_failed',
        message,
        hint,
      });
      return redirectTo(request, `/settings/instagram?${params.toString()}`);
    }

    if (accounts.length === 0) {
      const hint =
        'Nenhuma conta do Instagram encontrada. Verifique: (1) A conta é Professional (Business/Creator)? (2) Está no mesmo Business Portfolio do app? (3) Foi vinculada a uma página do Facebook?';
      const params = new URLSearchParams({
        error: 'no_accounts',
        message: 'No Instagram accounts found',
        hint,
      });
      return redirectTo(request, `/settings/instagram?${params.toString()}`);
    }

    if (accounts.length === 1) {
      const account = accounts[0];
      const existing = await prisma.instagramAccount.findUnique({
        where: { igUserId: account.id },
      });

      if (existing && existing.userId !== session.userId) {
        return redirectTo(request, '/settings/instagram?error=account_owned_by_other');
      }

      const encryptedToken = encrypt(longLivedToken);
      const expiresAt = new Date(Date.now() + expiresIn * 1000);

      await prisma.instagramAccount.upsert({
        where: { igUserId: account.id },
        create: {
          userId: session.userId,
          igUserId: account.id,
          igUsername: account.username,
          igBusinessAccountId: account.ig_id?.toString(),
          accessToken: encryptedToken,
          tokenExpiresAt: expiresAt,
          isActive: true,
          lastSyncAt: new Date(),
        },
        update: {
          igUsername: account.username,
          accessToken: encryptedToken,
          tokenExpiresAt: expiresAt,
          isActive: true,
          lastSyncAt: new Date(),
        },
      });

      if ((account as { pageId?: string; pageAccessToken?: string }).pageId &&
          (account as { pageAccessToken?: string }).pageAccessToken) {
        await subscribePageToWebhooks(
          (account as { pageId: string }).pageId,
          (account as { pageAccessToken: string }).pageAccessToken
        );
      }

      await prisma.systemConfig
        .delete({
          where: { key: `oauth_state_${session.userId}` },
        })
        .catch(() => {});

      return redirectTo(request, '/settings/instagram?success=connected');
    }

    const pendingPayload = encrypt(
      JSON.stringify({
        accounts,
        token: longLivedToken,
        expiresIn,
        timestamp: Date.now(),
      })
    );

    await prisma.systemConfig.upsert({
      where: { key: `pending_accounts_${session.userId}` },
      create: {
        key: `pending_accounts_${session.userId}`,
        value: pendingPayload,
        encrypted: true,
      },
      update: {
        value: pendingPayload,
        encrypted: true,
      },
    });

    await prisma.systemConfig
      .delete({
        where: { key: `oauth_state_${session.userId}` },
      })
      .catch(() => {});

    return redirectTo(request, '/settings/choose-account');
  } catch (error) {
    console.error('OAuth callback error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const hint = getErrorHintPtBR(message);
    const params = new URLSearchParams({
      error: 'callback_failed',
      message,
      hint,
    });
    return redirectTo(request, `/settings/instagram?${params.toString()}`);
  }
}
