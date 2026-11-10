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
      return NextResponse.redirect(`/settings?${params.toString()}`);
    }

    if (!code || !state) {
      return NextResponse.redirect('/settings?error=missing_params');
    }

    const session = await getSession();
    if (!session.isLoggedIn) {
      return NextResponse.redirect('/login');
    }

    const stateConfig = await prisma.systemConfig.findUnique({
      where: { key: `oauth_state_${session.userId}` },
    });

    if (!stateConfig) {
      return NextResponse.redirect('/settings?error=invalid_state');
    }

    const stateData = JSON.parse(stateConfig.value);
    if (stateData.state !== state) {
      return NextResponse.redirect('/settings?error=csrf_mismatch');
    }

    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      return NextResponse.redirect('/settings?error=state_expired');
    }

    const config = await getMetaConfig();
    if (!config) {
      return NextResponse.redirect('/settings?error=no_config');
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/instagram/callback`;

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
      return NextResponse.redirect(`/settings?${params.toString()}`);
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
      return NextResponse.redirect(`/settings?${params.toString()}`);
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
      return NextResponse.redirect(`/settings?${params.toString()}`);
    }

    if (accounts.length === 0) {
      const hint = 'Nenhuma conta do Instagram encontrada. Verifique: (1) A conta é Professional (Business/Creator)? (2) Está no mesmo Business Portfolio do app? (3) Foi vinculada a uma página do Facebook?';
      const params = new URLSearchParams({
        error: 'no_accounts',
        message: 'No Instagram accounts found',
        hint,
      });
      return NextResponse.redirect(`/settings?${params.toString()}`);
    }

    if (accounts.length === 1) {
      const account = accounts[0];
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

      if ((account as any).pageId && (account as any).pageAccessToken) {
        await subscribePageToWebhooks((account as any).pageId, (account as any).pageAccessToken);
      }

      await prisma.systemConfig.delete({
        where: { key: `oauth_state_${session.userId}` },
      }).catch(() => {});

      return NextResponse.redirect('/settings?success=connected');
    }

    await prisma.systemConfig.upsert({
      where: { key: `pending_accounts_${session.userId}` },
      create: {
        key: `pending_accounts_${session.userId}`,
        value: JSON.stringify({
          accounts,
          token: longLivedToken,
          expiresIn,
          timestamp: Date.now(),
        }),
        encrypted: false,
      },
      update: {
        value: JSON.stringify({
          accounts,
          token: longLivedToken,
          expiresIn,
          timestamp: Date.now(),
        }),
      },
    });

    await prisma.systemConfig.delete({
      where: { key: `oauth_state_${session.userId}` },
    }).catch(() => {});

    return NextResponse.redirect('/settings/choose-account');
  } catch (error) {
    console.error('OAuth callback error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    const hint = getErrorHintPtBR(message);
    const params = new URLSearchParams({
      error: 'callback_failed',
      message,
      hint,
    });
    return NextResponse.redirect(`/settings?${params.toString()}`);
  }
}
