import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { decrypt } from '@/lib/crypto/encryption';
import { getMetaConfig, debugToken } from '@/lib/instagram/oauth';
import { resolveFacebookPageMessaging } from '@/lib/instagram/client';

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export async function GET() {
  try {
    const session = await requireAuth();
    const accounts = await prisma.instagramAccount.findMany({
      where: { userId: session.userId, isActive: true },
      select: {
        id: true,
        igUserId: true,
        igUsername: true,
        facebookPageId: true,
        accessToken: true,
        lastSyncAt: true,
      },
    });

    const config = await getMetaConfig();
    const results = [];

    for (const account of accounts) {
      const accessToken = decrypt(account.accessToken);
      const resolved = await resolveFacebookPageMessaging({
        accessToken,
        igUserId: account.igUserId,
        facebookPageId: account.facebookPageId,
      });

      if (resolved.pageId && resolved.pageId !== account.facebookPageId) {
        await prisma.instagramAccount.update({
          where: { id: account.id },
          data: { facebookPageId: resolved.pageId },
        });
      }

      let scopes: string[] = [];
      let tokenValid: boolean | undefined;
      let tokenType: string | undefined;
      let granular: Array<{ scope?: string; targets: number }> = [];
      if (config?.appId && config?.appSecret) {
        try {
          const debug = await debugToken(accessToken, `${config.appId}|${config.appSecret}`);
          scopes = debug.data?.scopes || [];
          tokenValid = debug.data?.is_valid;
          tokenType = debug.data?.type;
          granular = (debug.data.granular_scopes || []).map((item) => ({
            scope: item.scope,
            targets: item.target_ids?.length || 0,
          }));
        } catch {
          /* ignore */
        }
      }

      const accountsRes = await fetch(
        `${GRAPH_API_BASE}/me/accounts?fields=id,name,instagram_business_account{id}&limit=100&access_token=${encodeURIComponent(accessToken)}`
      );
      const accountsBody = await accountsRes.json().catch(() => ({}));

      const requiredPageScopes = [
        'pages_show_list',
        'pages_read_engagement',
        'pages_manage_metadata',
      ] as const;
      const missingPageScopes = requiredPageScopes.filter((scope) => !scopes.includes(scope));

      let pageTokenProbe: { ok: boolean; error?: string } | null = null;
      const probePageId = resolved.pageId || account.facebookPageId;
      if (probePageId) {
        try {
          const probeRes = await fetch(
            `${GRAPH_API_BASE}/${probePageId}?fields=access_token&access_token=${encodeURIComponent(accessToken)}`
          );
          const probeBody = await probeRes.json().catch(() => ({}));
          pageTokenProbe = probeRes.ok && probeBody.access_token
            ? { ok: true }
            : {
                ok: false,
                error: probeBody.error?.message || `HTTP ${probeRes.status}`,
              };
        } catch (error) {
          pageTokenProbe = {
            ok: false,
            error: error instanceof Error ? error.message : 'probe failed',
          };
        }
      }

      results.push({
        igUsername: account.igUsername,
        igUserId: account.igUserId,
        storedPageId: account.facebookPageId,
        resolvedPageId: resolved.pageId,
        pageTokenResolved: resolved.accessToken !== accessToken,
        pageTokenProbe,
        tokenPrefix: accessToken.slice(0, 3),
        tokenValid,
        tokenType,
        scopes,
        granular,
        missingPageScopes,
        hasPagesMessaging: scopes.includes('pages_messaging'),
        hasPagesShowList: scopes.includes('pages_show_list'),
        meAccountsCount: Array.isArray(accountsBody.data) ? accountsBody.data.length : 0,
        meAccountsError: accountsBody.error?.message || null,
        lastSyncAt: account.lastSyncAt,
        readyForFollowCheck:
          Boolean(resolved.pageId && resolved.accessToken !== accessToken) ||
          Boolean(pageTokenProbe?.ok) ||
          accessToken.startsWith('IG'),
        readyForPrivateReply: Boolean(resolved.pageId) || accessToken.startsWith('IG'),
      });
    }

    const needsFollowFix = results.some((item) => !item.readyForFollowCheck);
    return NextResponse.json({
      ok: results.every((item) => item.readyForFollowCheck),
      configId: config?.configId || null,
      results,
      hint: needsFollowFix
        ? 'Follow check precisa de Page access token. Comentário/DM podem funcionar sem Page; is_user_follow_business não. No token atual faltam scopes de Page (veja missingPageScopes). Na Login Configuration do configId abaixo inclua pages_show_list, pages_read_engagement, pages_manage_metadata (+ business_management). Remova o app em facebook.com/settings?tab=business_tools, reconecte escolhendo a Página + o @IG, e rode este endpoint de novo até readyForFollowCheck=true.'
        : 'Page token OK — reteste o botão Já segui no DM.',
    });
  } catch (error) {
    console.error('diagnose-messaging failed', error);
    return NextResponse.json({ error: 'Falha no diagnóstico' }, { status: 500 });
  }
}
