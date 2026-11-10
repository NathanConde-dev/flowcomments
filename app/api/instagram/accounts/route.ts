import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

export async function GET() {
  try {
    const session = await requireAuth();

    const accounts = await prisma.instagramAccount.findMany({
      where: {
        userId: session.userId,
        isActive: true,
      },
      select: {
        id: true,
        igUsername: true,
        igUserId: true,
        lastSyncAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ accounts });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar contas' },
      { status: 500 }
    );
  }
}
