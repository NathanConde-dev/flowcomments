import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { appendInboxSystemEvent, statusMoveText } from '@/lib/inbox/events';
import {
  clearInboxAutomationSuspend,
  getInboxSettings,
  saveInboxSettings,
  type InboxSettings,
} from '@/lib/inbox/settings';

export async function GET() {
  try {
    const session = await requireAuth();
    const settings = await getInboxSettings(session.userId);
    const openCount = await prisma.conversation.count({
      where: { userId: session.userId, status: 'open' },
    });
    return NextResponse.json({ settings, openCount });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAuth();
    const body = (await request.json()) as Partial<InboxSettings>;
    const settings = await saveInboxSettings(session.userId, body);
    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = (await request.json()) as { action?: string };
    if (body.action !== 'close_all_open') {
      return NextResponse.json({ error: 'Ação inválida' }, { status: 400 });
    }

    const open = await prisma.conversation.findMany({
      where: { userId: session.userId, status: 'open' },
      include: {
        contact: { select: { id: true, igUserId: true } },
        igAccount: { select: { igUserId: true } },
      },
      take: 500,
    });

    if (open.length === 0) {
      return NextResponse.json({ closed: 0 });
    }

    await prisma.conversation.updateMany({
      where: {
        userId: session.userId,
        id: { in: open.map((c) => c.id) },
      },
      data: { status: 'closed' },
    });

    for (const conversation of open) {
      await appendInboxSystemEvent({
        conversationId: conversation.id,
        businessIgUserId: conversation.igAccount.igUserId || 'page',
        contactIgUserId: conversation.contact.igUserId,
        kind: 'status_closed',
        text: statusMoveText('open', 'closed'),
        meta: { from: 'open', to: 'closed', reason: 'close_all' },
      });
      await clearInboxAutomationSuspend(conversation.contact.id);
    }

    return NextResponse.json({ closed: open.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro' },
      { status: 500 }
    );
  }
}
