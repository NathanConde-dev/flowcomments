import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const contact = await prisma.contact.findFirst({
      where: { id, userId: session.userId },
      select: { id: true, igUsername: true },
    });
    if (!contact) {
      return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 });
    }

    // Conversations/messages cascade; DmLog contactId is SetNull
    await prisma.contact.delete({ where: { id: contact.id } });

    return NextResponse.json({ ok: true, id: contact.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao remover contato' },
      { status: 500 }
    );
  }
}
