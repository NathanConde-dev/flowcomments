import { NextResponse } from 'next/server';
import { destroySession, requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

export async function DELETE(request: Request) {
  try {
    const session = await requireAuth();
    const body = (await request.json()) as { confirm?: string };

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: { id: true, username: true, isAdmin: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const confirm = String(body.confirm || '').trim();
    const expected = user.username;
    if (confirm !== expected && confirm.toUpperCase() !== 'EXCLUIR') {
      return NextResponse.json(
        { error: 'Confirmação inválida. Digite seu usuário ou EXCLUIR.' },
        { status: 400 }
      );
    }

    if (user.isAdmin) {
      const adminCount = await prisma.user.count({ where: { isAdmin: true } });
      if (adminCount <= 1) {
        return NextResponse.json(
          {
            error:
              'Não é possível excluir o único administrador. Crie outro admin antes.',
          },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({ where: { id: user.id } });
    await destroySession();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao excluir conta' },
      { status: 500 }
    );
  }
}
