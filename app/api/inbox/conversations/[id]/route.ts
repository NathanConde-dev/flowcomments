import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { parseCustomData, parseTags, serializeMessage } from '@/lib/inbox/serialize';

type Params = { params: Promise<{ id: string }> };

async function getOwnedConversation(userId: string, id: string) {
  return prisma.conversation.findFirst({
    where: { id, userId },
    include: {
      contact: true,
      igAccount: {
        select: {
          id: true,
          igUsername: true,
          igUserId: true,
          profilePictureUrl: true,
        },
      },
    },
  });
}

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const conversation = await getOwnedConversation(session.userId, id);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }

    if (conversation.unreadCount > 0) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { unreadCount: 0 },
      });
      conversation.unreadCount = 0;
    }

    const messages = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { sentAt: 'asc' },
      take: 500,
    });

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        status: conversation.status,
        unreadCount: conversation.unreadCount,
        isFavorite: conversation.isFavorite,
        reminderAt: conversation.reminderAt?.toISOString() || null,
        lastMessageAt: conversation.lastMessageAt?.toISOString() || null,
        contact: {
          id: conversation.contact.id,
          igUserId: conversation.contact.igUserId,
          igUsername: conversation.contact.igUsername,
          fullName: conversation.contact.fullName,
          profilePic: conversation.contact.profilePic,
          tags: parseTags(conversation.contact.tags),
          customData: parseCustomData(conversation.contact.customData),
          automationPaused: conversation.contact.automationPaused,
          lastSeenAt: conversation.contact.lastSeenAt?.toISOString() || null,
        },
        igAccount: conversation.igAccount,
        messages: messages.map(serializeMessage),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const conversation = await getOwnedConversation(session.userId, id);
    if (!conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }

    const body = (await request.json()) as {
      status?: 'open' | 'closed';
      unreadCount?: number;
      isFavorite?: boolean;
      reminderAt?: string | null;
      markUnread?: boolean;
    };

    const data: {
      status?: string;
      unreadCount?: number;
      isFavorite?: boolean;
      reminderAt?: Date | null;
    } = {};

    if (body.status === 'open' || body.status === 'closed') data.status = body.status;
    if (typeof body.isFavorite === 'boolean') data.isFavorite = body.isFavorite;
    if (body.markUnread) data.unreadCount = Math.max(1, conversation.unreadCount || 1);
    if (typeof body.unreadCount === 'number') data.unreadCount = Math.max(0, body.unreadCount);
    if (body.reminderAt === null) data.reminderAt = null;
    else if (typeof body.reminderAt === 'string') {
      const date = new Date(body.reminderAt);
      if (!Number.isNaN(date.getTime())) data.reminderAt = date;
    }

    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data,
    });

    return NextResponse.json({
      conversation: {
        id: updated.id,
        status: updated.status,
        unreadCount: updated.unreadCount,
        isFavorite: updated.isFavorite,
        reminderAt: updated.reminderAt?.toISOString() || null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro' },
      { status: 500 }
    );
  }
}
