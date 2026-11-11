import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: session.userId },
      select: { contactId: true, igAccountId: true, contact: { select: { igUserId: true } } },
    });
    if (!conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }

    const [dmLogs, executions] = await Promise.all([
      prisma.dmLog.findMany({
        where: {
          userId: session.userId,
          contactId: conversation.contactId,
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
        select: {
          id: true,
          status: true,
          messageType: true,
          error: true,
          sentAt: true,
          createdAt: true,
          payload: true,
        },
      }),
      prisma.automationExecution.findMany({
        where: {
          automation: { userId: session.userId, igAccountId: conversation.igAccountId },
          OR: [
            { triggeredBy: conversation.contact.igUserId },
            { triggeredBy: { startsWith: conversation.contact.igUserId } },
          ],
        },
        include: {
          automation: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    return NextResponse.json({
      dmLogs: dmLogs.map((log) => ({
        id: log.id,
        status: log.status,
        messageType: log.messageType,
        error: log.error,
        sentAt: log.sentAt?.toISOString() || null,
        createdAt: log.createdAt.toISOString(),
      })),
      executions: executions.map((exec) => ({
        id: exec.id,
        status: exec.status,
        error: exec.error,
        triggeredBy: exec.triggeredBy,
        createdAt: exec.createdAt.toISOString(),
        automation: exec.automation,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro' },
      { status: 500 }
    );
  }
}
