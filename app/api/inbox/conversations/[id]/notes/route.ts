import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { serializeMessage } from '@/lib/inbox/serialize';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const body = (await request.json()) as { text?: string };
    const text = String(body.text || '').trim();
    if (!text) {
      return NextResponse.json({ error: 'Observação vazia' }, { status: 400 });
    }

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: session.userId },
      include: {
        contact: { select: { igUserId: true } },
        igAccount: { select: { igUserId: true } },
      },
    });
    if (!conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        igMessageId: `note:${conversation.id}:${Date.now()}`,
        fromIgUserId: conversation.igAccount.igUserId || 'page',
        toIgUserId: conversation.contact.igUserId,
        messageType: 'note',
        text,
        isFromPage: true,
        isNote: true,
        sentAt: new Date(),
      },
    });

    return NextResponse.json({ message: serializeMessage(message) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro' },
      { status: 500 }
    );
  }
}
