import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID é obrigatório' },
        { status: 400 }
      );
    }

    const account = await prisma.instagramAccount.findFirst({
      where: {
        id: accountId,
        userId: session.userId,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Conta não encontrada' },
        { status: 404 }
      );
    }

    await prisma.instagramAccount.update({
      where: { id: accountId },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting account:', error);
    return NextResponse.json(
      { error: 'Erro ao desconectar conta' },
      { status: 500 }
    );
  }
}
