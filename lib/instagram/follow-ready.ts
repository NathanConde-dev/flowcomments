import { decrypt } from '@/lib/crypto/encryption';
import { resolveFacebookPageMessaging } from '@/lib/instagram/client';
import {
  FOLLOW_CHECK_DOCS_URL,
  FOLLOW_CHECK_SETUP_ERROR,
  actionsRequireFollowCheck,
  draftRequiresFollowCheck,
  followCheckBlockedResponse,
} from '@/lib/instagram/follow-check-shared';

export {
  FOLLOW_CHECK_DOCS_URL,
  FOLLOW_CHECK_SETUP_ERROR,
  actionsRequireFollowCheck,
  draftRequiresFollowCheck,
  followCheckBlockedResponse,
};

export type FollowReadyAccount = {
  id: string;
  igUserId: string;
  facebookPageId?: string | null;
  accessToken: string;
};

export async function checkAccountFollowReady(account: FollowReadyAccount): Promise<{
  ready: boolean;
  pageId: string | null;
  pageTokenResolved: boolean;
}> {
  const accessToken = decrypt(account.accessToken);
  if (accessToken.startsWith('IG')) {
    return { ready: true, pageId: null, pageTokenResolved: true };
  }

  const resolved = await resolveFacebookPageMessaging({
    accessToken,
    igUserId: account.igUserId,
    facebookPageId: account.facebookPageId,
  });

  const pageTokenResolved = Boolean(
    resolved.pageId && resolved.accessToken && resolved.accessToken !== accessToken
  );

  return {
    ready: pageTokenResolved,
    pageId: resolved.pageId,
    pageTokenResolved,
  };
}
