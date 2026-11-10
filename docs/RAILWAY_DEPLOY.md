# Deploy Flowcomments no Railway

## 🚀 Deploy One-Click

O Flowcomments está configurado para deploy simples no Railway com um único serviço que roda web + worker.

### Pré-requisitos
- Conta no Railway (https://railway.app)
- Repositório GitHub do Flowcomments

---

## 📦 Variáveis de Ambiente Obrigatórias

O Railway cria automaticamente um PostgreSQL quando você adiciona o serviço. Configure apenas estas variáveis:

### Essenciais (Railway Auto-Gera DATABASE_URL)

```bash
# Railway já fornece automaticamente:
DATABASE_URL=postgresql://...  # ✅ AUTO-GERADO pelo Railway

# Você precisa definir:
NEXT_PUBLIC_URL=https://seu-app.railway.app
```

### Opcionais

```bash
# Redis (opcional - se não definir, usa fallback in-process)
REDIS_URL=redis://...

# Encryption (se não definir, será auto-gerado e salvo no banco)
# ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Session (pode omitir, usará ENCRYPTION_KEY)
# SESSION_SECRET=seu-secret-aqui-minimo-32-caracteres

# Meta API Version (opcional, padrão v21.0)
# META_GRAPH_API_VERSION=v21.0

# Worker (opcional, padrão true - define false para separar worker)
# RUN_WORKER=true
```

---

## 🔧 Passo a Passo

### 1. Criar Projeto no Railway

1. Acesse https://railway.app
2. Clique em "New Project"
3. Selecione "Deploy from GitHub repo"
4. Escolha `NathanConde-dev/flowcomments`
5. Railway detecta automaticamente o Dockerfile

### 2. Adicionar PostgreSQL

1. No projeto, clique em "+ New"
2. Selecione "Database" → "PostgreSQL"
3. Railway criará a variável `DATABASE_URL` automaticamente

### 3. Configurar Variáveis

No serviço Flowcomments:
1. Vá em "Variables"
2. Adicione:
   ```
   NEXT_PUBLIC_URL = https://seu-app.railway.app
   ```
3. (Opcional) Adicione REDIS_URL se quiser usar Redis separado

### 4. Deploy

1. Railway faz deploy automaticamente
2. Aguarde build completar (~3-5 minutos)
3. O healthcheck em `/api/health` confirma que está rodando

### 5. Obter URL Pública

1. No serviço, vá em "Settings"
2. Clique em "Generate Domain"
3. Copie a URL (ex: `flowcomments-production.up.railway.app`)
4. Volte em "Variables" e atualize `NEXT_PUBLIC_URL` com a URL real

### 6. Setup Inicial

1. Acesse sua URL do Railway
2. Complete o setup wizard:
   - Criar conta admin
   - Configurar Meta App ID, Secret, Config ID, Webhook Token
3. Configure webhook no Meta for Developers com a URL:
   ```
   https://seu-app.railway.app/api/webhook
   ```

---

## 🏗️ Arquitetura do Deploy

### Single Service Mode (Padrão)

```
┌─────────────────────────────┐
│   Flowcomments Container    │
│                             │
│  ┌──────────────────────┐  │
│  │   Next.js Web App    │  │
│  │   (Port $PORT)       │  │
│  └──────────────────────┘  │
│                             │
│  ┌──────────────────────┐  │
│  │   Worker Process     │  │
│  │   (Background)       │  │
│  └──────────────────────┘  │
│                             │
│  Migrations run on start   │
└─────────────────────────────┘
          │
          ├─────► PostgreSQL (Railway)
          └─────► Redis (opcional)
```

### Split Mode (Avançado)

Para escalar worker separadamente:

1. **Serviço Web**:
   ```bash
   RUN_WORKER=false
   ```

2. **Serviço Worker** (novo serviço):
   - Mesma imagem/repo
   - Start command: `node -r tsx/register worker/index.ts`
   - Requer REDIS_URL

---

## 🔍 Healthcheck

O Railway verifica automaticamente:
- **Endpoint**: `/api/health`
- **Timeout**: 100 segundos
- **Resposta esperada**: 200 OK

```json
{
  "status": "healthy",
  "timestamp": "2026-11-10T12:00:00.000Z",
  "service": "flowcomments",
  "version": "0.1.0"
}
```

---

## 🐛 Troubleshooting

### Deploy falha com "migrations failed"

**Causa**: DATABASE_URL não está definido ou banco inacessível.

**Solução**:
1. Verifique que PostgreSQL foi adicionado ao projeto
2. Confirme que DATABASE_URL existe nas variáveis
3. Aguarde banco estar "healthy" antes de deploy do app

### Worker não processa jobs

**Causa 1**: REDIS_URL não definido.
- ✅ **Esperado**: Worker não inicia, mas app funciona (fallback in-process)
- Logs: "⚠️ REDIS_URL not set. Worker will not start"

**Causa 2**: Redis definido mas inacessível.
- ❌ **Problema**: Worker tenta conectar e falha
- **Solução**: Verifique REDIS_URL ou remova a variável para usar fallback

### "ENCRYPTION_KEY is not set"

**Causa**: Primeira execução sem ENCRYPTION_KEY definido.

**Solução**:
- ✅ **Automático**: Sistema gera chave e salva no banco
- **Ou**: Defina manualmente nas variáveis (64 chars hex)
  ```bash
  openssl rand -hex 32
  ```

### Setup wizard não aparece

**Causa**: Banco sem migrations ou admin já criado.

**Solução**:
1. Verifique logs: migrations rodaram?
2. Conecte no banco e veja tabela `User`:
   ```sql
   SELECT * FROM "User" WHERE "isAdmin" = true;
   ```
3. Se já existe admin, vá direto para `/login`

---

## 📊 Monitoramento

### Logs

Railway mostra logs em tempo real:
```bash
🚀 Starting Flowcomments...
📦 Running database migrations...
✅ Migrations complete
🔧 Starting worker in background...
🌐 Starting web server on port 3000...
✅ Workers started successfully
```

### Métricas

No Railway dashboard:
- CPU e Memória
- Uptime
- Deploy history
- Healthcheck status

---

## 💰 Custos Estimados (Railway)

- **Free Tier**: $5 de crédito/mês
  - Suficiente para testes
  - Sleeps após inatividade

- **Hobby Plan**: $5/mês
  - Sem sleep
  - 500 horas de execução

- **Produção**: ~$15-25/mês
  - App + PostgreSQL + Redis (opcional)
  - Recursos escaláveis

---

## 🔄 Atualizações

Railway faz deploy automático quando você:
1. Faz push para o branch main
2. Clica em "Redeploy" no dashboard

Para atualizar apenas variáveis (sem redeploy):
1. Mude a variável
2. Clique em "Restart" (mais rápido que rebuild)

---

## 🔐 Segurança

### Recomendações:

1. ✅ Use HTTPS (Railway fornece automaticamente)
2. ✅ Defina ENCRYPTION_KEY forte em produção
3. ✅ Nunca comite .env com secrets
4. ✅ Rotacione webhook verify token periodicamente
5. ✅ Monitore logs de acesso suspeito

### Secrets no Railway:

Railway criptografa automaticamente todas as variáveis de ambiente.

---

## 📚 Links Úteis

- **Railway Docs**: https://docs.railway.app
- **Flowcomments README**: /README.md
- **Meta for Developers**: https://developers.facebook.com
- **Troubleshooting**: /docs/TROUBLESHOOTING.md (TODO)

---

**Pronto!** 🎉 Seu Flowcomments está rodando no Railway.

Próximo passo: Conectar Instagram em `/settings`.
