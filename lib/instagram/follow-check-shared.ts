/** Client-safe helpers/constants for follow-check Meta setup (no Node/crypto imports). */

export const FOLLOW_CHECK_DOCS_URL =
  'https://flowcomments.com/docs/self-host/troubleshooting/follow-check';

export const FOLLOW_CHECK_SETUP_ERROR =
  'Este fluxo verifica se a pessoa segue. Configure Pages + permissões na Login Configuration do Meta e reconecte o Instagram antes de ativar.';

type ActionLike = {
  type?: string;
  requireFollow?: boolean;
  buttons?: Array<{ requireFollow?: boolean }>;
  rule?: string;
  then?: ActionLike[];
  else?: ActionLike[];
  actions?: ActionLike[];
};

function walkActions(actions: ActionLike[] | undefined, visit: (action: ActionLike) => void) {
  if (!Array.isArray(actions)) return;
  for (const action of actions) {
    visit(action);
    walkActions(action.then, visit);
    walkActions(action.else, visit);
    walkActions(action.actions, visit);
  }
}

/** True when the automation needs Meta Page token for is_user_follow_business. */
export function actionsRequireFollowCheck(actionsConfig: unknown): boolean {
  let actions: ActionLike[] = [];
  if (Array.isArray(actionsConfig)) {
    actions = actionsConfig as ActionLike[];
  } else if (actionsConfig && typeof actionsConfig === 'object') {
    const nested = (actionsConfig as { actions?: ActionLike[] }).actions;
    if (Array.isArray(nested)) actions = nested;
  }

  let needed = false;
  walkActions(actions, (action) => {
    if (needed) return;
    if (action.type === 'follow_gate') {
      needed = true;
      return;
    }
    if (action.type === 'condition' && action.rule === 'follows') {
      needed = true;
      return;
    }
    if (action.requireFollow) {
      needed = true;
      return;
    }
    if (Array.isArray(action.buttons) && action.buttons.some((b) => b.requireFollow)) {
      needed = true;
    }
  });
  return needed;
}

export function draftRequiresFollowCheck(draft: {
  followCheckEnabled?: boolean;
  conditionEnabled?: boolean;
  conditionRule?: string;
  dmButtons?: Array<{ requireFollow?: boolean }>;
}): boolean {
  if (draft.followCheckEnabled) return true;
  if (draft.conditionEnabled && draft.conditionRule === 'follows') return true;
  if (draft.dmButtons?.some((b) => b.requireFollow)) return true;
  return false;
}

export function followCheckBlockedResponse(extra?: { hint?: string }) {
  return {
    error: FOLLOW_CHECK_SETUP_ERROR,
    code: 'FOLLOW_CHECK_META_SETUP_REQUIRED' as const,
    docsUrl: FOLLOW_CHECK_DOCS_URL,
    ...(extra?.hint ? { hint: extra.hint } : {}),
  };
}
