import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { refreshAccountAccessToken } from '@/lib/instagram/token-refresh';

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json().catch(() => ({}));
    const accountId = typeof body.accountId === 'string' ? body.accountId : '';

    if (!accountId) {
      return NextResponse.json({ error: 'accountId obrigatório' }, { status: 400 });
    }

    const account = await prisma.instagramAccount.findFirst({
      where: { id: accountId, userId: session.userId },
      select: { id: true },
    });

    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    const result = await refreshAccountAccessToken(account.id);
    if (!result.ok) {
      return NextResponse.json(
        {
          error:
            result.error === 'meta_not_configured'
              ? 'Meta App não configurado'
              : 'Falha ao renovar token — reconecte a conta',
          detail: result.error,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      expiresAt: result.expiresAt?.toISOString() || null,
    });
  } catch (error) {
    console.error('refresh-token error', error);
    return NextResponse.json({ error: 'Erro ao renovar token' }, { status: 500 });
  }
}
