# Cloud vs Self-host

Dois repositórios, um produto:

| | Self-host (público) | Cloud (privado) |
|--|---------------------|-----------------|
| Repo | [flowcomments](https://github.com/NathanConde-dev/flowcomments) | [flowcomments-cloud](https://github.com/NathanConde-dev/flowcomments-cloud) |
| Quem hospeda | Você | Flowcomments (Railway) |
| Landing / marketing | Não (`/` → setup ou login) | Sim (`/`) |
| Plataforma (app) | Sim | SaaS multi-tenant (próximo) |
| Comunicados | Poll + **Novidades** na sidebar | Admin publica |
| Updates | Sidebar **What's new** / Novidades | — |

## Self-host

1. Clone/docker do repo **público** (só a plataforma)
2. Opcional: `FLOWCOMMENTS_CONTROL_PLANE_URL=https://<sua-url-cloud>`
3. Painel → **Novidades** (sidebar): changelog do GitHub + update opt-in seguro

A LICENSE Sustainable Use permite uso interno/self-host. **Proíbe** oferecer o software como SaaS concorrente.

## Cloud

Repo privado: landing oficial, control plane (`/api/v1/announcements`), `/admin`, stubs Organization/Membership. Multi-tenant + Stripe nas próximas fases. Core via submodule `core/`.
