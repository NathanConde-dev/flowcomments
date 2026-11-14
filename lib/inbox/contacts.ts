/** Conversas criadas/tocadas por automação (ou com DM outbound de automação). */
export const automationLinkedConversationWhere = {
  OR: [
    { contact: { sourceAutomationId: { not: null } } },
    { contact: { lastAutomationId: { not: null } } },
    { messages: { some: { automationId: { not: null } } } },
  ],
};

export function isNumericIgHandle(value: string | null | undefined): boolean {
  return Boolean(value && /^\d{5,}$/.test(value.trim()));
}

/** Nome legível: fullName → @username real → fallback. */
export function contactDisplayName(contact: {
  fullName?: string | null;
  igUsername?: string | null;
  igUserId?: string | null;
}): string {
  const fullName = contact.fullName?.trim();
  if (fullName) return fullName;

  const username = contact.igUsername?.trim();
  if (username && !isNumericIgHandle(username)) {
    return username.startsWith('@') ? username : `@${username}`;
  }

  const igUserId = contact.igUserId?.trim();
  if (igUserId && !isNumericIgHandle(igUserId) && igUserId !== username) {
    return igUserId.startsWith('@') ? igUserId : `@${igUserId}`;
  }

  return 'Contato Instagram';
}

export function contactInitial(contact: {
  fullName?: string | null;
  igUsername?: string | null;
}): string {
  const label = contactDisplayName(contact).replace(/^@/, '');
  return (label[0] || '?').toUpperCase();
}
