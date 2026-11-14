<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/flowcomments-logo-white.png" />
    <img src="docs/assets/flowcomments-logo.png" alt="Flowcomments" width="420" />
  </picture>
</p>

<p align="center">
  <strong>Automate Instagram comments and DMs.</strong><br />
  Self-hosted, source-available ManyChat alternative.
</p>

<p align="center">
  <a href="./README.pt-BR.md">Português (Brasil)</a>
  ·
  <a href="./README.md">English</a>
</p>

<p align="center">
  <a href="https://flowcomments.com"><img src="https://img.shields.io/badge/website-flowcomments.com-111111" alt="Website" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-Sustainable%20Use-blue" alt="License" /></a>
  <a href="./CHANGELOG.md"><img src="https://img.shields.io/badge/version-0.1.0-green" alt="Version" /></a>
  <a href="./CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen" alt="PRs welcome" /></a>
  <a href="https://github.com/NathanConde-dev/flowcomments/stargazers"><img src="https://img.shields.io/github/stars/NathanConde-dev/flowcomments?style=flat&label=stars" alt="GitHub stars" /></a>
</p>

> **License:** Flowcomments Sustainable Use License (source-available / fair-code — not OSI open source).  
> See [LICENSE](./LICENSE) and [flowcomments.com/docs/license](https://flowcomments.com/docs/license).  
> Self-host for your own use: allowed. Copying to resell / competing SaaS / white-label: **not allowed**.

**Official site / Cloud:** [flowcomments.com](https://flowcomments.com) · **ManyChat alternative:** [flowcomments.com/alternatives/manychat](https://flowcomments.com/alternatives/manychat)

### ⭐ If Flowcomments helps you, star the repo

Stars improve discovery and support the public self-host core:

**[Star NathanConde-dev/flowcomments →](https://github.com/NathanConde-dev/flowcomments)**

## Support the project (donate)

Self-host is **free** on your own infrastructure. If Flowcomments helps you, a one-time Stripe donation keeps docs, updates, and the public core going:

**[Donate on the official site →](https://flowcomments.com/donate)**

Suggested amounts: $5 · $15 · $50 (Stripe Checkout). Hosted Cloud: [R$ 197/mo](https://flowcomments.com/signup) (BR) · $49/mo (intl).

## What is Flowcomments?

A self-hosted platform to automate Instagram interactions:

- **Smart automations** — reply to comments based on keywords
- **Automatic DMs** — send direct messages after comments
- **Contact management** — organize followers and track interactions
- **Unified inbox** — all conversations in one place
- **Self-hosted** — full control of your data
- **Source-available** — code available for audit and customization

## Quick Start

### Docker Compose (recommended)

```bash
git clone https://github.com/NathanConde-dev/flowcomments.git
cd flowcomments
cp .env.example .env
# Set ENCRYPTION_KEY and SESSION_SECRET
docker compose up -d
```

Open [http://localhost:3000](http://localhost:3000), finish the wizard, and connect Instagram.

### Railway (1-Click Deploy)

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/flowcomments-template)

### VPS (Hostinger, DigitalOcean, etc.)

See [docs/RAILWAY_DEPLOY.md](./docs/RAILWAY_DEPLOY.md) and the official [self-host docs](https://flowcomments.com/docs).

Minimal summary:

```bash
git clone https://github.com/NathanConde-dev/flowcomments.git
cd flowcomments
cp .env.example .env
npm install
npx prisma migrate deploy
npm run build
npm start
# in another process:
npm run worker
```

## Meta App (Instagram)

Create an app in [Meta for Developers](https://developers.facebook.com/), add Instagram API + Webhooks, permissions `instagram_basic`, `instagram_manage_comments`, `instagram_manage_messages`, `pages_show_list`, `pages_read_engagement`, and point the webhook to `https://your-domain.com/api/webhook`.

Step-by-step (human + AI): [docs/ai/SETUP_PROMPT.md](./docs/ai/SETUP_PROMPT.md) · [flowcomments.com/docs](https://flowcomments.com/docs)

## Updates and announcements

This repo is **the product only** (no marketing landing). The official landing lives on Cloud.

In the dashboard: **What's new** — GitHub changelog, update opt-in ([docs/UPDATES.md](./docs/UPDATES.md)), and announcements via `FLOWCOMMENTS_CONTROL_PLANE_URL`.

Anonymous install telemetry (install id, version, host, IG account count) reports to the control plane by default. Opt out with `FLOWCOMMENTS_TELEMETRY=false`.

SaaS + landing: [flowcomments.com](https://flowcomments.com). Details: [docs/CLOUD_VS_SELFHOST.md](./docs/CLOUD_VS_SELFHOST.md).

> Self-host for your own use: allowed. Reselling as competing SaaS/subscription: **prohibited** by the [LICENSE](./LICENSE).

## Development

```bash
npm install
docker run --name flowcomments-db -e POSTGRES_PASSWORD=flowcomments -e POSTGRES_DB=flowcomments -p 5432:5432 -d postgres:16-alpine
docker run --name flowcomments-redis -p 6379:6379 -d redis:7-alpine
cp .env.example .env
npx prisma migrate dev
npm run dev
# another terminal
npm run worker
```

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm start` | Production start |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Vitest |
| `npm run worker` | BullMQ worker |

## Stack

Next.js 15 · TypeScript · PostgreSQL + Prisma · BullMQ + Redis · iron-session · Tailwind · Meta Graph API v21.0

## Contributing

Read **[CONTRIBUTING.md](./CONTRIBUTING.md)** before your first PR.

1. Fork → branch `feat/…` or `fix/…`
2. `npm run lint && npm run typecheck && npm test`
3. Open a PR with the template

Also: [Code of Conduct](./CODE_OF_CONDUCT.md) · [Security](./SECURITY.md)

By contributing, you agree to the same Flowcomments Sustainable Use License.

## Troubleshooting

**Instagram does not appear after connecting** — the account and Page must be in the same Business Portfolio ([business.facebook.com](https://business.facebook.com/)).

**Webhook receives no events** — public URL, matching verify token, app Live, fields `comments` / `messages` / `mentions` enabled.

**DM permission error** — the person must have commented or started the conversation first (Meta API rule).

**`ENCRYPTION_KEY is not set`**

```bash
openssl rand -hex 32
# paste into .env as ENCRYPTION_KEY=...
```

## License

**Flowcomments Sustainable Use License** © 2026 Nathan Condé — [LICENSE](./LICENSE)

✅ Own use / self-host / modify / agency work without charging for the software itself  
❌ Competing SaaS / white-label / removing branding — without a commercial license

Official Cloud: [flowcomments.com/signup](https://flowcomments.com/signup) · **contato@nathanconde.com**

## Support

- Email: [contato@nathanconde.com](mailto:contato@nathanconde.com)
- Issues: [GitHub Issues](https://github.com/NathanConde-dev/flowcomments/issues)
- Docs: [flowcomments.com/docs](https://flowcomments.com/docs)

## Acknowledgments

Product and culture inspiration: [n8n](https://n8n.io), [Supabase](https://supabase.com), and [Cal.com](https://cal.com) — source-available quality with a sustainable business.

And above all, my wife **Amanda** and my son **Isaac** — my biggest reasons to keep going. (Written at 01:55am with a few energy drinks.)

---

**Powered by Flowcomments** © 2026 Nathan Condé  
[License](./LICENSE) · [GitHub](https://github.com/NathanConde-dev/flowcomments) · [Website](https://flowcomments.com)
