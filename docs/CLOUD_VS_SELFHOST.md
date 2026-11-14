# Cloud vs Self-host

Dois repositórios, um produto:

| | Self-host (público) | Cloud (privado) |
|--|---------------------|-----------------|
| Repo | [flowcomments](https://github.com/NathanConde-dev/flowcomments) | [flowcomments-cloud](https://github.com/NathanConde-dev/flowcomments-cloud) |
| Quem hospeda | Você | Flowcomments (em breve) |
| Landing / marketing | Não (`/` → setup ou login) | Sim (`flowcomments.com`) |
| Plataforma (app) | Sim — caminho principal hoje | SaaS multi-tenant (em breve) |
| Comunicados | Poll + **Novidades** na sidebar | Admin publica |
| Updates | Sidebar **Novidades** / What's new | — |

## Self-host (use agora)

1. Clone / Docker / Railway do repo **público**
2. Control plane default: `https://flowcomments.com` (comunicados + heartbeat anônimo)
3. Opt-out de telemetria: `FLOWCOMMENTS_TELEMETRY=false`
4. Painel → **Novidades**: changelog + update opt-in
5. Apoie o projeto: **star** no GitHub → **doar** → **comunidade** ([nathanconde.com/comunidade](https://nathanconde.com/comunidade))

Redis + volume de mídia (`/app/data/uploads`) são necessários em produção (template Railway já cobre Redis; monte o volume de uploads).

A LICENSE Sustainable Use permite uso interno/self-host. **Proíbe** SaaS concorrente, white-label e remoção de atribuição.

## Cloud

Repo privado: landing oficial, control plane (`/api/v1/announcements`, `/api/v1/releases`), admin. Conta Cloud / signup: **em breve**. Enquanto isso, o caminho é self-host + doação + comunidade.
