import type { Prisma } from '@prisma/client';

/** Contacts that originated from an automation (shown on Contatos by default). */
export function automationSourcedContactFilter(): Prisma.ContactWhereInput {
  return {
    AND: [
      { sourceAutomationName: { not: null } },
      { NOT: { sourceAutomationName: '' } },
    ],
  };
}

/** Inbox/organic contacts with no automation attribution. */
export function unsourcedContactFilter(): Prisma.ContactWhereInput {
  return {
    OR: [{ sourceAutomationName: null }, { sourceAutomationName: '' }],
  };
}
