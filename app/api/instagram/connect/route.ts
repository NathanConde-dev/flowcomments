import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { getMetaConfig, buildOAuthURL } from '@/lib/instagram/oauth';
import { generateSecureToken } from '@/lib/crypto/encryption';
import { prisma } from '@/lib/db/client';

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const returnUrl = searchParams.get('returnUrl') || '/settings/instagram';

    const config = await getMetaConfig();
    if (!config) {
      const base = process.env.NEXT_PUBLIC_URL || new URL(request.url).origin;
      return NextResponse.redirect(
        new URL('/settings/meta?needConfig=1', base)
      );
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/instagram/callback`;
    const state = generateSecureToken(32);

    await prisma.systemConfig.upsert({
      where: { key: `oauth_state_${session.userId}` },
      create: {
        key: `oauth_state_${session.userId}`,
        value: JSON.stringify({ state, returnUrl, timestamp: Date.now() }),
        encrypted: false,
      },
      update: {
        value: JSON.stringify({ state, returnUrl, timestamp: Date.now() }),
      },
    });

    const oauthUrl = buildOAuthURL(redirectUri, state, config.appId);

    return NextResponse.redirect(oauthUrl);
  } catch (error) {
    console.error('Error initiating OAuth:', error);
    return NextResponse.json(
      { error: 'Erro ao iniciar conexão' },
      { status: 500 }
    );
  }
}
