# Deploy and Host Flowcomments on Railway

Flowcomments is source-available Instagram comment and DM automation. Deploy the self-host core on Railway in one click: web app, background worker, PostgreSQL, and Redis.

## About Hosting Flowcomments on Railway

This template provisions:

- **App** — Next.js + Prisma, built from the GitHub Dockerfile (web + worker in one service)
- **PostgreSQL** — managed database (`DATABASE_URL`)
- **Redis** — managed queue for automations (`REDIS_URL`)

On first boot the container runs `prisma migrate deploy`, starts the web server, and starts the worker when `REDIS_URL` is set.

Public networking and a healthcheck on `/api/health` are included. After deploy, complete the setup wizard and point the Meta webhook at your Railway domain.

## Common Use Cases

- Self-host Instagram comment-to-DM automation without managing Postgres/Redis yourself
- Run a private Flowcomments instance for a brand or agency with encrypted credentials
- Spin up a staging environment that mirrors production (app + worker + databases)

## Dependencies for Flowcomments Hosting

- Railway account (Hobby plan recommended for always-on Redis + Postgres)
- GitHub access to clone/deploy [NathanConde-dev/flowcomments](https://github.com/NathanConde-dev/flowcomments)
- Meta Developer App with Instagram messaging and comment permissions

### Deployment Dependencies

- [Flowcomments repository](https://github.com/NathanConde-dev/flowcomments) — app source and Dockerfile
- [Railway deploy guide](https://github.com/NathanConde-dev/flowcomments/blob/main/docs/RAILWAY_DEPLOY.md) — post-deploy checklist
- [Meta for Developers](https://developers.facebook.com/) — App credentials and webhook configuration

## Why Deploy Flowcomments on Railway

- One-click stack with databases already wired via variable references
- HTTPS public domain out of the box (`NEXT_PUBLIC_URL` follows `RAILWAY_PUBLIC_DOMAIN`)
- Healthcheck on `/api/health` and restart policy for the app service
- Push-to-deploy from GitHub `main` after the template forks the project

## After Deploy

1. Open the public Railway URL and complete the setup wizard (`/setup`) — create the admin account and Meta App credentials.
2. Generate a public domain if the template did not assign one, then confirm `NEXT_PUBLIC_URL` matches `https://YOUR_DOMAIN`.
3. In Meta for Developers, set the webhook callback to:
   `https://YOUR_DOMAIN/api/webhook`
4. Connect Instagram under **Settings → Instagram**.

## Environment Variables

| Variable | Source |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `NEXT_PUBLIC_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
| `ENCRYPTION_KEY` | generated secret |
| `SESSION_SECRET` | generated secret |
| `RUN_WORKER` | `true` |
| `FLOWCOMMENTS_UPDATE_REPO` | `NathanConde-dev/flowcomments` |
| `FLOWCOMMENTS_CONTROL_PLANE_URL` | `https://flowcomments.com` |
| `ENABLE_SELF_UPDATE` | `false` (never enable on Railway) |
| `FLOWCOMMENTS_TELEMETRY` | `true` |

These update vars keep **Novidades** working after deploy: the app checks GitHub releases, and if the repo is private/rate-limited it falls back to the Cloud feed at `/api/v1/releases`.
