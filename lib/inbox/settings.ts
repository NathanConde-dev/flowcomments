import { prisma } from '@/lib/db/client';

export type InboxConversationStartMode = 'any_message' | 'manual';

export type InboxSuspendAutomationsFor =
  | 'off'
  | '15m'
  | '30m'
  | '1h'
  | '6h'
  | 'until_closed';

export type InboxSettings = {
  conversationStartMode: InboxConversationStartMode;
  suspendAutomationsFor: InboxSuspendAutomationsFor;
  reassignSameAgent: boolean;
  allAgentsSeeAll: boolean;
  toastNotifications: boolean;
  soundNotifications: boolean;
};

export const DEFAULT_INBOX_SETTINGS: InboxSettings = {
  conversationStartMode: 'any_message',
  suspendAutomationsFor: '30m',
  reassignSameAgent: true,
  allAgentsSeeAll: true,
  toastNotifications: true,
  soundNotifications: true,
};

export const SUSPEND_AUTOMATION_OPTIONS: Array<{
  value: InboxSuspendAutomationsFor;
  label: string;
}> = [
  { value: 'off', label: 'Não suspender' },
  { value: '15m', label: '15 minutos' },
  { value: '30m', label: '30 minutos' },
  { value: '1h', label: '1 hora' },
  { value: '6h', label: '6 horas' },
  { value: 'until_closed', label: 'Até fechar a conversa' },
];

function settingsKey(userId: string) {
  return `user:${userId}:inbox_settings`;
}

function normalizeSettings(raw: unknown): InboxSettings {
  const data = raw && typeof raw === 'object' ? (raw as Partial<InboxSettings>) : {};
  const mode =
    data.conversationStartMode === 'manual' ? 'manual' : 'any_message';
  const suspend = SUSPEND_AUTOMATION_OPTIONS.some((o) => o.value === data.suspendAutomationsFor)
    ? (data.suspendAutomationsFor as InboxSuspendAutomationsFor)
    : DEFAULT_INBOX_SETTINGS.suspendAutomationsFor;

  return {
    conversationStartMode: mode,
    suspendAutomationsFor: suspend,
    reassignSameAgent:
      typeof data.reassignSameAgent === 'boolean'
        ? data.reassignSameAgent
        : DEFAULT_INBOX_SETTINGS.reassignSameAgent,
    allAgentsSeeAll:
      typeof data.allAgentsSeeAll === 'boolean'
        ? data.allAgentsSeeAll
        : DEFAULT_INBOX_SETTINGS.allAgentsSeeAll,
    toastNotifications:
      typeof data.toastNotifications === 'boolean'
        ? data.toastNotifications
        : DEFAULT_INBOX_SETTINGS.toastNotifications,
    soundNotifications:
      typeof data.soundNotifications === 'boolean'
        ? data.soundNotifications
        : DEFAULT_INBOX_SETTINGS.soundNotifications,
  };
}

export async function getInboxSettings(userId: string): Promise<InboxSettings> {
  const row = await prisma.systemConfig.findUnique({
    where: { key: settingsKey(userId) },
  });
  if (!row?.value) return { ...DEFAULT_INBOX_SETTINGS };
  try {
    return normalizeSettings(JSON.parse(row.value));
  } catch {
    return { ...DEFAULT_INBOX_SETTINGS };
  }
}

export async function saveInboxSettings(
  userId: string,
  patch: Partial<InboxSettings>
): Promise<InboxSettings> {
  const current = await getInboxSettings(userId);
  const next = normalizeSettings({ ...current, ...patch });
  await prisma.systemConfig.upsert({
    where: { key: settingsKey(userId) },
    create: {
      key: settingsKey(userId),
      value: JSON.stringify(next),
      encrypted: false,
    },
    update: {
      value: JSON.stringify(next),
      encrypted: false,
    },
  });
  return next;
}

export function suspendDurationMs(value: InboxSuspendAutomationsFor): number | null {
  switch (value) {
    case '15m':
      return 15 * 60 * 1000;
    case '30m':
      return 30 * 60 * 1000;
    case '1h':
      return 60 * 60 * 1000;
    case '6h':
      return 6 * 60 * 60 * 1000;
    case 'until_closed':
      return null;
    case 'off':
    default:
      return 0;
  }
}

export async function applyInboxAutomationSuspend(params: {
  contactId: string;
  mode: InboxSuspendAutomationsFor;
}) {
  if (params.mode === 'off') return;

  const contact = await prisma.contact.findUnique({
    where: { id: params.contactId },
    select: { id: true, customData: true, automationPaused: true },
  });
  if (!contact) return;

  let customData: Record<string, unknown> = {};
  try {
    customData = contact.customData ? JSON.parse(contact.customData) : {};
  } catch {
    customData = {};
  }

  const ms = suspendDurationMs(params.mode);
  if (params.mode === 'until_closed') {
    customData._automationPausedUntil = 'until_closed';
  } else if (ms && ms > 0) {
    customData._automationPausedUntil = new Date(Date.now() + ms).toISOString();
  } else {
    return;
  }

  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      automationPaused: true,
      customData: JSON.stringify(customData),
    },
  });
}

export async function clearInboxAutomationSuspend(contactId: string) {
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
    select: { id: true, customData: true },
  });
  if (!contact) return;

  let customData: Record<string, unknown> = {};
  try {
    customData = contact.customData ? JSON.parse(contact.customData) : {};
  } catch {
    customData = {};
  }

  if (!('_automationPausedUntil' in customData)) return;
  delete customData._automationPausedUntil;

  await prisma.contact.update({
    where: { id: contact.id },
    data: {
      automationPaused: false,
      customData: JSON.stringify(customData),
    },
  });
}

export function isAutomationTemporarilyPaused(contact: {
  automationPaused: boolean;
  customData: string | null;
}): boolean {
  if (!contact.automationPaused) return false;

  let customData: Record<string, unknown> = {};
  try {
    customData = contact.customData ? JSON.parse(contact.customData) : {};
  } catch {
    customData = {};
  }

  const until = customData._automationPausedUntil;
  if (until === 'until_closed') return true;
  if (typeof until === 'string') {
    const ts = Date.parse(until);
    if (!Number.isNaN(ts)) {
      return Date.now() < ts;
    }
  }

  return true;
}
