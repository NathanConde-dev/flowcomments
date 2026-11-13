# Deploy and Host Flowcomments on Railway

Flowcomments is source-available Instagram comment and DM automation. Deploy the self-host core on Railway in one click: web app, background worker, PostgreSQL, and Redis.

## About Hosting Flowcomments on Railway

This template provisions:

- **App** — Next.js + Prisma, built from the GitHub Dockerfile (web + worker in one service)
- **PostgreSQL** — managed database (`DATABASE_URL`)
- **Redis** — managed queue for automations (`REDIS_URL`)

On first boot the container runs `prisma migrate deploy`, starts the web server, and starts the worker when `REDIS_URL` is set.

## Why Deploy Flowcomments on Railway

- One-click stack with databases already wired
- HTTPS domain out of the box
- Healthcheck on `/api/health`
- Push-to-deploy from GitHub `main`

## After Deploy

1. Open the public Railway URL and complete the setup wizard (`/setup`) — create the admin account and Meta App credentials.
2. Generate a public domain if the template did not assign one, then confirm `NEXT_PUBLIC_URL` matches `https://<your-domain>`.
3. In Meta for Developers, set the webhook callback to:
   `https://<your-domain>/api/webhook`
4. Connect Instagram under **Settings → Instagram**.

## Dependencies

- GitHub repository: [NathanConde-dev/flowcomments](https://github.com/NathanConde-dev/flowcomments)
- Meta Developer App with Instagram messaging/comment permissions

## Environment Variables

| Variable | Source |
| --- | --- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `NEXT_PUBLIC_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
| `ENCRYPTION_KEY` | generated secret |
| `SESSION_SECRET` | generated secret |
| `RUN_WORKER` | `true` |

## Docs

- Deploy guide: [docs/RAILWAY_DEPLOY.md](./RAILWAY_DEPLOY.md)
- Project README: [../README.md](../README.md)
