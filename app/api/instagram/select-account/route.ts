import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { encrypt, decrypt } from '@/lib/crypto/encryption';
import { ensureWebhookSubscriptions, resolveTokenExpiresAt } from '@/lib/instagram/oauth';

function parsePending(value: string, encrypted: boolean) {
  const raw = encrypted ? decrypt(value) : value;
  return JSON.parse(raw);
}

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

    const data = parsePending(pendingConfig.value, pendingConfig.encrypted);
    const account = data.accounts.find((acc: any) => acc.id === accountId);

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const existing = await prisma.instagramAccount.findUnique({
      where: { igUserId: account.id },
    });

    if (existing && existing.userId !== session.userId) {
      return NextResponse.json(
        { error: 'Esta conta Instagram já está vinculada a outro usuário' },
        { status: 409 }
      );
    }

    const encryptedToken = encrypt(data.token);
    const expiresAt = resolveTokenExpiresAt(data.expiresIn);

    await prisma.instagramAccount.upsert({
      where: { igUserId: account.id },
      create: {
        userId: session.userId,
        igUserId: account.id,
        igUsername: account.username,
        profilePictureUrl: account.profile_picture_url || null,
        igBusinessAccountId: account.ig_id?.toString(),
        accessToken: encryptedToken,
        tokenExpiresAt: expiresAt,
        isActive: true,
        lastSyncAt: new Date(),
      },
      update: {
        // Only reached when existing.userId === session.userId
        igUsername: account.username,
        profilePictureUrl: account.profile_picture_url || undefined,
        accessToken: encryptedToken,
        tokenExpiresAt: expiresAt,
        isActive: true,
        lastSyncAt: new Date(),
      },
    });

    await ensureWebhookSubscriptions({
      igUserId: account.id,
      accessToken: data.token,
      pageId: account.pageId,
      pageAccessToken: account.pageAccessToken,
    });

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
