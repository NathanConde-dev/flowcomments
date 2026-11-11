# Contributing to Flowcomments

Thanks for helping. This repo is the **public self-host core**. Marketing/SEO/billing live in the private Cloud repo and on [flowcomments.com](https://flowcomments.com).

## Ground rules

1. Read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
2. Search [existing issues](https://github.com/NathanConde-dev/flowcomments/issues) before opening a new one.
3. One concern per PR (easier review, easier revert).
4. Do not add marketing landing pages, SEO pages, or `sitemap`/`llms.txt` here — those belong on Cloud.
5. Never commit secrets (`.env`, keys, tokens). Use `.env.example` only.

## Dev setup

```bash
git clone https://github.com/NathanConde-dev/flowcomments.git
cd flowcomments
cp .env.example .env
# set ENCRYPTION_KEY + SESSION_SECRET (openssl rand -hex 32)

docker run --name flowcomments-db \
  -e POSTGRES_PASSWORD=flowcomments \
  -e POSTGRES_DB=flowcomments \
  -p 5432:5432 -d postgres:16-alpine

docker run --name flowcomments-redis -p 6379:6379 -d redis:7-alpine

npm install
npx prisma migrate dev
npm run dev
# another terminal
npm run worker
```

Optional: `docker compose up -d` if you prefer the full stack.

## Before you push

```bash
npm run lint
npm run typecheck
npm test
```

## Branch & commit style

- Branches: `feat/…`, `fix/…`, `docs/…`, `chore/…`
- Commits: short imperative subject (`fix: webhook verify on empty body`)
- Prefer Conventional Commits when it helps (`feat:`, `fix:`, `docs:`)

## Pull requests

Use the PR template. Include:

- What / why
- How you tested
- Screenshots for UI changes
- Notes on migrations or env vars

## What we merge gladly

- Bug fixes with reproduction steps
- Tests for automation/webhook/crypto paths
- Docs that help self-hosters
- Accessibility and i18n (pt, en, fr, it, de, es)
- Performance / reliability in worker + Meta API handling

## What needs an issue first

- New product surfaces (Stories, WhatsApp, multi-tenant in core)
- Breaking schema changes
- License / branding changes

## License

By contributing, you agree your work is licensed under the [Flowcomments Sustainable Use License](./LICENSE).

## Security

Report vulnerabilities privately via [SECURITY.md](./SECURITY.md) — do not open a public issue for exploits.
