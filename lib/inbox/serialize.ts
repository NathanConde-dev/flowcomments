export type InboxMessageButton = { title: string };

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

export function parseButtons(raw: string | null | undefined): InboxMessageButton[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => ({ title: String((item as { title?: string })?.title || '').trim() }))
      .filter((item) => item.title);
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
