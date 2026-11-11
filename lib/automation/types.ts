export type MatchType = 'exact' | 'contains' | 'starts_with' | 'ends_with' | 'any';

export type TriggerKind =
  | 'comment'
  | 'dm_keyword'
  | 'default_reply'
  | 'story_reply'
  | 'story_mention'
  | 'live_comment';

export type ConditionRule = 'has_tag' | 'field_equals' | 'follows';

export interface KeywordTriggerConfig {
  keywords: string[];
  matchType: MatchType;
  caseSensitive: boolean;
  mediaIds?: string[];
  mediaScope?: 'specific' | 'any';
}

export interface MessageButton {
  title: string;
  /** Sent when the button is tapped. */
  responseText?: string;
  /** Optional tag applied on tap. */
  addTag?: string;
  /** Only send responseText if the user follows the business. */
  requireFollow?: boolean;
  /** Sent (with recheck button) when requireFollow fails. */
  notFollowingText?: string;
}

export interface ActionConfig {
  type:
    | 'reply_comment'
    | 'send_dm'
    | 'add_tag'
    | 'follow_gate'
    | 'delay'
    | 'condition'
    | 'ask_input';
  text?: string;
  tag?: string;
  delay?: number;
  prompt?: string;
  buttonLabel?: string;
  rewardText?: string;
  notFollowingText?: string;
  recheckButtonLabel?: string;
  buttons?: MessageButton[];
  quickReplies?: MessageButton[];
  rule?: ConditionRule;
  field?: string;
  value?: string;
  then?: ActionConfig[];
  else?: ActionConfig[];
  saveKey?: string;
  fieldType?: 'text' | 'email' | 'phone';
}

export interface TriggerConfigEnvelope {
  trigger: KeywordTriggerConfig;
}

export interface ActionsConfigEnvelope {
  actions: ActionConfig[];
}

export const FOLLOW_CHECK_PREFIX = 'fc:follow_check:';
export const FOLLOW_RECHECK_PREFIX = 'fc:follow_recheck:';
export const BUTTON_PREFIX = 'fc:btn:';
export const ICE_PREFIX = 'fc:ice:';

/** Default recheck CTA when the person says they already follow. */
export const DEFAULT_FOLLOW_RECHECK_LABEL = 'Já segui';

/** Rotating nudges when follow check still fails (sounds human, not a bot loop). */
export const DEFAULT_FOLLOW_NUDGE_MESSAGES = [
  'Hum, olhei aqui e ainda não seguiu. Segue que te mando o link.',
  'Ainda não te achei nos seguidores 👀 Me segue e toca em Já segui.',
  'Hmm, ainda não seguiu. Segue aí e aperta Já segui que eu libero pra você.',
  'Quase! Me segue primeiro e toca em Já segui — aí eu te mando o link.',
] as const;

export function pickFollowNudgeMessage(attempt: number, custom?: string | null): string {
  const messages: string[] = [...DEFAULT_FOLLOW_NUDGE_MESSAGES];
  const trimmed = custom?.trim();
  if (trimmed) messages[0] = trimmed;
  const index = ((attempt % messages.length) + messages.length) % messages.length;
  return messages[index];
}

export function followCheckPayload(automationId: string) {
  return `${FOLLOW_CHECK_PREFIX}${automationId}`;
}

export function followRecheckPayload(automationId: string) {
  return `${FOLLOW_RECHECK_PREFIX}${automationId}`;
}

export function buttonPayload(automationId: string, index: number) {
  return `${BUTTON_PREFIX}${automationId}:${index}`;
}

export function icePayload(automationId: string) {
  return `${ICE_PREFIX}${automationId}`;
}

export function parseFollowGatePayload(
  payload: string
): { automationId: string; kind: 'check' | 'recheck' } | null {
  if (payload.startsWith(FOLLOW_CHECK_PREFIX)) {
    return { automationId: payload.slice(FOLLOW_CHECK_PREFIX.length), kind: 'check' };
  }
  if (payload.startsWith(FOLLOW_RECHECK_PREFIX)) {
    return { automationId: payload.slice(FOLLOW_RECHECK_PREFIX.length), kind: 'recheck' };
  }
  return null;
}

export function parseButtonPayload(
  payload: string
): { automationId: string; index: number } | null {
  if (!payload.startsWith(BUTTON_PREFIX)) return null;
  const rest = payload.slice(BUTTON_PREFIX.length);
  const idx = rest.lastIndexOf(':');
  if (idx <= 0) return null;
  const automationId = rest.slice(0, idx);
  const index = Number(rest.slice(idx + 1));
  if (!automationId || Number.isNaN(index)) return null;
  return { automationId, index };
}

export function parseIcePayload(payload: string): { automationId: string } | null {
  if (!payload.startsWith(ICE_PREFIX)) return null;
  const automationId = payload.slice(ICE_PREFIX.length);
  return automationId ? { automationId } : null;
}

export function evaluateKeywordMatch(
  textRaw: string,
  config: Pick<KeywordTriggerConfig, 'keywords' | 'matchType' | 'caseSensitive'>
): boolean {
  if (config.matchType === 'any') return true;

  const text = config.caseSensitive ? textRaw : textRaw.toLowerCase();
  const keywords = (config.caseSensitive
    ? config.keywords
    : config.keywords.map((k) => k.toLowerCase())
  ).map((k) => k.trim()).filter(Boolean);

  if (keywords.length === 0) return false;

  switch (config.matchType) {
    case 'exact':
      return keywords.some((keyword) => text === keyword);
    case 'contains':
      return keywords.some((keyword) => text.includes(keyword));
    case 'starts_with':
      return keywords.some((keyword) => text.startsWith(keyword));
    case 'ends_with':
      return keywords.some((keyword) => text.endsWith(keyword));
    default:
      return false;
  }
}

export type IceBreakerItem = {
  question: string;
  automationId: string;
};

export function iceBreakersConfigKey(igAccountId: string) {
  return `ice_breakers:${igAccountId}`;
}
