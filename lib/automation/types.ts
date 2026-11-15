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

export type VariantPickMode = 'random' | 'sequential';

export interface MessageButton {
  title: string;
  /**
   * When set, Meta opens this URL (web_url). No postback / responseText.
   * Prefer HTTPS checkout / landing links for creators who sell.
   */
  url?: string;
  /** Sent when the button is tapped (postback only). */
  responseText?: string;
  /** Random/sequential variants for the button response. */
  responseTexts?: string[];
  /** Optional tag applied on tap. */
  addTag?: string;
  /** Pause automations and wait for a human (inbox). */
  handoff?: boolean;
  /** Only send responseText if the user follows the business. */
  requireFollow?: boolean;
  /** Sent (with recheck button) when requireFollow fails. */
  notFollowingText?: string;
  notFollowingTexts?: string[];
}

export interface ActionConfig {
  type:
    | 'reply_comment'
    | 'send_dm'
    | 'add_tag'
    | 'follow_gate'
    | 'delay'
    | 'condition'
    | 'ask_input'
    | 'human_handoff';
  text?: string;
  /** Variants (ManyChat-style). One is picked per send; `text` kept as fallback/primary. */
  texts?: string[];
  /** How to pick among `texts` / `promptTexts` / etc. Default: random. */
  textPickMode?: VariantPickMode;
  tag?: string;
  delay?: number;
  prompt?: string;
  promptTexts?: string[];
  buttonLabel?: string;
  rewardText?: string;
  notFollowingText?: string;
  notFollowingTexts?: string[];
  recheckButtonLabel?: string;
  /** Public image URL sent as DM attachment (before text when both set). */
  imageUrl?: string;
  /** Meta reusable attachment id (preferred over imageUrl when present). */
  imageAttachmentId?: string;
  /** Public audio URL sent as DM voice/audio message. */
  audioUrl?: string;
  /** Meta reusable attachment id for audio. */
  audioAttachmentId?: string;
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

export function collectTextPool(
  ...sources: Array<string | string[] | null | undefined>
): string[] {
  const out: string[] = [];
  for (const source of sources) {
    if (Array.isArray(source)) {
      for (const item of source) {
        const trimmed = item?.trim();
        if (trimmed) out.push(trimmed);
      }
    } else if (typeof source === 'string') {
      const trimmed = source.trim();
      if (trimmed) out.push(trimmed);
    }
  }
  return out;
}

export function normalizeTextVariants(
  ...sources: Array<string | string[] | null | undefined>
): string[] {
  const pool = collectTextPool(...sources);
  return pool.length > 0 ? pool : [''];
}

export type PickActionTextResult = {
  text: string;
  /** Next sequential counter to persist when mode is sequential. */
  nextSequence?: number;
};

/** Resolve action copy: random or sequential among variants. */
export function pickActionText(
  action: Pick<ActionConfig, 'text' | 'texts' | 'textPickMode'> & {
    prompt?: string;
    promptTexts?: string[];
    notFollowingText?: string;
    notFollowingTexts?: string[];
    rewardText?: string;
  },
  options?: {
    pool?: 'text' | 'prompt' | 'notFollowing' | 'reward';
    sequence?: number;
  }
): PickActionTextResult {
  const poolKind = options?.pool || 'text';
  let pool: string[] = [];
  if (poolKind === 'prompt') {
    pool = collectTextPool(action.promptTexts, action.prompt);
  } else if (poolKind === 'notFollowing') {
    pool = collectTextPool(action.notFollowingTexts, action.notFollowingText);
  } else if (poolKind === 'reward') {
    pool = collectTextPool(action.texts, action.rewardText, action.text);
  } else {
    pool = collectTextPool(action.texts, action.text);
  }

  if (pool.length === 0) return { text: '' };
  if (pool.length === 1) return { text: pool[0] };

  const mode = action.textPickMode === 'sequential' ? 'sequential' : 'random';
  if (mode === 'sequential') {
    const seq = Math.max(0, options?.sequence ?? 0);
    const index = seq % pool.length;
    return { text: pool[index], nextSequence: seq + 1 };
  }

  return { text: pool[Math.floor(Math.random() * pool.length)] };
}

export function pickButtonText(
  button: Pick<MessageButton, 'responseText' | 'responseTexts' | 'notFollowingText' | 'notFollowingTexts'>,
  kind: 'response' | 'notFollowing',
  mode: VariantPickMode = 'random',
  sequence = 0
): PickActionTextResult {
  const pool =
    kind === 'response'
      ? collectTextPool(button.responseTexts, button.responseText)
      : collectTextPool(button.notFollowingTexts, button.notFollowingText);
  if (pool.length === 0) return { text: '' };
  if (pool.length === 1) return { text: pool[0] };
  if (mode === 'sequential') {
    const index = sequence % pool.length;
    return { text: pool[index], nextSequence: sequence + 1 };
  }
  return { text: pool[Math.floor(Math.random() * pool.length)] };
}

const NAME_KEYS = new Set(['nome', 'name', 'primeiro_nome', 'first_name']);

/** Replace `{{var}}` placeholders. Empty name keys fall back to @username. */
export function interpolateTemplate(
  template: string,
  vars: Record<string, string | null | undefined>
): string {
  if (!template) return '';
  return template.replace(/\{\{\s*([a-zA-Z0-9_.]+)\s*\}\}/g, (match, key: string) => {
    const normalized = key.toLowerCase();
    const raw = vars[key] ?? vars[normalized];
    if (raw != null && raw !== '') return String(raw);
    if (NAME_KEYS.has(normalized)) {
      const username = vars.username || vars.usuario;
      if (username) return String(username);
      return '';
    }
    // Keep unknown placeholders visible so authors can spot typos.
    return match;
  });
}

export const TEMPLATE_VARIABLE_HINTS: Array<{ key: string; label: string }> = [
  { key: 'nome', label: 'Nome completo' },
  { key: 'primeiro_nome', label: 'Primeiro nome' },
  { key: 'username', label: '@username' },
  { key: 'comentario', label: 'Texto do comentário' },
  { key: 'mensagem', label: 'Texto da DM' },
];

export function buildTemplateVars(params: {
  fullName?: string | null;
  igUsername?: string | null;
  commentText?: string | null;
  messageText?: string | null;
  customData?: Record<string, unknown>;
}): Record<string, string> {
  const username = (params.igUsername || '').replace(/^@/, '').trim();
  const fullName = (params.fullName || '').trim() || username;
  const firstName = fullName.split(/\s+/).filter(Boolean)[0] || username;
  const vars: Record<string, string> = {
    nome: fullName,
    name: fullName,
    primeiro_nome: firstName,
    first_name: firstName,
    username,
    usuario: username,
    comentario: (params.commentText || '').trim(),
    comment: (params.commentText || '').trim(),
    mensagem: (params.messageText || '').trim(),
    message: (params.messageText || '').trim(),
  };

  for (const [key, value] of Object.entries(params.customData || {})) {
    if (key.startsWith('_')) continue;
    if (value == null) continue;
    vars[key] = String(value);
  }

  return vars;
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
