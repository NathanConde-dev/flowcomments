import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

export async function GET() {
  try {
    const session = await requireAuth();

    const pendingConfig = await prisma.systemConfig.findUnique({
      where: { key: `pending_accounts_${session.userId}` },
    });

    if (!pendingConfig) {
      return NextResponse.json({ accounts: [] });
    }

    const data = JSON.parse(pendingConfig.value);
    
    if (Date.now() - data.timestamp > 10 * 60 * 1000) {
      await prisma.systemConfig.delete({
        where: { key: `pending_accounts_${session.userId}` },
      });
      return NextResponse.json({ accounts: [] });
    }

    return NextResponse.json({ accounts: data.accounts });
  } catch (error) {
    console.error('Error getting pending accounts:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar contas' },
      { status: 500 }
    );
  }
}
