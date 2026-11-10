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

export function buildOAuthURL(redirectUri: string, state: string, configId?: string): string {
  const baseUrl = 'https://www.facebook.com/v21.0/dialog/oauth';
  
  const params = new URLSearchParams({
    client_id: configId || '',
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

  if (configId) {
    params.append('config_id', configId);
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

  return data;
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
}

export async function discoverInstagramAccounts(accessToken: string): Promise<InstagramAccountInfo[]> {
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

  return accounts;
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

export async function subscribePageToWebhooks(
  pageId: string,
  pageAccessToken: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${GRAPH_API_BASE}/${pageId}/subscribed_apps`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscribed_fields: ['messages', 'messaging_postbacks', 'messaging_optins', 'message_deliveries'],
          access_token: pageAccessToken,
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error('Error subscribing page to webhooks:', error);
    return false;
  }
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
