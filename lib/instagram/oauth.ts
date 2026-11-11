import { prisma } from '@/lib/db/client';
import { decrypt } from '@/lib/crypto/encryption';

const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

export interface MetaConfig {
  appId: string;
  appSecret: string;
  configId?: string;
  webhookVerifyToken: string;
}

export async function getMetaConfig(): Promise<MetaConfig | null> {
  try {
    const [appIdConfig, appSecretConfig, configIdConfig, webhookTokenConfig] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'META_APP_ID' } }),
      prisma.systemConfig.findUnique({ where: { key: 'META_APP_SECRET' } }),
      prisma.systemConfig.findUnique({ where: { key: 'META_CONFIG_ID' } }),
      prisma.systemConfig.findUnique({ where: { key: 'WEBHOOK_VERIFY_TOKEN' } }),
    ]);

    if (!appIdConfig || !appSecretConfig || !webhookTokenConfig) {
      return null;
    }

    return {
      appId: appIdConfig.value,
      appSecret: appSecretConfig.encrypted ? decrypt(appSecretConfig.value) : appSecretConfig.value,
      configId: configIdConfig?.value,
      webhookVerifyToken: webhookTokenConfig.encrypted
        ? decrypt(webhookTokenConfig.value)
        : webhookTokenConfig.value,
    };
  } catch (error) {
    console.error('Error getting Meta config:', error);
    return null;
  }
}

export function buildOAuthURL(
  redirectUri: string,
  state: string,
  appId: string,
  configId?: string
): string {
  const baseUrl = 'https://www.facebook.com/v21.0/dialog/oauth';

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: [
      'instagram_basic',
      'instagram_manage_comments',
      'instagram_manage_messages',
      'pages_show_list',
      'pages_read_engagement',
      'business_management',
    ].join(','),
    response_type: 'code',
  });

  // Facebook Login for Business requires the Login Configuration ID (not the App ID).
  if (configId) {
    params.set('config_id', configId);
  }

  return `${baseUrl}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string,
  redirectUri: string,
  appId: string,
  appSecret: string
): Promise<{ access_token: string; token_type: string }> {
  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`);
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || 'Failed to exchange code for token');
  }

  return data;
}

/** Meta long-lived user tokens are typically ~60 days when expires_in is omitted. */
export const DEFAULT_LONG_LIVED_TOKEN_SECONDS = 60 * 24 * 60 * 60;

export function resolveTokenExpiresAt(expiresInSeconds?: number | null): Date {
  const seconds =
    typeof expiresInSeconds === 'number' &&
    Number.isFinite(expiresInSeconds) &&
    expiresInSeconds > 0
      ? expiresInSeconds
      : DEFAULT_LONG_LIVED_TOKEN_SECONDS;
  return new Date(Date.now() + seconds * 1000);
}

export async function getLongLivedToken(
  shortLivedToken: string,
  appId: string,
  appSecret: string
): Promise<{ access_token: string; expires_in: number }> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`);
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || 'Failed to get long-lived token');
  }

  if (!data?.access_token) {
    throw new Error('Long-lived token response missing access_token');
  }

  const expiresIn =
    typeof data.expires_in === 'number' && Number.isFinite(data.expires_in) && data.expires_in > 0
      ? data.expires_in
      : DEFAULT_LONG_LIVED_TOKEN_SECONDS;

  return {
    access_token: data.access_token,
    expires_in: expiresIn,
  };
}

export async function debugToken(
  inputToken: string,
  appToken: string
): Promise<{
  data: {
    app_id: string;
    is_valid: boolean;
    scopes: string[];
    user_id: string;
    granular_scopes?: Array<{ scope: string; target_ids?: string[] }>;
  };
}> {
  const params = new URLSearchParams({
    input_token: inputToken,
    access_token: appToken,
  });

  const response = await fetch(`${GRAPH_API_BASE}/debug_token?${params.toString()}`);
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error?.message || 'Failed to debug token');
  }

  return data;
}

export interface InstagramAccountInfo {
  id: string;
  username: string;
  name?: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  biography?: string;
  website?: string;
  ig_id?: number;
  pageId?: string;
  pageAccessToken?: string;
}

export async function discoverInstagramAccounts(
  accessToken: string,
  appId: string,
  appSecret: string
): Promise<InstagramAccountInfo[]> {
  const accounts: InstagramAccountInfo[] = [];
  const seenIds = new Set<string>();

  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/me/assigned_instagram_accounts?access_token=${accessToken}`
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        for (const account of data.data) {
          if (account.id && !seenIds.has(account.id)) {
            const details = await getInstagramAccountDetails(account.id, accessToken);
            if (details) {
              accounts.push(details);
              seenIds.add(account.id);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error getting assigned_instagram_accounts:', error);
  }

  try {
    const appToken = `${appId}|${appSecret}`;
    const debugData = await debugToken(accessToken, appToken);
    
    if (debugData.data.granular_scopes) {
      for (const scopeObj of debugData.data.granular_scopes) {
        if (
          scopeObj.target_ids &&
          (scopeObj.scope.includes('instagram_') || scopeObj.scope.includes('pages_'))
        ) {
          for (const targetId of scopeObj.target_ids) {
            if (!seenIds.has(targetId)) {
              const details = await getInstagramAccountDetails(targetId, accessToken);
              if (details) {
                accounts.push(details);
                seenIds.add(targetId);
              } else {
                const pageDetails = await getPageInstagramAccount(targetId, accessToken);
                if (pageDetails && !seenIds.has(pageDetails.id)) {
                  accounts.push(pageDetails);
                  seenIds.add(pageDetails.id);
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error discovering via debug_token:', error);
  }

  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/me/accounts?fields=instagram_business_account,access_token&access_token=${accessToken}`
    );
    
    if (response.ok) {
      const data = await response.json();
      if (data.data && Array.isArray(data.data)) {
        for (const page of data.data) {
          if (page.instagram_business_account?.id && !seenIds.has(page.instagram_business_account.id)) {
            const pageToken = page.access_token || accessToken;
            const details = await getInstagramAccountDetails(
              page.instagram_business_account.id,
              pageToken
            );
            if (details) {
              accounts.push({
                ...details,
                pageId: page.id,
                pageAccessToken: page.access_token,
              } as any);
              seenIds.add(page.instagram_business_account.id);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error getting pages with instagram_business_account:', error);
  }

  try {
    const businessResponse = await fetch(
      `${GRAPH_API_BASE}/me/businesses?fields=id&access_token=${accessToken}`
    );
    
    if (businessResponse.ok) {
      const businessData = await businessResponse.json();
      if (businessData.data && Array.isArray(businessData.data)) {
        for (const business of businessData.data) {
          const ownedResponse = await fetch(
            `${GRAPH_API_BASE}/${business.id}/owned_instagram_accounts?access_token=${accessToken}`
          );
          
          if (ownedResponse.ok) {
            const ownedData = await ownedResponse.json();
            if (ownedData.data) {
              for (const account of ownedData.data) {
                if (account.id && !seenIds.has(account.id)) {
                  const details = await getInstagramAccountDetails(account.id, accessToken);
                  if (details) {
                    accounts.push(details);
                    seenIds.add(account.id);
                  }
                }
              }
            }
          }

          const clientResponse = await fetch(
            `${GRAPH_API_BASE}/${business.id}/client_instagram_accounts?access_token=${accessToken}`
          );
          
          if (clientResponse.ok) {
            const clientData = await clientResponse.json();
            if (clientData.data) {
              for (const account of clientData.data) {
                if (account.id && !seenIds.has(account.id)) {
                  const details = await getInstagramAccountDetails(account.id, accessToken);
                  if (details) {
                    accounts.push(details);
                    seenIds.add(account.id);
                  }
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error getting business owned/client accounts:', error);
  }

  return accounts;
}

async function getPageInstagramAccount(
  pageId: string,
  accessToken: string
): Promise<InstagramAccountInfo | null> {
  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/${pageId}?fields=instagram_business_account&access_token=${accessToken}`
    );
    
    if (!response.ok) return null;
    
    const data = await response.json();
    if (data.instagram_business_account?.id) {
      return getInstagramAccountDetails(data.instagram_business_account.id, accessToken);
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

async function getInstagramAccountDetails(
  igAccountId: string,
  accessToken: string
): Promise<InstagramAccountInfo | null> {
  try {
    const fields = [
      'id',
      'username',
      'name',
      'profile_picture_url',
      'followers_count',
      'follows_count',
      'media_count',
      'biography',
      'website',
      'ig_id',
    ].join(',');

    const response = await fetch(
      `${GRAPH_API_BASE}/${igAccountId}?fields=${fields}&access_token=${accessToken}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`Error getting details for IG account ${igAccountId}:`, error);
    return null;
  }
}

const IG_WEBHOOK_FIELDS = [
  'comments',
  'live_comments',
  'mentions',
  'messages',
  'messaging_postbacks',
  'messaging_seen',
  'messaging_optins',
  'message_reactions',
] as const;

const PAGE_WEBHOOK_FIELDS = [
  'messages',
  'messaging_postbacks',
  'messaging_optins',
  'message_deliveries',
  'feed',
] as const;

/** Subscribe the Instagram professional account — required for comment webhooks. */
export async function subscribeInstagramToWebhooks(
  igUserId: string,
  accessToken: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const params = new URLSearchParams({
      subscribed_fields: IG_WEBHOOK_FIELDS.join(','),
      access_token: accessToken,
    });
    const response = await fetch(
      `${GRAPH_API_BASE}/${igUserId}/subscribed_apps?${params.toString()}`,
      { method: 'POST' }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = data?.error?.message || `HTTP ${response.status}`;
      console.error('IG webhook subscribe failed', { igUserId, data });
      return { ok: false, error: message };
    }
    console.log('IG webhook subscribed', { igUserId, data });
    return { ok: true };
  } catch (error) {
    console.error('Error subscribing IG account to webhooks:', error);
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'subscribe failed',
    };
  }
}

export async function subscribePageToWebhooks(
  pageId: string,
  pageAccessToken: string
): Promise<boolean> {
  try {
    const response = await fetch(`${GRAPH_API_BASE}/${pageId}/subscribed_apps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscribed_fields: [...PAGE_WEBHOOK_FIELDS],
        access_token: pageAccessToken,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('Page webhook subscribe failed', { pageId, data });
      return false;
    }
    console.log('Page webhook subscribed', { pageId, data });
    return true;
  } catch (error) {
    console.error('Error subscribing page to webhooks:', error);
    return false;
  }
}

/** Best-effort: subscribe IG user + linked Facebook Page (if discoverable). */
export async function ensureWebhookSubscriptions(params: {
  igUserId: string;
  accessToken: string;
  pageId?: string;
  pageAccessToken?: string;
}): Promise<{ igOk: boolean; pageOk: boolean | null; error?: string }> {
  const ig = await subscribeInstagramToWebhooks(params.igUserId, params.accessToken);

  let pageId = params.pageId;
  let pageAccessToken = params.pageAccessToken;

  if (!pageId || !pageAccessToken) {
    try {
      const response = await fetch(
        `${GRAPH_API_BASE}/me/accounts?fields=instagram_business_account,access_token&access_token=${encodeURIComponent(params.accessToken)}`
      );
      if (response.ok) {
        const data = await response.json();
        const page = (data.data || []).find(
          (item: { instagram_business_account?: { id?: string } }) =>
            item.instagram_business_account?.id === params.igUserId
        );
        if (page?.id && page?.access_token) {
          pageId = page.id;
          pageAccessToken = page.access_token;
        }
      }
    } catch (error) {
      console.warn('Could not discover page for webhook subscribe:', error);
    }
  }

  let pageOk: boolean | null = null;
  if (pageId && pageAccessToken) {
    pageOk = await subscribePageToWebhooks(pageId, pageAccessToken);
  }

  return { igOk: ig.ok, pageOk, error: ig.error };
}

export async function testCredentials(appId: string, appSecret: string): Promise<{
  valid: boolean;
  error?: string;
  errorCode?: string;
}> {
  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&grant_type=client_credentials`
    );

    const data = await response.json();

    if (!response.ok || data.error) {
      return {
        valid: false,
        error: data.error?.message || 'Invalid credentials',
        errorCode: data.error?.code,
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

export function getErrorHintPtBR(error: string, code?: string): string {
  const errorLower = error.toLowerCase();

  if (errorLower.includes('client secret') || errorLower.includes('app secret')) {
    return 'App Secret incorreto. Verifique as credenciais no Meta for Developers.';
  }

  if (errorLower.includes('redirect_uri') || errorLower.includes('redirect uri')) {
    return 'URL de redirecionamento não configurada. Adicione a URL nas configurações OAuth do app no Meta.';
  }

  if (errorLower.includes('permission') || errorLower.includes('scope')) {
    return 'Permissões insuficientes. Solicite as permissões necessárias no App Review do Meta.';
  }

  if (errorLower.includes('development') || errorLower.includes('dev mode')) {
    return 'App em modo Development. Adicione seu usuário como testador ou coloque o app em modo Live.';
  }

  if (errorLower.includes('business portfolio') || errorLower.includes('business manager')) {
    return 'Conta do Instagram não está no mesmo Business Portfolio do app. Verifique no Business Manager.';
  }

  if (errorLower.includes('professional account') || errorLower.includes('business account')) {
    return 'A conta precisa ser Professional (Business ou Creator). Converta no app do Instagram.';
  }

  if (errorLower.includes('rate limit') || errorLower.includes('too many')) {
    return 'Limite de requisições atingido. Aguarde alguns minutos e tente novamente.';
  }

  if (code === '190' || code === '102') {
    return 'Token inválido ou expirado. Tente reconectar a conta.';
  }

  return 'Erro desconhecido. Verifique as configurações do app no Meta for Developers.';
}
