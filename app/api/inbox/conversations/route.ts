import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { automationLinkedConversationWhere } from '@/lib/inbox/contacts';
import { parseTags } from '@/lib/inbox/serialize';

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const filter = searchParams.get('filter') || 'open';
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 50)));

    const where: Record<string, unknown> = {
      userId: session.userId,
      AND: [automationLinkedConversationWhere],
    };

    if (filter === 'open') where.status = 'open';
    if (filter === 'closed') where.status = 'closed';
    if (filter === 'unread') where.unreadCount = { gt: 0 };
    if (filter === 'reminders') {
      where.reminderAt = { not: null };
    }
    if (filter === 'favorites') where.isFavorite = true;

    if (q) {
      where.contact = {
        OR: [
          { igUsername: { contains: q, mode: 'insensitive' } },
          { fullName: { contains: q, mode: 'insensitive' } },
        ],
      };
    }

    const conversations = await prisma.conversation.findMany({
      where,
      include: {
        contact: {
          select: {
            id: true,
            igUsername: true,
            fullName: true,
            profilePic: true,
            tags: true,
            automationPaused: true,
          },
        },
        igAccount: {
          select: { id: true, igUsername: true },
        },
        messages: {
          where: {
            isNote: false,
            NOT: { messageType: 'system' },
          },
          orderBy: { sentAt: 'desc' },
          take: 1,
          select: { text: true, messageType: true, isFromPage: true, sentAt: true },
        },
      },
      orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
      take: limit,
    });

    return NextResponse.json({
      conversations: conversations.map((c) => ({
        id: c.id,
        status: c.status,
        unreadCount: c.unreadCount,
        isFavorite: c.isFavorite,
        reminderAt: c.reminderAt?.toISOString() || null,
        lastMessageAt: c.lastMessageAt?.toISOString() || null,
        preview: c.messages[0]?.text || null,
        previewFromPage: c.messages[0]?.isFromPage || false,
        contact: {
          id: c.contact.id,
          igUsername: c.contact.igUsername,
          fullName: c.contact.fullName,
          profilePic: c.contact.profilePic,
          tags: parseTags(c.contact.tags),
          automationPaused: c.contact.automationPaused,
        },
        igAccount: c.igAccount,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro' },
      { status: 500 }
    );
  }
}
