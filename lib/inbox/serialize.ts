export type InboxMessageButton = {
  title: string;
  type?: 'postback' | 'web_url' | 'quick_reply';
  url?: string;
};

export function parseTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
  } catch {
    return [];
  }
}

export function parseCustomData(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function normalizeButton(item: unknown): InboxMessageButton | null {
  if (typeof item === 'string') {
    const title = item.trim();
    return title ? { title } : null;
  }
  if (!item || typeof item !== 'object') return null;
  const raw = item as {
    title?: unknown;
    type?: unknown;
    url?: unknown;
    payload?: unknown;
  };
  const title = String(raw.title || '').trim();
  if (!title) return null;
  const typeRaw = String(raw.type || '').trim().toLowerCase();
  const type =
    typeRaw === 'web_url' || typeRaw === 'quick_reply' || typeRaw === 'postback'
      ? (typeRaw as InboxMessageButton['type'])
      : raw.url
        ? 'web_url'
        : undefined;
  return {
    title,
    type,
    url: typeof raw.url === 'string' ? raw.url : undefined,
  };
}

export function parseButtons(raw: string | null | undefined): InboxMessageButton[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeButton).filter((b): b is InboxMessageButton => Boolean(b));
    }
    if (parsed && typeof parsed === 'object') {
      const items = (parsed as { items?: unknown; buttons?: unknown }).items
        ?? (parsed as { buttons?: unknown }).buttons;
      if (Array.isArray(items)) {
        return items.map(normalizeButton).filter((b): b is InboxMessageButton => Boolean(b));
      }
    }
    return [];
  } catch {
    return [];
  }
}

export function serializeMessage(message: {
  id: string;
  messageType: string;
  text: string | null;
  attachments: string | null;
  automationId: string | null;
  automationName: string | null;
  buttonsJson: string | null;
  isNote: boolean;
  isFromPage: boolean;
  sentAt: Date;
  fromIgUserId: string;
  toIgUserId: string;
}) {
  return {
    id: message.id,
    messageType: message.messageType,
    text: message.text,
    attachments: message.attachments,
    automationId: message.automationId,
    automationName: message.automationName,
    buttons: parseButtons(message.buttonsJson),
    isNote: message.isNote,
    isFromPage: message.isFromPage,
    sentAt: message.sentAt.toISOString(),
    fromIgUserId: message.fromIgUserId,
    toIgUserId: message.toIgUserId,
  };
}
