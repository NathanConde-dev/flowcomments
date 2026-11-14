import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { automationLinkedConversationWhere, contactDisplayName } from '@/lib/inbox/contacts';
import { getInboxSettings } from '@/lib/inbox/settings';

export async function GET() {
  try {
    const session = await requireAuth();
    const settings = await getInboxSettings(session.userId);

    const conversations = await prisma.conversation.findMany({
      where: {
        userId: session.userId,
        unreadCount: { gt: 0 },
        status: 'open',
        AND: [automationLinkedConversationWhere],
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 20,
      select: {
        id: true,
        unreadCount: true,
        lastMessageAt: true,
        contact: {
          select: {
            igUsername: true,
            fullName: true,
            profilePic: true,
          },
        },
        messages: {
          where: {
            isNote: false,
            NOT: { messageType: 'system' },
          },
          orderBy: { sentAt: 'desc' },
          take: 1,
          select: { text: true, isFromPage: true },
        },
      },
    });

    const unreadConversations = conversations.length;
    const unreadMessages = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

    return NextResponse.json({
      unreadConversations,
      unreadMessages,
      toastNotifications: settings.toastNotifications,
      soundNotifications: settings.soundNotifications,
      items: conversations.map((c) => ({
        id: c.id,
        unreadCount: c.unreadCount,
        lastMessageAt: c.lastMessageAt?.toISOString() || null,
        contactUsername: contactDisplayName(c.contact),
        profilePic: c.contact.profilePic,
        preview: c.messages[0]?.text || null,
        previewFromPage: c.messages[0]?.isFromPage || false,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro' },
      { status: 500 }
    );
  }
}
