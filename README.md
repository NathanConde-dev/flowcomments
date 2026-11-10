# Flowcomments

**Automatize Comentários e DMs do Instagram.** Alternativa self-hosted e source-available ao ManyChat.

![License](https://img.shields.io/badge/license-Sustainable%20Use-blue)
![Version](https://img.shields.io/badge/version-0.1.0-green)

> **Licença:** Flowcomments Sustainable Use License (source-available / fair-code, não é OSI open source).  
> Veja [LICENSE](./LICENSE) e [/licenca](https://seu-dominio.com/licenca) para detalhes completos.

## 📋 O que é o Flowcomments?

Flowcomments é uma plataforma self-hosted para automatizar interações no Instagram:

- ✅ **Automações inteligentes**: Responda comentários automaticamente com base em palavras-chave
- ✅ **DMs automáticos**: Envie mensagens diretas após comentários
- ✅ **Gestão de contatos**: Organize seguidores e acompanhe interações
- ✅ **Inbox unificado**: Veja todas as conversas em um só lugar
- ✅ **Self-hosted**: Controle total dos seus dados
- ✅ **Source-available**: Código disponível para auditoria e customização

## 🚀 Quick Start

### Com Docker Compose (Recomendado)

1. **Clone o repositório**
   ```bash
   git clone https://github.com/NathanConde-dev/flowcomments.git
   cd flowcomments
   ```

2. **Configure as variáveis de ambiente**
   ```bash
   cp .env.example .env
   # Edite .env e defina valores para ENCRYPTION_KEY e SESSION_SECRET
   ```

3. **Inicie os serviços**
   ```bash
   docker compose up -d
   ```

4. **Acesse a aplicação**
   - Abra [http://localhost:3000](http://localhost:3000)
   - Complete o wizard de configuração inicial
   - Conecte sua conta do Instagram

### Railway (1-Click Deploy)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/flowcomments)

1. Clique no botão acima
2. Configure as variáveis de ambiente (Railway cria um Postgres automaticamente)
3. Aguarde o deploy
4. Acesse sua URL e complete o setup

### VPS / Servidor (Hostinger, DigitalOcean, etc.)

```bash
# Instalar Node.js 20+ e PostgreSQL
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs postgresql

# Clonar e configurar
git clone https://github.com/NathanConde-dev/flowcomments.git
cd flowcomments
npm install

# Configurar banco de dados
sudo -u postgres psql
CREATE DATABASE flowcomments;
CREATE USER flowcomments WITH PASSWORD 'sua-senha-aqui';
GRANT ALL PRIVILEGES ON DATABASE flowcomments TO flowcomments;
\q

# Configurar .env
cp .env.example .env
nano .env  # Edite com suas configurações

# Migrar banco e buildar
npx prisma migrate deploy
npm run build

# Iniciar com PM2 (recomendado)
npm install -g pm2
pm2 start npm --name "flowcomments" -- start
pm2 start npm --name "flowcomments-worker" -- run worker

# Configurar para iniciar no boot
pm2 startup
pm2 save
```

## 🔧 Configuração do Meta App

Para conectar o Instagram, você precisa criar um App no Meta for Developers:

### 1. Criar App no Meta for Developers

1. Acesse [Meta for Developers](https://developers.facebook.com/)
2. Clique em **"Meus Apps"** → **"Criar App"**
3. Selecione **"Negócios"** como tipo de app
4. Preencha os detalhes do app

### 2. Configurar Produtos

Adicione os seguintes produtos ao seu app:

- **Instagram Basic Display** (para perfis pessoais) OU
- **Instagram API** (para contas Business/Creator - recomendado)
- **Facebook Login**
- **Webhooks**

### 3. Permissões Necessárias

Solicite as seguintes permissões no App Review:

- `instagram_basic`
- `instagram_manage_comments`
- `instagram_manage_messages`
- `pages_show_list`
- `pages_read_engagement`
- `business_management` (se usar Facebook Login for Business)

### 4. Configurar Webhook

1. No painel do app, vá em **Webhooks**
2. Clique em **"Configurar"** para Instagram
3. **URL de Callback**: `https://seu-dominio.com/api/webhook`
4. **Verificar Token**: Use o mesmo token que você definiu no setup
5. Ative os campos:
   - `comments`
   - `mentions`
   - `messages`

### 5. Obter Credenciais

No painel do app:
- **App ID**: Encontrado em Configurações → Básico
- **App Secret**: Encontrado em Configurações → Básico (clique em "Mostrar")
- **Config ID** (opcional): Para Facebook Login for Business

### 6. Configurar no Flowcomments

Durante o setup wizard ou depois nas configurações:
1. Cole o **App ID**
2. Cole o **App Secret**
3. Cole o **Config ID** (se usar Facebook Login for Business)
4. Cole o **Webhook Verify Token**
5. Conecte sua conta do Instagram

## 🛠️ Desenvolvimento

```bash
# Instalar dependências
npm install

# Configurar banco de dados local
docker run --name flowcomments-db -e POSTGRES_PASSWORD=flowcomments -e POSTGRES_DB=flowcomments -p 5432:5432 -d postgres:16-alpine
docker run --name flowcomments-redis -p 6379:6379 -d redis:7-alpine

# Configurar .env
cp .env.example .env

# Migrar banco
npx prisma migrate dev

# Iniciar desenvolvimento
npm run dev

# Em outro terminal, iniciar worker
npm run worker
```

### Scripts Disponíveis

- `npm run dev` - Inicia o servidor de desenvolvimento
- `npm run build` - Builda a aplicação para produção
- `npm start` - Inicia a aplicação em produção
- `npm run lint` - Roda o linter
- `npm run typecheck` - Verifica tipos TypeScript
- `npm test` - Roda os testes
- `npm run worker` - Inicia o worker de processamento

## 📦 Stack Tecnológico

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Queue**: BullMQ + Redis (opcional)
- **Auth**: iron-session
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui style
- **Instagram API**: Meta Graph API v21.0

## 🐛 Troubleshooting

### Conta do Instagram não aparece após conectar

**Causa comum**: Sua conta pessoal e a página do Facebook que você conectou não estão na mesma Business Portfolio.

**Solução**:
1. Acesse [Facebook Business Manager](https://business.facebook.com/)
2. Verifique se sua conta do Instagram está vinculada à mesma Business
3. Se não estiver, adicione a conta do Instagram ao Business correto

### Webhook não está recebendo eventos

**Checklist**:
- ✅ URL do webhook está acessível publicamente (use ngrok para testes locais)
- ✅ Token de verificação é o mesmo no Meta e no Flowcomments
- ✅ App está em modo Live (não Development)
- ✅ Campos do webhook estão ativados (comments, messages, mentions)
- ✅ Conta do Instagram está corretamente conectada

### Erro de permissão ao enviar DM

O envio de DM requer que:
1. A pessoa tenha comentado no seu post primeiro, OU
2. Já tenha iniciado uma conversa com você

Isso é uma limitação da API do Instagram por política do Meta.

### "ENCRYPTION_KEY is not set"

Defina `ENCRYPTION_KEY` no seu `.env` com um valor aleatório de 64 caracteres hexadecimais:

```bash
# Gerar chave:
openssl rand -hex 32

# Adicionar ao .env:
ENCRYPTION_KEY=sua-chave-gerada-aqui
```

## 📄 Licença

Flowcomments é licenciado sob a **Flowcomments Sustainable Use License** © 2026 Nathan Condé.

**TL;DR** (leia [LICENSE](./LICENSE) e [/licenca](https://seu-dominio.com/licenca) para termos completos):

✅ **PODE**:
- Usar gratuitamente para suas próprias contas pessoais/comerciais
- Self-hospedar em sua infraestrutura
- Modificar o código para suas necessidades
- Usar em sua empresa para contas da própria empresa
- Agências: usar para gerenciar contas de clientes (sem cobrar pelo software)

❌ **NÃO PODE** (sem licença comercial):
- Vender ou revender como produto/serviço
- Oferecer como SaaS hospedado
- White-label (remover nossa marca)
- Remover logo "Flowcomments" e "Powered by Flowcomments"

Para licenciamento comercial ou versão hospedada oficial: **contato@nathanconde.com**

## 🤝 Contribuições

Contribuições são bem-vindas! Por favor:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFeature`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova feature'`)
4. Push para a branch (`git push origin feature/NovaFeature`)
5. Abra um Pull Request

**Nota**: Ao contribuir, você concorda que seu código será licenciado sob a mesma Flowcomments Sustainable Use License.

## 📞 Suporte

- 📧 **E-mail**: contato@nathanconde.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/NathanConde-dev/flowcomments/issues)
- 📖 **Documentação**: [Wiki](https://github.com/NathanConde-dev/flowcomments/wiki) (em breve)

## 🗺️ Roadmap

- [ ] v0.1 - MVP básico (você está aqui!)
- [ ] v0.2 - Instagram Stories automações
- [ ] v0.3 - Analytics e relatórios
- [ ] v0.4 - Templates de mensagens com variáveis
- [ ] v0.5 - Múltiplos usuários/equipes
- [ ] v1.0 - API pública e webhooks
- [ ] v2.0 - Suporte a WhatsApp Business

## 💝 Agradecimentos

Inspirado pelo espírito de projetos como [n8n](https://n8n.io), [Supabase](https://supabase.com) e [Cal.com](https://cal.com): software de qualidade, source-available e com modelos de negócio sustentáveis.

---

**Powered by Flowcomments** © 2026 Nathan Condé  
[Licença](./LICENSE) • [GitHub](https://github.com/NathanConde-dev/flowcomments) • [Contato](mailto:contato@nathanconde.com)
