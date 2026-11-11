# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| `0.1.x` (main) | Yes |
| older tags | Best-effort |

## Reporting a vulnerability

**Do not** open a public GitHub issue for security bugs.

Email **contato@nathanconde.com** with:

- Description and impact
- Steps to reproduce / PoC (if available)
- Affected version / commit
- Whether you plan to disclose publicly and preferred timeline

We aim to acknowledge within **72 hours** and share a remediation plan when possible.

## Hardening checklist (self-host)

- Set strong `ENCRYPTION_KEY` and `SESSION_SECRET` (`openssl rand -hex 32`)
- Keep `NODE_ENV=production`
- Terminate TLS in front of the app (Caddy / nginx / Cloudflare)
- Restrict Meta App to your domains
- Do not expose Redis or Postgres publicly
- Keep `ENABLE_SELF_UPDATE` off unless you trust the host
