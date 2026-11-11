# Cloud vs Self-host

Dois repositórios, um produto:

| | Self-host (público) | Cloud (privado) |
|--|---------------------|-----------------|
| Repo | [flowcomments](https://github.com/NathanConde-dev/flowcomments) | [flowcomments-cloud](https://github.com/NathanConde-dev/flowcomments-cloud) |
| Quem hospeda | Você | Flowcomments (Railway) |
| Código SaaS/billing | Não | Sim |
| Comunicados | Poll em `FLOWCOMMENTS_CONTROL_PLANE_URL` | Publica via admin |

## Self-host

1. Clone/docker do repo **público**
2. Opcional: `FLOWCOMMENTS_CONTROL_PLANE_URL=https://<sua-url-cloud>`
3. Painel → Configurações → Comunicados / Atualizações

A LICENSE Sustainable Use permite uso interno/self-host. **Proíbe** oferecer o software como SaaS concorrente.

## Cloud

Repo privado: control plane (`/api/v1/announcements`), admin, stubs Organization/Membership. Multi-tenant + Stripe nas próximas fases. Core entra via submodule `core/`.
