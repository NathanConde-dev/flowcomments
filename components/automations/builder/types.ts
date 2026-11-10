export type MatchType = 'exact' | 'contains' | 'starts_with' | 'ends_with';

export type FlowNodeId = 'start' | 'trigger' | 'reply' | 'dm';

export type BuilderStep = 'post' | 'flow';

export type MediaScope = 'specific' | 'any';

export interface IGAccountOption {
  id: string;
  igUsername: string;
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

export interface AutomationDraft {
  name: string;
  igAccountId: string;
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
}

export const defaultAutomationDraft = (): AutomationDraft => ({
  name: '',
  igAccountId: '',
  mediaScope: 'specific',
  selectedPosts: [],
  keywords: [''],
  matchType: 'contains',
  caseSensitive: false,
  replyEnabled: true,
  replyComment: '',
  dmEnabled: true,
  sendDm: '',
  dmDelay: 1,
});

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
