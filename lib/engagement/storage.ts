export type EngagementPromptId = 'donate' | 'github-star' | 'whatsapp';

export type EngagementPromptState = {
  status: 'pending' | 'snoozed' | 'done';
  dismissCount: number;
  snoozedUntil: number | null;
  wakeOnEngagement: boolean;
  engagementWakes: number;
  updatedAt: number;
};

export type EngagementStore = Record<EngagementPromptId, EngagementPromptState>;

export const ENGAGEMENT_PROMPT_ORDER: EngagementPromptId[] = [
  'donate',
  'github-star',
  'whatsapp',
];

export const ENGAGEMENT_STORAGE_KEY = 'fc-engagement-prompts-v1';
export const ENGAGEMENT_EVENT = 'fc:engagement';

const MAX_ENGAGEMENT_WAKES = 4;
const SOFT_SNOOZE_MS = 48 * 60 * 60 * 1000; // 48h baseline
const DONE_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90d

function defaultState(): EngagementPromptState {
  return {
    status: 'pending',
    dismissCount: 0,
    snoozedUntil: null,
    wakeOnEngagement: true,
    engagementWakes: 0,
    updatedAt: Date.now(),
  };
}

export function emptyEngagementStore(): EngagementStore {
  return {
    donate: defaultState(),
    'github-star': defaultState(),
    whatsapp: defaultState(),
  };
}

export function readEngagementStore(): EngagementStore {
  if (typeof window === 'undefined') return emptyEngagementStore();
  try {
    const raw = window.localStorage.getItem(ENGAGEMENT_STORAGE_KEY);
    if (!raw) return emptyEngagementStore();
    const parsed = JSON.parse(raw) as Partial<EngagementStore>;
    const base = emptyEngagementStore();
    for (const id of ENGAGEMENT_PROMPT_ORDER) {
      base[id] = { ...defaultState(), ...(parsed[id] || {}) };
    }
    return base;
  } catch {
    return emptyEngagementStore();
  }
}

export function writeEngagementStore(store: EngagementStore) {
  try {
    window.localStorage.setItem(ENGAGEMENT_STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota */
  }
}

function isDoneExpired(state: EngagementPromptState, now: number) {
  return state.status === 'done' && now - state.updatedAt > DONE_TTL_MS;
}

export function isPromptEligible(state: EngagementPromptState, now = Date.now()) {
  if (isDoneExpired(state, now)) return true;
  if (state.status === 'done') return false;
  if (state.status === 'pending') return true;
  if (state.status === 'snoozed') {
    if (state.snoozedUntil != null && now >= state.snoozedUntil) return true;
    return false;
  }
  return false;
}

export function nextEligiblePrompt(
  store: EngagementStore,
  now = Date.now()
): EngagementPromptId | null {
  for (const id of ENGAGEMENT_PROMPT_ORDER) {
    const state = store[id];
    // Expired done → treat as pending for selection
    if (isDoneExpired(state, now)) {
      return id;
    }
    if (isPromptEligible(state, now)) return id;
  }
  return null;
}

export function snoozePrompt(store: EngagementStore, id: EngagementPromptId): EngagementStore {
  const prev = store[id];
  const dismissCount = prev.dismissCount + 1;
  const multiplier = Math.min(dismissCount, 4);
  return {
    ...store,
    [id]: {
      ...prev,
      status: 'snoozed',
      dismissCount,
      snoozedUntil: Date.now() + SOFT_SNOOZE_MS * multiplier,
      wakeOnEngagement: true,
      updatedAt: Date.now(),
    },
  };
}

export function completePrompt(store: EngagementStore, id: EngagementPromptId): EngagementStore {
  return {
    ...store,
    [id]: {
      ...store[id],
      status: 'done',
      snoozedUntil: null,
      wakeOnEngagement: false,
      updatedAt: Date.now(),
    },
  };
}

/** Re-open snoozed prompts when the user is actively building automations. */
export function wakeOnEngagement(store: EngagementStore): {
  store: EngagementStore;
  woke: EngagementPromptId[];
} {
  const now = Date.now();
  const next = { ...store };
  const woke: EngagementPromptId[] = [];

  for (const id of ENGAGEMENT_PROMPT_ORDER) {
    const state = store[id];
    if (state.status === 'done' && !isDoneExpired(state, now)) continue;
    if (!state.wakeOnEngagement) continue;
    if (state.engagementWakes >= MAX_ENGAGEMENT_WAKES) continue;
    if (state.status === 'snoozed' || isDoneExpired(state, now)) {
      next[id] = {
        ...state,
        status: 'pending',
        snoozedUntil: null,
        engagementWakes: state.engagementWakes + 1,
        updatedAt: now,
      };
      woke.push(id);
    }
  }

  return { store: next, woke };
}

export function signalEngagement(detail?: { source?: string }) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(ENGAGEMENT_EVENT, {
      detail: { source: detail?.source || 'unknown', at: Date.now() },
    })
  );
}
