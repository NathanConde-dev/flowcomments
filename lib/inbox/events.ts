import { prisma } from '@/lib/db/client';

export type InboxSystemEventKind =
  | 'status_open'
  | 'status_closed'
  | 'status_reopened'
  | 'favorite_on'
  | 'favorite_off'
  | 'reminder_set'
  | 'reminder_cleared'
  | 'marked_unread'
  | 'automation_paused'
  | 'automation_resumed';

const STATUS_LABEL: Record<string, string> = {
  open: 'Aberta',
  closed: 'Fechada',
  unassigned: 'Não atribuído',
};

export function statusMoveText(from: string, to: string) {
  const fromLabel = STATUS_LABEL[from] || from || 'Não atribuído';
  const toLabel = STATUS_LABEL[to] || to;
  return `A conversa foi movida de ${fromLabel} para ${toLabel}`;
}

const EVENT_COPY: Record<InboxSystemEventKind, string> = {
  status_open: 'A conversa foi movida para Aberta',
  status_closed: 'A conversa foi movida para Fechada',
  status_reopened: 'A conversa foi movida de Fechada para Aberta',
  favorite_on: 'A conversa foi adicionada aos favoritos',
  favorite_off: 'A conversa foi removida dos favoritos',
  reminder_set: 'Um lembrete foi definido para esta conversa',
  reminder_cleared: 'O lembrete desta conversa foi removido',
  marked_unread: 'A conversa foi marcada como não lida',
  automation_paused: 'As automações foram suspensas para este contato',
  automation_resumed: 'As automações foram retomadas para este contato',
};

export async function appendInboxSystemEvent(params: {
  conversationId: string;
  businessIgUserId: string;
  contactIgUserId: string;
  kind: InboxSystemEventKind;
  text?: string;
  meta?: Record<string, unknown>;
}) {
  const text = params.text || EVENT_COPY[params.kind];
  const igMessageId = `sys:${params.conversationId}:${params.kind}:${Date.now()}`;

  try {
    return await prisma.message.create({
      data: {
        conversationId: params.conversationId,
        igMessageId,
        fromIgUserId: params.businessIgUserId || 'system',
        toIgUserId: params.contactIgUserId || 'system',
        messageType: 'system',
        text,
        attachments: JSON.stringify({
          kind: params.kind,
          ...(params.meta || {}),
        }),
        isFromPage: true,
        isNote: false,
        sentAt: new Date(),
      },
    });
  } catch {
    return null;
  }
}

export function statusEventKind(
  from: string,
  to: 'open' | 'closed'
): InboxSystemEventKind {
  if (to === 'closed') return 'status_closed';
  if (from === 'closed' && to === 'open') return 'status_reopened';
  return 'status_open';
}
