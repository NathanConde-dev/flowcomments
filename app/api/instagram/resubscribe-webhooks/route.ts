import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { decrypt } from '@/lib/crypto/encryption';
import { ensureWebhookSubscriptions } from '@/lib/instagram/oauth';

export async function POST() {
  try {
    const session = await requireAuth();

    const accounts = await prisma.instagramAccount.findMany({
      where: { userId: session.userId, isActive: true },
      select: {
        id: true,
        igUserId: true,
        igUsername: true,
        accessToken: true,
      },
    });

    if (accounts.length === 0) {
      return NextResponse.json({ error: 'Nenhuma conta ativa' }, { status: 400 });
    }

    const results = [];
    for (const account of accounts) {
      const accessToken = decrypt(account.accessToken);
      const result = await ensureWebhookSubscriptions({
        igUserId: account.igUserId,
        accessToken,
      });
      results.push({
        accountId: account.id,
        igUsername: account.igUsername,
        ...result,
      });
    }

    const failed = results.filter((item) => !item.igOk);
    if (failed.length === results.length) {
      return NextResponse.json(
        {
          error:
            failed[0]?.error ||
            'Falha ao assinar webhooks. Confira permissões e a URL do webhook no Meta App.',
          results,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      results,
      warning:
        failed.length > 0
          ? 'Algumas contas falharam na assinatura de webhooks'
          : undefined,
    });
  } catch (error) {
    console.error('Error resubscribing webhooks:', error);
    return NextResponse.json({ error: 'Erro ao reativar webhooks' }, { status: 500 });
  }
}
