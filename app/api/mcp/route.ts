import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import crypto from 'crypto';

// MCP Server implementation for AI setup assistance
// Spec: https://modelcontextprotocol.io/

interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

// Verify MCP token from SystemConfig
async function verifyMCPToken(token: string): Promise<boolean> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: 'MCP_TOKEN_HASH' },
    });
    
    if (!config) return false;
    
    const hash = crypto.createHash('sha256').update(token).digest('hex');
    return hash === config.value;
  } catch {
    return false;
  }
}

async function getSetupStatus() {
  const [adminExists, metaConfigExists, igAccountExists] = await Promise.all([
    prisma.user.count({ where: { isAdmin: true } }),
    prisma.systemConfig.findFirst({
      where: {
        key: { in: ['META_APP_ID', 'META_APP_SECRET'] },
      },
    }),
    prisma.instagramAccount.count({ where: { isActive: true } }),
  ]);

  return {
    adminCreated: adminExists > 0,
    metaConfigured: !!metaConfigExists,
    instagramConnected: igAccountExists > 0,
  };
}

async function handleMCPRequest(req: MCPRequest): Promise<MCPResponse> {
  const { method, params } = req;

  switch (method) {
    case 'tools/list':
      return {
        jsonrpc: '2.0',
        id: req.id,
        result: {
          tools: [
            {
              name: 'get_setup_guide',
              description: 'Retorna o guia completo de configuração do Meta App',
              inputSchema: {
                type: 'object',
                properties: {},
              },
            },
            {
              name: 'get_instance_urls',
              description: 'Retorna as URLs desta instância (webhook, OAuth redirect)',
              inputSchema: {
                type: 'object',
                properties: {},
              },
            },
            {
              name: 'check_setup_status',
              description: 'Verifica quais etapas do setup foram concluídas',
              inputSchema: {
                type: 'object',
                properties: {},
              },
            },
            {
              name: 'explain_error',
              description: 'Explica um erro e fornece a solução',
              inputSchema: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    description: 'A mensagem de erro',
                  },
                },
                required: ['message'],
              },
            },
          ],
        },
      };

    case 'tools/call':
      const toolName = params?.name;
      
      if (toolName === 'get_setup_guide') {
        const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://seu-dominio.com';
        const guide = `# Guia de Setup do Flowcomments

## URLs da Sua Instância
- Aplicação: ${baseUrl}
- Webhook: ${baseUrl}/api/webhook
- OAuth Redirect: ${baseUrl}/api/instagram/callback

## Passo 1: Criar App no Meta
1. Acesse https://developers.facebook.com/apps/
2. Clique em "Criar App"
3. Escolha tipo: "Business"
4. Preencha nome e email de contato

## Passo 2: Adicionar Produtos
Adicione estes produtos ao seu app:
- Instagram (essencial)
- Facebook Login for Business (essencial)
- Webhooks (essencial)

## Passo 3: Configurar Facebook Login for Business
1. Vá em "Facebook Login for Business"
2. Clique em "Configurations"
3. Crie nova configuração:
   - Tipo: User access token
   - Permissões obrigatórias:
     * instagram_basic
     * instagram_manage_comments
     * instagram_manage_messages
     * pages_show_list
     * pages_read_engagement
     * pages_manage_metadata
     * business_management
4. Copie o Config ID

## Passo 4: Configurar OAuth Redirect
1. Em "Facebook Login for Business" > "Settings"
2. Adicione a URL: ${baseUrl}/api/instagram/callback
3. Salve

## Passo 5: Configurar Webhook
1. Vá em "Webhooks" > "Instagram"
2. Callback URL: ${baseUrl}/api/webhook
3. Verify Token: (crie um token aleatório seguro)
4. Inscreva-se nos campos:
   - comments
   - messages
   - mentions
5. Salve o token - vai precisar dele no Flowcomments!

## Passo 6: Obter Credenciais
1. Settings > Basic:
   - Copie o App ID
   - Clique em "Mostrar" no App Secret e copie

## Armadilhas Importantes
⚠️ App e Instagram no mesmo portfolio = token sem IG
✓ Solução: Selecionar explicitamente Página + IG no login

⚠️ Webhook verify token deve ser IDÊNTICO
✓ Solução: Usar copiar/colar

⚠️ Instagram deve ser conta Profissional
✓ Converter no app do Instagram

⚠️ Modo desenvolvimento = só testadores conseguem login
✓ Adicionar usuário como testador no app Meta
`;
        
        return {
          jsonrpc: '2.0',
          id: req.id,
          result: {
            content: [
              {
                type: 'text',
                text: guide,
              },
            ],
          },
        };
      }

      if (toolName === 'get_instance_urls') {
        const baseUrl = process.env.NEXT_PUBLIC_URL || 'https://seu-dominio.com';
        return {
          jsonrpc: '2.0',
          id: req.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  appUrl: baseUrl,
                  webhookUrl: `${baseUrl}/api/webhook`,
                  oauthRedirectUrl: `${baseUrl}/api/instagram/callback`,
                }, null, 2),
              },
            ],
          },
        };
      }

      if (toolName === 'check_setup_status') {
        const status = await getSetupStatus();
        return {
          jsonrpc: '2.0',
          id: req.id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(status, null, 2),
              },
            ],
          },
        };
      }

      if (toolName === 'explain_error') {
        const errorMessage = params?.arguments?.message || '';
        const explanations: Record<string, string> = {
          'Invalid OAuth access token': 
            '❌ Token OAuth inválido\n\n' +
            'Causas possíveis:\n' +
            '1. Token expirou (tokens de usuário expiram em 60 dias)\n' +
            '2. Permissões insuficientes\n' +
            '3. App em modo desenvolvimento e usuário não é testador\n\n' +
            'Solução:\n' +
            '1. Reconectar a conta do Instagram\n' +
            '2. Verificar se todas as permissões foram concedidas\n' +
            '3. Se em dev mode, adicionar usuário como testador no app Meta',
          
          'Instagram account not found':
            '❌ Conta Instagram não encontrada no token\n\n' +
            'Causa: App e Instagram no mesmo Business Portfolio\n\n' +
            'Solução:\n' +
            '1. Desconecte a conta atual\n' +
            '2. No diálogo de login OAuth, SELECIONE EXPLICITAMENTE:\n' +
            '   - A Página do Facebook\n' +
            '   - A conta do Instagram\n' +
            '3. Não confie na seleção automática',
          
          'Webhook verification failed':
            '❌ Verificação do webhook falhou\n\n' +
            'Causa: Verify Token diferente entre Flowcomments e Meta\n\n' +
            'Solução:\n' +
            '1. Copie o token do Flowcomments\n' +
            '2. Cole exatamente no Meta (sem espaços extras)\n' +
            '3. Verifique se salvou corretamente em ambos os lugares',
        };

        let explanation = 'Erro desconhecido. Por favor, forneça mais detalhes.';
        
        for (const [key, value] of Object.entries(explanations)) {
          if (errorMessage.toLowerCase().includes(key.toLowerCase())) {
            explanation = value;
            break;
          }
        }

        return {
          jsonrpc: '2.0',
          id: req.id,
          result: {
            content: [
              {
                type: 'text',
                text: explanation,
              },
            ],
          },
        };
      }

      return {
        jsonrpc: '2.0',
        id: req.id,
        error: {
          code: -32601,
          message: 'Method not found',
        },
      };

    default:
      return {
        jsonrpc: '2.0',
        id: req.id,
        error: {
          code: -32601,
          message: 'Method not found',
        },
      };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check auth
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const isValid = await verifyMCPToken(token);
    
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid MCP token' },
        { status: 401 }
      );
    }

    const body: MCPRequest = await request.json();
    const response = await handleMCPRequest(body);
    
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal error',
        },
      },
      { status: 500 }
    );
  }
}

// OPTIONS for CORS preflight
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
