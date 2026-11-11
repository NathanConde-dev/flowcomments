# Atualizações self-hosted

O Flowcomments avisa quando há release nova, mostra **Novidades** no painel e só atualiza se o admin optar. Nada sobe sozinho.

## O que o painel faz

1. Compara a versão local (`package.json` / `NEXT_PUBLIC_APP_VERSION`) com o GitHub Releases
2. Mostra changelog (`CHANGELOG.md` + notas do release)
3. Oferece:
   - comandos por tipo de instalação (Docker, Git/PM2, Railway), ou
   - one-click se `ENABLE_SELF_UPDATE=true` (dispara `scripts/update.sh` no host)

## Variáveis

```env
FLOWCOMMENTS_UPDATE_REPO=NathanConde-dev/flowcomments
# ENABLE_SELF_UPDATE=true
# FLOWCOMMENTS_UPDATE_MODE=docker   # ou git | auto
# FLOWCOMMENTS_UPDATE_TAG=v0.2.0    # opcional no modo git
```

**Não ative** `ENABLE_SELF_UPDATE` no Railway ou em containers sem acesso ao host/git/docker. Nesses casos use redeploy / comandos manuais.

## Política para não quebrar produção

- Update é **opt-in**
- Migrations Prisma são **aditivas**; o boot (`start.sh`) roda `prisma migrate deploy`
- `.env`, volumes Postgres/Redis e dados de automação **não** são apagados pelo script
- Breaking change exige **major** e nota clara no changelog
- Faça backup do Postgres antes de major

## Comandos manuais

### Docker Compose

```bash
cd /caminho/do/flowcomments
docker compose pull
docker compose up -d --build
```

### Git + PM2

```bash
cd /caminho/do/flowcomments
git fetch --tags origin
git checkout vX.Y.Z
npm ci
npx prisma migrate deploy
npm run build
pm2 restart flowcomments flowcomments-worker
```

### One-click no host

```bash
chmod +x scripts/update.sh
# no .env
ENABLE_SELF_UPDATE=true
FLOWCOMMENTS_UPDATE_MODE=auto
```

Depois use **Configurações → Atualizações → Atualizar agora**.

## Publicar um release

1. Atualize `CHANGELOG.md` e `package.json` version
2. Commit + tag `vX.Y.Z`
3. Crie GitHub Release com as mesmas notas
4. Instalações self-hosted passam a ver o aviso no painel
