import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { decrypt } from '@/lib/crypto/encryption';

function parsePending(value: string, encrypted: boolean) {
  const raw = encrypted ? decrypt(value) : value;
  return JSON.parse(raw);
}

export async function GET() {
  try {
    const session = await requireAuth();

    const pendingConfig = await prisma.systemConfig.findUnique({
      where: { key: `pending_accounts_${session.userId}` },
    });

    if (!pendingConfig) {
      return NextResponse.json({ accounts: [] });
    }

    const data = parsePending(pendingConfig.value, pendingConfig.encrypted);

    if (Date.now() - data.timestamp > 10 * 60 * 1000) {
      await prisma.systemConfig.delete({
        where: { key: `pending_accounts_${session.userId}` },
      });
      return NextResponse.json({ accounts: [] });
    }

    // Never return access tokens / page tokens to the browser
    const accounts = (data.accounts || []).map((acc: any) => ({
      id: acc.id,
      username: acc.username,
      name: acc.name,
      profile_picture_url: acc.profile_picture_url,
      ig_id: acc.ig_id,
      pageId: acc.pageId,
      followers_count: acc.followers_count,
    }));

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error getting pending accounts:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar contas' },
      { status: 500 }
    );
  }
}
