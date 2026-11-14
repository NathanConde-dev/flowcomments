# Deploy Flowcomments no Railway

## 1-Click (recomendado)

Use o botão **Deploy on Railway** no [README](../README.md). O template cria:

- Serviço **App** (Dockerfile — web + worker)
- **PostgreSQL**
- **Redis**

Variáveis já vêm referenciadas (`DATABASE_URL`, `REDIS_URL`, `NEXT_PUBLIC_URL`, secrets). Detalhes do marketplace: [RAILWAY_TEMPLATE.md](./RAILWAY_TEMPLATE.md).

### Depois do deploy

1. Abra a URL pública e complete `/setup` (admin + Meta).
2. Confirme `NEXT_PUBLIC_URL=https://seu-dominio`.
3. Webhook Meta: `https://seu-dominio/api/webhook`.
4. Conecte Instagram em **Settings → Instagram**.

---

## Deploy manual (fallback)

### Pré-requisitos

- Conta Railway
- Repositório GitHub `NathanConde-dev/flowcomments`

### Passos

1. **New Project** → Deploy from GitHub → `flowcomments` (Dockerfile / `railway.json`).
2. **+ New → Database → PostgreSQL**.
3. **+ New → Database → Redis**.
4. No serviço app, Variables (ver [.env.railway.example](../.env.railway.example)):

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
NEXT_PUBLIC_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}
ENCRYPTION_KEY=<openssl rand -hex 32>
SESSION_SECRET=<openssl rand -hex 32>
RUN_WORKER=true
FLOWCOMMENTS_UPDATE_REPO=NathanConde-dev/flowcomments
FLOWCOMMENTS_CONTROL_PLANE_URL=https://flowcomments.com
ENABLE_SELF_UPDATE=false
FLOWCOMMENTS_TELEMETRY=true
```

5. **Settings → Generate Domain**, alinhe `NEXT_PUBLIC_URL`.
6. Aguarde o build; healthcheck: `/api/health` (timeout 100s).

---

## Arquitetura

### Single service (padrão do template)

```
Flowcomments container
├── Next.js (PORT)
├── Worker (se REDIS_URL + RUN_WORKER≠false)
└── prisma migrate deploy no start
        │
        ├── PostgreSQL
        └── Redis
```

### Split web / worker (avançado)

1. Serviço web: `RUN_WORKER=false`
2. Serviço worker: mesmo repo; start `npx tsx worker/index.ts`; mesma `DATABASE_URL` / `REDIS_URL`

---

## Troubleshooting

### P3009 — migration failed (`user_timezone`)

A coluna pode já existir enquanto o histórico Prisma marca a migration como failed.

```bash
npx prisma migrate resolve --applied 20261111193000_user_timezone
npx prisma migrate deploy
```

Depois faça **Redeploy** do serviço. O `start.sh` tenta recuperar esse caso automaticamente.

### Worker não sobe

- Sem `REDIS_URL`: worker não inicia (app web ok).
- Com `REDIS_URL` inválido: corrija a referência `${{Redis.REDIS_URL}}`.

### ENCRYPTION_KEY

Defina nas variables do Railway (template gera automaticamente). Em produção, prefira secret fixo e rotacionável.

---

## Atualizações

Push em `main` ou **Redeploy** no dashboard. Mudança só de variável: **Restart** costuma bastar.

## Links

- Template marketplace: botão no README
- Meta: https://developers.facebook.com
- Docs Railway: https://docs.railway.com
