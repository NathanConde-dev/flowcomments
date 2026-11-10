import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { encrypt } from '@/lib/crypto/encryption';
import { getErrorHintPtBR } from '@/lib/instagram/oauth';

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const { accessToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Access token é obrigatório' },
        { status: 400 }
      );
    }

    let igAccount;
    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/me?fields=id,username,name,profile_picture_url,followers_count,ig_id&access_token=${accessToken}`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Invalid token');
      }

      igAccount = await response.json();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Token validation failed';
      return NextResponse.json({
        error: 'Token inválido',
        message,
        hint: getErrorHintPtBR(message),
      }, { status: 400 });
    }

    if (!igAccount.id || !igAccount.username) {
      return NextResponse.json({
        error: 'Não foi possível obter informações da conta',
        hint: 'Verifique se o token é de uma conta do Instagram Business/Creator',
      }, { status: 400 });
    }

    const existing = await prisma.instagramAccount.findUnique({
      where: { igUserId: igAccount.id },
    });

    if (existing && existing.userId !== session.userId) {
      return NextResponse.json(
        { error: 'Esta conta Instagram já está vinculada a outro usuário' },
        { status: 409 }
      );
    }

    const encryptedToken = encrypt(accessToken);
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    await prisma.instagramAccount.upsert({
      where: { igUserId: igAccount.id },
      create: {
        userId: session.userId,
        igUserId: igAccount.id,
        igUsername: igAccount.username,
        igBusinessAccountId: igAccount.ig_id?.toString(),
        accessToken: encryptedToken,
        tokenExpiresAt: expiresAt,
        isActive: true,
        lastSyncAt: new Date(),
      },
      update: {
        igUsername: igAccount.username,
        accessToken: encryptedToken,
        tokenExpiresAt: expiresAt,
        isActive: true,
        lastSyncAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, account: igAccount });
  } catch (error) {
    console.error('Error with manual connect:', error);
    return NextResponse.json(
      { error: 'Erro ao conectar conta' },
      { status: 500 }
    );
  }
}
