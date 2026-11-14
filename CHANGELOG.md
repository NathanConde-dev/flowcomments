# Changelog

Todas as mudanças relevantes do Flowcomments são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e o projeto usa [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [0.2.0] - 2026-11-14

### Added

- Botões `web_url`, handoff humano, ice breakers e mídia (imagem/áudio) na DM
- Contagem de disparos/DMs/taps e filtro de contatos por tag
- Refresh de token IG, resume pós `ask_input`, follow-gate em stories
- Accordion no inspector do canvas
- Feed de releases via control plane (`/api/v1/releases`) quando o GitHub não responde
- Variáveis de update ativas no template Railway (Novidades)
- Volume persistente de uploads (`FLOWCOMMENTS_UPLOAD_DIR`) para mídia sobreviver a redeploy
- Delays longos (>10s) via fila Redis (BullMQ) com recovery se o job se perder

### Fixed

- Follow `null` não conta como “não segue”
- Uma automação por comentário (evita spam multi-match)
- Compose: Redis AOF + volume de uploads; worker único embutido no `start.sh`

## [0.1.0] - 2026-11-11

### Added

- Automações de comentários e DMs no Instagram
- Setup wizard (admin + Meta App)
- Configurações Meta com autosave, teste de credenciais e webhook
- Integração MCP para assistência por IA
- Deploy Docker Compose e Railway
- Toasts (sonner) para notificações da plataforma
- Sistema self-hosted de atualizações e aba Novidades

### Security

- Credenciais Meta criptografadas; secrets só via env (`ENCRYPTION_KEY`, `SESSION_SECRET`)
