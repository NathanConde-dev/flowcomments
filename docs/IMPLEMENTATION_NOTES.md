# Flowcomments v0.1 - Notas de Implementação

## ✅ O Que Foi Implementado

### Core Completo
- ✅ Setup wizard (cria admin + configura Meta App)
- ✅ Autenticação com senha (sem email provider)
- ✅ Dashboard funcional
- ✅ CRUD de automações (lista + builder)
- ✅ Engine de automações (keyword matching + ações)
- ✅ Webhook endpoint (verifica + processa eventos)
- ✅ Queue system (BullMQ com Redis opcional)
- ✅ Gerenciamento de contatos e inbox
- ✅ Configurações com diagnósticos
- ✅ Licença Sustainable Use + página explicativa
- ✅ Deploy-ready (Docker, Railway, VPS)

### Estrutura de Dados
- Prisma schema completo com todos os modelos necessários
- Migrações preparadas (criar na primeira execução)

### Qualidade
- TypeScript + linting configurado e passando
- Testes unitários para automation engine e webhook
- README completo em pt-BR

## ✅ P0 COMPLETO - Fluxo OAuth do Instagram

### Implementado em 100%:

#### ✅ a) OAuth Connect (`app/api/instagram/connect/route.ts`)
- Gera URL do Facebook Login com todos os scopes
- Usa config_id do setup wizard
- CSRF protection com state token
- Redireciona usuário para Meta

#### ✅ b) OAuth Callback (`app/api/instagram/callback/route.ts`)
- Recebe e valida code + state (CSRF check)
- Troca code por short-lived token
- Converte para long-lived token (60 dias)
- Descobre contas via:
  - `/me/assigned_instagram_accounts`
  - `/me/accounts` + `instagram_business_account`
- Salva tokens encrypted no banco
- Subscreve webhook automaticamente
- Suporta múltiplas contas com página de escolha

#### ✅ c) UI Completa (`app/settings/page.tsx`)
- Botão "Conectar Instagram" funcional
- Loading states
- Mensagens de erro claras com hints em pt-BR
- Botão "Testar Credenciais" antes de conectar
- Fallback: conexão manual com token
- Lista de contas conectadas
- Botão desconectar

#### ✅ d) Fallback Manual (`app/api/instagram/manual-connect/route.ts`)
- Conectar com system-user ou long-lived token
- Validação via Graph API
- Mesmo fluxo de salvamento

#### ✅ e) Desconectar Conta (`app/api/instagram/disconnect/route.ts`)
- Marca `isActive = false`
- Confirmação na UI
- Preserva token para possível reativação

### ⚠️ Ainda Por Implementar (P1):

#### d) Renovação Automática de Tokens
Instagram Business tokens expiram (60 dias). Implementar:
- Cron job ou background task para renovar tokens próximos do vencimento
- Endpoint: `GET /{ig-user-id}?fields=access_token&grant_type=ig_refresh_token`
- Atualizar `accessToken` e `tokenExpiresAt` no banco

### 2. Melhorias de UX

#### a) Loading states
- Adicionar spinners/skeletons em:
  - Setup wizard (durante criação de admin)
  - Login
  - Lista de automações
  - Dashboard stats

#### b) Mensagens de erro amigáveis
- Toast notifications ou alerts
- Traduzir erros do Meta Graph API para pt-BR

#### c) Confirmações
- "Tem certeza?" ao desativar automação
- Ao desconectar conta do Instagram

### 3. Validações e Edge Cases

#### a) No Setup Wizard
- Validar formato do Meta App ID (numérico)
- Validar que Webhook Token tem comprimento mínimo
- Testar conectividade com Meta durante setup?

#### b) No Automation Builder
- Validar que pelo menos uma ação foi configurada
- Preview da mensagem (como vai ficar)
- Limites de caracteres (DM do Instagram tem limite)

#### c) Rate Limiting
- Instagram API tem rate limits
- Implementar backoff exponencial
- Queue com retry automático (BullMQ já tem isso)

### 4. Features Adicionais (Opcional para v0.1)

#### a) Editar Automação
Atualmente só tem "criar". Adicionar:
- `app/automations/[id]/page.tsx` para editar
- Formulário pré-populado
- Botão de salvar que faz PATCH em `/api/automations/[id]`

#### b) Pausar/Reativar Automação
- Botão toggle na lista
- API endpoint que muda `isActive`

#### c) Ver Execuções de uma Automação
- Link para ver histórico de execuções
- Filtrar por status (success/failed)
- Ver erro quando falhou

#### d) Inbox Funcional
Atualmente é só lista. Implementar:
- Click em conversa abre modal/página
- Mostrar mensagens (formato chat)
- Responder manualmente via input
- API para enviar mensagem

### 5. Testes E2E

Criar testes com Playwright:
- Setup wizard flow completo
- Login
- Criar automação
- Simular webhook chegando (mock)
- Verificar que ação foi executada

### 6. Documentação Adicional

#### a) Wiki no GitHub
- Como configurar Meta App passo-a-passo (com screenshots)
- Como conseguir aprovação de permissões do Instagram
- FAQ de erros comuns

#### b) Video Tutorial
- Screencast de setup completo
- Demonstração criando automação
- Testar com comentário real

## 🎯 Prioridade de Implementação

### P0 (Crítico - sem isso não funciona)
1. OAuth flow completo (`/api/instagram/connect` + `/api/instagram/callback`)
2. Listar contas do Instagram após OAuth
3. Salvar tokens no banco
4. Botão "Conectar Instagram" funcional na UI

### P1 (Importante para v0.1)
5. Editar automação existente
6. Pausar/reativar automação
7. Renovação automática de tokens
8. Loading states e error handling melhorados

### P2 (Nice to have)
9. Inbox funcional (enviar mensagens manuais)
10. Ver histórico de execuções
11. Analytics dashboard com gráficos
12. Testes E2E

## 📝 Referências Úteis

### Meta Graph API
- [Instagram API Docs](https://developers.facebook.com/docs/instagram-api)
- [Facebook Login](https://developers.facebook.com/docs/facebook-login/web)
- [Webhooks](https://developers.facebook.com/docs/graph-api/webhooks)

### OAuth Flow
Inspirar-se em `openreply` (referência apenas, não copiar):
- Como montar URL do Facebook Login
- Como trocar code por token
- Como buscar contas via Graph API

### Debugging
- Usar [Graph API Explorer](https://developers.facebook.com/tools/explorer/) para testar endpoints
- Access Token Debugger para ver scopes e validade do token
- Webhook Tester para simular eventos

## 🐛 Issues Conhecidos

1. **Worker sem Redis**: Se REDIS_URL não for definido, o worker vai crashar ao tentar conectar. Adicionar:
   ```typescript
   if (!process.env.REDIS_URL) {
     console.log('REDIS_URL not set, skipping worker startup');
     process.exit(0);
   }
   ```

2. **Prisma migrations**: Na primeira execução precisa rodar `npx prisma migrate dev` ou `npx prisma db push`. O Dockerfile já faz `prisma migrate deploy`.

3. **ENCRYPTION_KEY**: Se não definido, algumas operações vão falhar. Considerar gerar automaticamente na primeira execução se não existir.

---

**Status**: MVP funcional, mas requer implementação do OAuth do Instagram para conectar contas reais.

**Próximo passo crítico**: Implementar `/api/instagram/connect` e `/api/instagram/callback`.
