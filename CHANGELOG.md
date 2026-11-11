# Changelog

Todas as mudanças relevantes do Flowcomments são documentadas neste arquivo.

O formato segue [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e o projeto usa [Semantic Versioning](https://semver.org/lang/pt-BR/).

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
