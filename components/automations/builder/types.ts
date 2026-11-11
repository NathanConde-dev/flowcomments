export type MatchType = 'exact' | 'contains' | 'starts_with' | 'ends_with' | 'any';

export type FlowNodeId =
  | 'start'
  | 'trigger'
  | 'reply'
  | 'followCheck'
  | 'dm'
  | 'dmNotFollowing'
  | 'delay'
  | 'condition'
  | 'addTag'
  | 'askInput';

export type BuilderStep = 'setup' | 'post' | 'flow';

export type MediaScope = 'specific' | 'any';

export type TriggerKind =
  | 'comment'
  | 'dm_keyword'
  | 'default_reply'
  | 'story_reply'
  | 'story_mention'
  | 'live_comment';

export type AutomationTemplateId =
  | 'reply-dm'
  | 'follow-gate'
  | 'faq'
  | 'dm-keyword'
  | 'default-reply'
  | 'story-mention';

export type ConditionRule = 'has_tag' | 'field_equals' | 'follows';

export interface IGAccountOption {
  id: string;
  igUsername: string;
  profilePictureUrl?: string | null;
}

export interface InstagramMediaPost {
  id: string;
  caption: string;
  mediaType: string;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string;
  timestamp: string;
  isReel: boolean;
}

export type NodePosition = { x: number; y: number };

export interface DmButtonDraft {
  title: string;
  responseText: string;
  addTag: string;
  requireFollow: boolean;
  notFollowingText: string;
}

export interface AutomationDraft {
  name: string;
  igAccountId: string;
  triggerKind: TriggerKind;
  mediaScope: MediaScope;
  selectedPosts: InstagramMediaPost[];
  keywords: string[];
  matchType: MatchType;
  caseSensitive: boolean;
  replyEnabled: boolean;
  replyComment: string;
  dmEnabled: boolean;
  sendDm: string;
  dmDelay: number;
  dmButtons: DmButtonDraft[];
  followCheckEnabled: boolean;
  gatePrompt: string;
  gateButtonLabel: string;
  dmIfNotFollowing: string;
  recheckButtonLabel: string;
  delayEnabled: boolean;
  delaySeconds: number;
  conditionEnabled: boolean;
  conditionRule: ConditionRule;
  conditionTag: string;
  conditionField: string;
  conditionValue: string;
  addTagEnabled: boolean;
  tagToAdd: string;
  askInputEnabled: boolean;
  askInputPrompt: string;
  askInputSaveKey: string;
  askInputFieldType: 'text' | 'email' | 'phone';
  nodePositions: Record<FlowNodeId, NodePosition>;
}

export const DEFAULT_NODE_POSITIONS: Record<FlowNodeId, NodePosition> = {
  start: { x: 260, y: 40 },
  trigger: { x: 260, y: 170 },
  reply: { x: 260, y: 300 },
  delay: { x: 260, y: 420 },
  condition: { x: 260, y: 540 },
  followCheck: { x: 260, y: 540 },
  addTag: { x: 60, y: 680 },
  askInput: { x: 260, y: 680 },
  dm: { x: 80, y: 820 },
  dmNotFollowing: { x: 440, y: 820 },
};

export const TRIGGER_KIND_LABELS: Record<TriggerKind, string> = {
  comment: 'Comentário em post/reel',
  live_comment: 'Comentário no Live',
  dm_keyword: 'Palavra-chave no DM',
  default_reply: 'Default Reply (qualquer DM)',
  story_reply: 'Resposta ao Story',
  story_mention: 'Menção no Story',
};

export const defaultAutomationDraft = (): AutomationDraft => ({
  name: '',
  igAccountId: '',
  triggerKind: 'comment',
  mediaScope: 'specific',
  selectedPosts: [],
  keywords: [''],
  matchType: 'contains',
  caseSensitive: false,
  replyEnabled: false,
  replyComment: '',
  dmEnabled: false,
  sendDm: '',
  dmDelay: 0,
  dmButtons: [],
  followCheckEnabled: false,
  gatePrompt: '',
  gateButtonLabel: 'Já sigo',
  dmIfNotFollowing: '',
  recheckButtonLabel: 'Verificar de novo',
  delayEnabled: false,
  delaySeconds: 3,
  conditionEnabled: false,
  conditionRule: 'has_tag',
  conditionTag: '',
  conditionField: '',
  conditionValue: '',
  addTagEnabled: false,
  tagToAdd: '',
  askInputEnabled: false,
  askInputPrompt: '',
  askInputSaveKey: 'email',
  askInputFieldType: 'email',
  nodePositions: { ...DEFAULT_NODE_POSITIONS },
});

export function needsPostSelection(kind: TriggerKind) {
  return kind === 'comment' || kind === 'live_comment';
}

export function needsKeywords(kind: TriggerKind) {
  return kind !== 'default_reply' && kind !== 'story_mention';
}

export function applyAutomationTemplate(
  template: AutomationTemplateId,
  base: AutomationDraft = defaultAutomationDraft()
): AutomationDraft {
  if (template === 'follow-gate') {
    return {
      ...base,
      name: base.name || 'Link só pra quem segue',
      triggerKind: 'comment',
      keywords: ['quero', 'link'],
      matchType: 'contains',
      replyEnabled: true,
      replyComment: 'Te mandei no direct ✉️',
      followCheckEnabled: true,
      gatePrompt: 'Toque abaixo pra receber o link — precisa estar me seguindo.',
      gateButtonLabel: 'Já sigo',
      dmEnabled: true,
      sendDm: 'Aqui está o link: https://seu-link.com',
      dmIfNotFollowing: 'Me segue e toca em Verificar de novo pra eu liberar o link.',
      recheckButtonLabel: 'Verificar de novo',
      nodePositions: { ...DEFAULT_NODE_POSITIONS },
    };
  }

  if (template === 'dm-keyword') {
    return {
      ...base,
      name: base.name || 'DM por palavra-chave',
      triggerKind: 'dm_keyword',
      keywords: ['link', 'info'],
      matchType: 'contains',
      dmEnabled: true,
      sendDm: 'Oi! Aqui está o que você pediu: https://seu-link.com',
      dmButtons: [
        {
          title: 'Quero mais',
          responseText: 'Perfeito — me conta o que precisa.',
          addTag: 'interessado',
          requireFollow: false,
          notFollowingText: '',
        },
      ],
      nodePositions: {
        ...DEFAULT_NODE_POSITIONS,
        dm: { x: 260, y: 320 },
      },
    };
  }

  if (template === 'default-reply') {
    return {
      ...base,
      name: base.name || 'Default Reply',
      triggerKind: 'default_reply',
      keywords: [],
      matchType: 'any',
      dmEnabled: true,
      sendDm: 'Oi! Recebi sua mensagem. Em breve te respondo — ou digite MENU para opções.',
      nodePositions: {
        ...DEFAULT_NODE_POSITIONS,
        dm: { x: 260, y: 320 },
      },
    };
  }

  if (template === 'story-mention') {
    return {
      ...base,
      name: base.name || 'Obrigado pela menção',
      triggerKind: 'story_mention',
      keywords: [],
      matchType: 'any',
      dmEnabled: true,
      sendDm: 'Obrigado por me marcar no story! 💛',
      addTagEnabled: true,
      tagToAdd: 'mencionou',
      nodePositions: {
        ...DEFAULT_NODE_POSITIONS,
        addTag: { x: 260, y: 320 },
        dm: { x: 260, y: 450 },
      },
    };
  }

  if (template === 'faq') {
    return {
      ...base,
      name: base.name || 'FAQ Automático',
      triggerKind: 'dm_keyword',
      keywords: ['dúvida', 'ajuda', 'faq'],
      matchType: 'contains',
      dmEnabled: true,
      sendDm: 'Oi! Me conta sua dúvida que eu te ajudo por aqui.',
      askInputEnabled: true,
      askInputPrompt: 'Se quiser, deixa seu e-mail pra eu te enviar o material:',
      askInputSaveKey: 'email',
      askInputFieldType: 'email',
      nodePositions: {
        ...DEFAULT_NODE_POSITIONS,
        dm: { x: 260, y: 320 },
        askInput: { x: 260, y: 460 },
      },
    };
  }

  return {
    ...base,
    name: base.name || 'Resposta + DM',
    triggerKind: 'comment',
    keywords: ['preço', 'info'],
    matchType: 'contains',
    replyEnabled: true,
    replyComment: 'Te enviei os detalhes no direct!',
    dmEnabled: true,
    sendDm: 'Oi! Vi seu comentário — aqui estão as informações.',
    nodePositions: {
      ...DEFAULT_NODE_POSITIONS,
      dm: { x: 260, y: 450 },
    },
  };
}

export function relativeTimePt(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days < 1) return 'hoje';
  if (days === 1) return 'há 1 dia';
  if (days < 30) return `há ${days} dias`;
  const months = Math.floor(days / 30);
  if (months === 1) return 'há 1 mês';
  if (months < 12) return `há ${months} meses`;
  const years = Math.floor(months / 12);
  return years === 1 ? 'há 1 ano' : `há ${years} anos`;
}
