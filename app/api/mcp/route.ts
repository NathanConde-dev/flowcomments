import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { decrypt } from '@/lib/crypto/encryption';
import {
  checkRateLimit,
  clientIpFromRequest,
  sha256Hex,
  timingSafeEqualString,
} from '@/lib/crypto/security';

// MCP Server - Spec-compliant Streamable HTTP implementation
// Spec: https://spec.modelcontextprotocol.io/specification/2025-06-18/server/http/

interface MCPRequest {
  jsonrpc: '2.0';
  id?: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id?: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

async function verifyMCPToken(token: string): Promise<boolean> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'MCP_TOKEN_HASH' },
    });

    if (!config?.value) return false;

    const hash = sha256Hex(token);
    return timingSafeEqualString(hash, config.value);
  } catch {
    return false;
  }
}

async function testMetaCredentials(): Promise<{ valid: boolean; error?: string; hint?: string }> {
  try {
    const [appIdConfig, secretConfig] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'META_APP_ID' } }),
      prisma.systemConfig.findUnique({ where: { key: 'META_APP_SECRET' } }),
    ]);

    if (!appIdConfig || !secretConfig) {
      return {
        valid: false,
        error: 'Credenciais não configuradas',
        hint: 'Configure App ID e App Secret em Settings',
      };
    }

    const appSecret = secretConfig.encrypted
      ? decrypt(secretConfig.value)
      : secretConfig.value;

    // Test with client_credentials flow
    const response = await fetch(
      `https://graph.facebook.com/oauth/access_token?client_id=${appIdConfig.value}&client_secret=${appSecret}&grant_type=client_credentials`,
      { method: 'GET' }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        valid: false,
        error: error.error?.message || 'Credenciais inválidas',
        hint: 'Verifique se o App ID e App Secret estão corretos no Meta for Developers',
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Erro ao testar credenciais',
      hint: 'Verifique sua conexão de internet',
    };
  }
}

async function getSetupStatus() {
  try {
    const [adminCount, metaAppId, metaSecret, configId, webhookToken, igAccounts, webhookEvents] = await Promise.all([
      prisma.user.count({ where: { isAdmin: true } }),
      prisma.systemConfig.findUnique({ where: { key: 'META_APP_ID' } }),
      prisma.systemConfig.findUnique({ where: { key: 'META_APP_SECRET' } }),
      prisma.systemConfig.findUnique({ where: { key: 'META_CONFIG_ID' } }),
      prisma.systemConfig.findUnique({ where: { key: 'WEBHOOK_VERIFY_TOKEN' } }),
      prisma.instagramAccount.findMany({ 
        where: { isActive: true },
        select: {
          id: true,
          igUsername: true,
          tokenExpiresAt: true,
        },
      }),
      prisma.webhookEvent.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    // Test credentials
    const credentialsTest = metaAppId && metaSecret ? await testMetaCredentials() : { valid: false };

    return {
      adminCreated: adminCount > 0,
      metaAppIdSaved: !!metaAppId,
      metaAppSecretSaved: !!metaSecret,
      credentialsValid: credentialsTest.valid,
      configIdSaved: !!configId,
      webhookVerifyTokenSaved: !!webhookToken,
      lastWebhookEventAt: webhookEvents?.createdAt?.toISOString() || null,
      instagramAccounts: igAccounts.map(acc => ({
        username: acc.igUsername,
        tokenExpiresAt: acc.tokenExpiresAt?.toISOString() || null,
        expiresInDays: acc.tokenExpiresAt 
          ? Math.floor((acc.tokenExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null,
      })),
    };
  } catch (error) {
    throw new Error('Failed to check setup status');
  }
}

async function handleMCPMethod(method: string, params?: any): Promise<any> {
  switch (method) {
    case 'initialize':
      return {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: 'flowcomments',
          version: '0.1.0',
        },
      };

    case 'ping':
      return {};

    case 'tools/list':
      return {
        tools: [
          {
            name: 'get_setup_guide',
            description: 'Retorna o guia completo de configuração do Meta App com URLs desta instância',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'get_instance_urls',
            description: 'Retorna as URLs desta instância (webhook, OAuth redirect, etc.)',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'check_setup_status',
            description: 'Verifica o status completo do setup: admin, credenciais Meta, webhook, Instagram conectado',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'test_meta_credentials',
            description: 'Testa se as credenciais Meta (App ID/Secret) são válidas',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'explain_error',
            description: 'Explica um erro específico e fornece solução em português',
            inputSchema: {
              type: 'object',
              properties: {
                message: {
                  type: 'string',
                  description: 'A mensagem de erro para explicar',
                },
              },
              required: ['message'],
            },
          },
        ],
      };

    case 'tools/call':
      const toolName = params?.name;
      const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://seu-dominio.com';

      if (toolName === 'get_setup_guide') {
        const guide = `# Guia de Setup do Flowcomments

## URLs da Sua Instância
- Aplicação: ${baseUrl}
- Webhook: ${baseUrl}/api/webhook
- OAuth Redirect: ${baseUrl}/api/instagram/callback

## Passo 1: Criar App no Meta
1. Acesse https://developers.facebook.com/apps/
2. Clique em "Criar App"
3. Escolha tipo: **Business**
4. Preencha nome e email

## Passo 2: Adicionar Produtos
- Instagram
- Facebook Login for Business
- Webhooks

## Passo 3: Configurar OAuth
Em "Facebook Login for Business" > "Settings":
- Adicione Valid OAuth Redirect URI: ${baseUrl}/api/instagram/callback

## Passo 4: Criar Configuration
Em "Facebook Login for Business" > "Configurations":
- Tipo: User access token
- Permissões: instagram_basic, instagram_manage_comments, instagram_manage_messages, pages_show_list, pages_read_engagement, pages_manage_metadata, business_management

## Passo 5: Webhook
Em "Webhooks" > "Instagram":
- Callback URL: ${baseUrl}/api/webhook
- Verify Token: (mesmo token do Flowcomments)
- Campos: comments, messages, mentions`;

        return {
          content: [{ type: 'text', text: guide }],
        };
      }

      if (toolName === 'get_instance_urls') {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              appUrl: baseUrl,
              webhookUrl: `${baseUrl}/api/webhook`,
              oauthRedirectUrl: `${baseUrl}/api/instagram/callback`,
            }, null, 2),
          }],
        };
      }

      if (toolName === 'check_setup_status') {
        const status = await getSetupStatus();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(status, null, 2),
          }],
        };
      }

      if (toolName === 'test_meta_credentials') {
        const result = await testMetaCredentials();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2),
          }],
        };
      }

      if (toolName === 'explain_error') {
        const errorMessage = params?.arguments?.message || '';
        const explanations: Record<string, string> = {
          'invalid oauth access token':
            '❌ Token OAuth inválido\n\nCausas:\n1. Token expirou\n2. Permissões insuficientes\n3. App em dev mode\n\nSolução: Reconectar Instagram em Settings',
          'instagram account not found':
            '❌ Conta Instagram não encontrada\n\nCausa: Portfolio trap\n\nSolução: No login OAuth, selecionar EXPLICITAMENTE Página + Instagram',
          'webhook verification failed':
            '❌ Webhook inválido\n\nCausa: Tokens diferentes\n\nSolução: Copiar token do Flowcomments para o Meta',
        };

        let explanation = 'Erro desconhecido. Forneça mais detalhes.';
        for (const [key, value] of Object.entries(explanations)) {
          if (errorMessage.toLowerCase().includes(key)) {
            explanation = value;
            break;
          }
        }

        return {
          content: [{ type: 'text', text: explanation }],
        };
      }

      throw { code: -32601, message: 'Tool not found' };

    default:
      throw { code: -32601, message: 'Method not found' };
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = clientIpFromRequest(request);
    const rate = checkRateLimit(`mcp:${ip}`, 60, 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': String(rate.retryAfterSec) },
        }
      );
    }

    // Check authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing or invalid authorization' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="Flowcomments MCP"',
          },
        }
      );
    }

    const token = authHeader.substring(7);
    const isValid = await verifyMCPToken(token);

    if (!isValid) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid token' }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer realm="Flowcomments MCP"',
          },
        }
      );
    }

    const body: MCPRequest = await request.json();

    // Handle notifications/initialized - return 202 with no body
    if (body.method === 'notifications/initialized') {
      return new NextResponse(null, { status: 202 });
    }

    // Handle regular methods
    const result = await handleMCPMethod(body.method, body.params);
    
    const response: MCPResponse = {
      jsonrpc: '2.0',
      id: body.id,
      result,
    };
    
    return NextResponse.json(response);
  } catch (error: any) {
    const response: MCPResponse = {
      jsonrpc: '2.0',
      error: {
        code: error.code || -32603,
        message: error.message || 'Internal error',
        data: error.data,
      },
    };
    
    return NextResponse.json(response);
  }
}

export async function GET() {
  return new NextResponse('Method Not Allowed', { status: 405 });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
