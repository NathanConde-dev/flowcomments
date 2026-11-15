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
      if (config?.appId && config?.appSecret) {
        try {
          const debug = await debugToken(accessToken, `${config.appId}|${config.appSecret}`);
          scopes = debug.data?.scopes || [];
          tokenValid = debug.data?.is_valid;
        } catch {
          /* ignore */
        }
      }

      const accountsRes = await fetch(
        `${GRAPH_API_BASE}/me/accounts?fields=id,name,instagram_business_account{id}&limit=100&access_token=${encodeURIComponent(accessToken)}`
      );
      const accountsBody = await accountsRes.json().catch(() => ({}));

      results.push({
        igUsername: account.igUsername,
        igUserId: account.igUserId,
        storedPageId: account.facebookPageId,
        resolvedPageId: resolved.pageId,
        pageTokenResolved: resolved.accessToken !== accessToken,
        tokenPrefix: accessToken.slice(0, 3),
        tokenValid,
        scopes,
        hasPagesMessaging: scopes.includes('pages_messaging'),
        hasPagesShowList: scopes.includes('pages_show_list'),
        meAccountsCount: Array.isArray(accountsBody.data) ? accountsBody.data.length : 0,
        meAccountsError: accountsBody.error?.message || null,
        lastSyncAt: account.lastSyncAt,
        readyForPrivateReply: Boolean(resolved.pageId) || accessToken.startsWith('IG'),
      });
    }

    return NextResponse.json({
      ok: results.every((item) => item.readyForPrivateReply),
      results,
      hint: results.some((item) => !item.readyForPrivateReply)
        ? 'Sem Page ID: no Meta adicione pages_messaging na Login Configuration, reconecte o Instagram com a conta Facebook admin da Page ligada ao @IG, e abra este endpoint de novo.'
        : 'Page OK — comente com outra conta para testar o DM.',
    });
  } catch (error) {
    console.error('diagnose-messaging failed', error);
    return NextResponse.json({ error: 'Falha no diagnóstico' }, { status: 500 });
  }
}
