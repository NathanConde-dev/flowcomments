import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { encrypt } from '@/lib/crypto/encryption';
import { subscribePageToWebhooks } from '@/lib/instagram/oauth';

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    const pendingConfig = await prisma.systemConfig.findUnique({
      where: { key: `pending_accounts_${session.userId}` },
    });

    if (!pendingConfig) {
      return NextResponse.json({ error: 'No pending accounts' }, { status: 400 });
    }

    const data = JSON.parse(pendingConfig.value);
    const account = data.accounts.find((acc: any) => acc.id === accountId);

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const encryptedToken = encrypt(data.token);
    const expiresAt = new Date(Date.now() + data.expiresIn * 1000);

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

    if (account.pageId && account.pageAccessToken) {
      await subscribePageToWebhooks(account.pageId, account.pageAccessToken);
    }

    await prisma.systemConfig.delete({
      where: { key: `pending_accounts_${session.userId}` },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error selecting account:', error);
    return NextResponse.json(
      { error: 'Erro ao selecionar conta' },
      { status: 500 }
    );
  }
}
