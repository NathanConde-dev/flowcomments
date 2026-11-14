<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/flowcomments-logo-white.png" />
    <img src="docs/assets/flowcomments-logo.png" alt="Flowcomments" width="420" />
  </picture>
</p>

<p align="center">
  <strong>Automatize comentários e DMs do Instagram.</strong><br />
  Alternativa self-hosted e source-available ao ManyChat.
</p>

<p align="center">
  <a href="./README.md">English</a>
  ·
  <a href="./README.pt-BR.md">Português (Brasil)</a>
</p>

<p align="center">
  <a href="https://flowcomments.com"><img src="https://img.shields.io/badge/website-flowcomments.com-111111" alt="Website" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Sustainable%20Use-blue" alt="License" /></a>
  <a href="./CHANGELOG.md"><img src="https://img.shields.io/badge/version-0.2.0-green" alt="Version" /></a>
  <a href="./CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs welcome" /></a>
  <a href="https://github.com/NathanConde-dev/flowcomments/stargazers"><img src="https://img.shields.io/github/stars/NathanConde-dev/flowcomments?style=flat&label=stars" alt="GitHub stars" /></a>
</p>

> **Licença:** Flowcomments Sustainable Use License (source-available / fair-code, não é OSI open source).  
> Veja [LICENSE](./LICENSE) e [flowcomments.com/docs/license](https://flowcomments.com/docs/license).  
> Self-host para uso próprio: ok. Copiar para revender / SaaS concorrente / white-label: **proibido**.

**Site:** [flowcomments.com](https://flowcomments.com) · **ManyChat alternative:** [flowcomments.com/alternatives/manychat](https://flowcomments.com/alternatives/manychat) · **Cloud:** em breve

## Como apoiar o projeto

Self-host é **gratuito**. O ciclo que sustenta o Flowcomments:

1. **Use** — deploy no Railway / Docker / seu VPS  
2. **Dê uma estrela** — ajuda na descoberta e sinaliza que o core público vive  
   **[★ Star NathanConde-dev/flowcomments →](https://github.com/NathanConde-dev/flowcomments)**  
3. **Doe** (opcional) — doação pontual via Stripe para docs, updates e o core público  
   **[Doar →](https://flowcomments.com/donate)** · sugerido $5 · $15 · $50  
4. **Entre na comunidade** — mais conteúdos, projetos e builds open source  
   **[nathanconde.com/comunidade →](https://www.nathanconde.com/comunidade)**

## O que é o Flowcomments?

Plataforma self-hosted para automatizar interações no Instagram:

- **Automações inteligentes** — responda comentários com base em palavras-chave
- **DMs automáticos** — envie mensagens diretas após comentários
- **Gestão de contatos** — organize seguidores e acompanhe interações
- **Inbox unificado** — todas as conversas em um só lugar
- **Self-hosted** — controle total dos seus dados
- **Source-available** — código disponível para auditoria e customização

## Quick Start

### Docker Compose (recomendado)

```bash
git clone https://github.com/NathanConde-dev/flowcomments.git
cd flowcomments
cp .env.example .env
# Defina ENCRYPTION_KEY e SESSION_SECRET
docker compose up -d
```

Abra [http://localhost:3000](http://localhost:3000), complete o wizard e conecte o Instagram.

### Railway (1-Click Deploy)

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/flowcomments-template)

### VPS (Hostinger, DigitalOcean, etc.)

Veja [docs/RAILWAY_DEPLOY.md](./docs/RAILWAY_DEPLOY.md) e a [documentação oficial de self-host](https://flowcomments.com/docs).

Resumo mínimo:

```bash
git clone https://github.com/NathanConde-dev/flowcomments.git
cd flowcomments
cp .env.example .env
npm install
npx prisma migrate deploy
npm run build
npm start
# em outro processo:
npm run worker
```

## Meta App (Instagram)

Crie um app em [Meta for Developers](https://developers.facebook.com/), adicione Instagram API + Webhooks, permissões `instagram_basic`, `instagram_manage_comments`, `instagram_manage_messages`, `pages_show_list`, `pages_read_engagement`, e aponte o webhook para `https://seu-dominio.com/api/webhook`.

Guia passo a passo (humano + IA): [docs/ai/SETUP_PROMPT.md](./docs/ai/SETUP_PROMPT.md) · [flowcomments.com/docs](https://flowcomments.com/docs)

## Atualizações e comunicados

Este repo é **o produto** (app self-host). O marketing fica em [flowcomments.com](https://flowcomments.com).

No painel: **Novidades** — changelog, update opt-in ([docs/UPDATES.md](./docs/UPDATES.md)) e comunicados via `FLOWCOMMENTS_CONTROL_PLANE_URL`.

Em produção: mantenha **Redis** e um **volume** em `/app/data/uploads` (veja [docs/RAILWAY_TEMPLATE.md](./docs/RAILWAY_TEMPLATE.md)).

Telemetria anônima de install reporta ao control plane por padrão. Desligar: `FLOWCOMMENTS_TELEMETRY=false`.

Contas Cloud hospedadas: **em breve**. Hoje o caminho é self-host + estrela / doação / comunidade. Detalhes: [docs/CLOUD_VS_SELFHOST.md](./docs/CLOUD_VS_SELFHOST.md).

> Self-host para uso próprio: permitido. Revender como SaaS concorrente: **proibido** pela [LICENSE](./LICENSE). Mantenha “Powered by Flowcomments” visível.

## Desenvolvimento

```bash
npm install
docker run --name flowcomments-db -e POSTGRES_PASSWORD=flowcomments -e POSTGRES_DB=flowcomments -p 5432:5432 -d postgres:16-alpine
docker run --name flowcomments-redis -p 6379:6379 -d redis:7-alpine
cp .env.example .env
npx prisma migrate dev
npm run dev
# outro terminal
npm run worker
```

| Script | Descrição |
|--------|-----------|
| `npm run dev` | Dev server |
| `npm run build` | Build produção |
| `npm start` | Start produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Vitest |
| `npm run worker` | Worker BullMQ |

## Stack

Next.js 15 · TypeScript · PostgreSQL + Prisma · BullMQ + Redis · iron-session · Tailwind · Meta Graph API v21.0

## Contribuir

Leia **[CONTRIBUTING.md](./CONTRIBUTING.md)** antes do primeiro PR.

1. Fork → branch `feat/…` ou `fix/…`
2. `npm run lint && npm run typecheck && npm test`
3. Abra o PR com o template

Também: [Code of Conduct](./CODE_OF_CONDUCT.md) · [Security](./SECURITY.md)

Ao contribuir, você concorda com a mesma Flowcomments Sustainable Use License.

## Troubleshooting

**Instagram não aparece após conectar** — conta e Page precisam estar no mesmo Business Portfolio ([business.facebook.com](https://business.facebook.com/)).

**Webhook sem eventos** — URL pública, verify token igual, app Live, campos `comments` / `messages` / `mentions` ativos.

**DM com erro de permissão** — a pessoa precisa ter comentado ou iniciado conversa (regra da API Meta).

**`ENCRYPTION_KEY is not set`**

```bash
openssl rand -hex 32
# cole no .env como ENCRYPTION_KEY=...
```

## Licença

**Flowcomments Sustainable Use License** © 2026 Nathan Condé — [LICENSE](./LICENSE)

✅ Uso próprio / self-host / modificar / agência sem cobrar pelo software  
❌ SaaS concorrente / white-label / remover marca — sem licença comercial

Cloud: **em breve** em [flowcomments.com](https://flowcomments.com) · **contato@nathanconde.com**

## Suporte

- Comunidade: [nathanconde.com/comunidade](https://www.nathanconde.com/comunidade)
- Doação: [flowcomments.com/donate](https://flowcomments.com/donate)
- E-mail: [contato@nathanconde.com](mailto:contato@nathanconde.com)
- Issues: [GitHub Issues](https://github.com/NathanConde-dev/flowcomments/issues)
- Docs: [flowcomments.com/docs](https://flowcomments.com/docs)

## Agradecimentos

Inspiração de modelo e cultura de produto: [n8n](https://n8n.io), [Supabase](https://supabase.com) e [Cal.com](https://cal.com) — qualidade source-available com negócio sustentável.

E, acima de tudo, à minha esposa **Amanda** e ao meu filho **Isaac** — meus maiores motivadores a continuar buscando mais. (escrito às 01:55 da manhã e algumas latas de energético.)

---

**Powered by Flowcomments** © 2026 Nathan Condé  
[Licença](./LICENSE) · [GitHub](https://github.com/NathanConde-dev/flowcomments) · [Site](https://flowcomments.com)
