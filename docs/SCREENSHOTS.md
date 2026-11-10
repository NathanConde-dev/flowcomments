# Screenshots do Flowcomments v0.1

## Status
Screenshots serão capturados após o primeiro deploy de teste com banco de dados.

## Páginas a Capturar

### 1. Landing Page (/)
**URL**: `http://localhost:3000/`

**Conteúdo**:
- Hero com "Automatize Comentários e DMs do Instagram"
- 3 cards de features (Automações Inteligentes, Gestão de Contatos, Self-Hosted)
- Footer com "Powered by Flowcomments"
- Links para Licença e GitHub

**Estado**: Pronto para captura

---

### 2. Página de Licença (/licenca)
**URL**: `http://localhost:3000/licenca`

**Conteúdo**:
- Título "Licença e Uso do Flowcomments"
- Card azul com filosofia
- Duas colunas: "O que você PODE fazer" (verde) e "O que você NÃO PODE fazer" (vermelho)
- FAQ expandido com 8 perguntas
- Avisos legais
- CTAs para GitHub e contato

**Estado**: Pronto para captura

---

### 3. Setup Wizard - Step 1 (/setup)
**URL**: `http://localhost:3000/setup` (primeira vez, sem admin)

**Conteúdo**:
- Formulário "Criar Conta Administrador"
- Campos: Username, Email (opcional), Senha, Confirmar Senha
- Indicador de progresso: "2 passos restantes"
- Logo do Flowcomments

**Estado**: Pronto para captura

---

### 4. Setup Wizard - Step 2 (/setup)
**URL**: `http://localhost:3000/setup` (após criar admin)

**Conteúdo**:
- Formulário "Configurar Meta App"
- Campos: App ID, App Secret, Config ID (opcional), Webhook Verify Token
- Box azul com URL do webhook para copiar
- Dicas de onde encontrar cada credencial
- Botão "Continuar"

**Estado**: Pronto para captura

---

### 5. Login (/login)
**URL**: `http://localhost:3000/login`

**Conteúdo**:
- Card centralizado com logo
- Campos: Usuário, Senha
- Botão "Entrar"
- Background gradiente azul

**Estado**: Pronto para captura

---

### 6. Dashboard (/dashboard)
**URL**: `http://localhost:3000/dashboard` (após login)

**Conteúdo**:
- Sidebar com navegação (Dashboard, Automações, Contatos, Inbox, Configurações)
- 4 cards de estatísticas: Automações Ativas, Contatos, Mensagens Enviadas, Contas Conectadas
- Card "Contas do Instagram" com lista de contas conectadas
- Alerta amarelo se nenhuma conta conectada: "Conecte agora para começar"

**Estado**: Pronto para captura

**Variações**:
- Com contas conectadas
- Sem contas conectadas (alerta)

---

### 7. Automações - Lista (/automations)
**URL**: `http://localhost:3000/automations`

**Conteúdo**:
- Header com título e botão "+ Nova Automação"
- Cards de automações existentes:
  - Nome da automação
  - Badge "Ativo" ou "Pausado"
  - Conta @username
  - Tipo de gatilho
  - Keywords (até 5, depois +N)
  - Botão "Editar"
- Estado vazio: ilustração + "Criar Primeira Automação"

**Estado**: Pronto para captura

**Variações**:
- Lista vazia
- Lista com 2-3 automações

---

### 8. Automação Builder (/automations/new)
**URL**: `http://localhost:3000/automations/new`

**Conteúdo**:
- Card "Informações Básicas": Nome, Select de conta
- Card "Gatilho": 
  - Palavras-chave (adicionar/remover)
  - Select de tipo de correspondência
  - Checkbox case sensitive
- Card "Ações":
  - Textarea "Responder Comentário"
  - Textarea "Enviar DM"
  - Nota sobre delay
- Botões: Cancelar, Criar Automação

**Estado**: Pronto para captura

---

### 9. Configurações - Instagram (/settings)
**URL**: `http://localhost:3000/settings`

**Conteúdo**:
- Card "Testar Credenciais": App ID, App Secret, botão "Testar Credenciais"
- Card "Contas do Instagram":
  - Botão "Conectar Instagram"
  - Botão "Conectar com Token Manual"
  - Lista de contas conectadas com:
    - Avatar/ícone do IG
    - @username
    - Badge "Ativa" verde
    - "Expira em X dias"
    - Botão "Desconectar"
- Card "Webhook do Meta": URL com botão copiar, instruções
- Card "Sobre": versão, licença, links

**Estado**: Pronto para captura

**Variações**:
- Sem contas conectadas
- Com 1 conta conectada
- Com mensagem de sucesso
- Com mensagem de erro + hint

---

### 10. Contatos (/contacts)
**URL**: `http://localhost:3000/contacts`

**Conteúdo**:
- Header "Contatos"
- Lista de contatos com:
  - Avatar/ícone
  - @username, nome
  - Via @conta
  - Última interação
  - Tags (se houver)
- Estado vazio: "Nenhum contato ainda"

**Estado**: Pronto para captura

**Variações**:
- Lista vazia
- Lista com contatos

---

### 11. Inbox (/inbox)
**URL**: `http://localhost:3000/inbox`

**Conteúdo**:
- Header "Inbox"
- Lista de conversas com:
  - Avatar/ícone
  - @username, nome
  - Badge com número de não lidas
  - Via @conta
  - Data da última mensagem
  - Status: Aberto/Fechado
- Estado vazio: "Nenhuma conversa ainda"

**Estado**: Pronto para captura

**Variações**:
- Lista vazia
- Lista com conversas

---

## Como Capturar

1. **Iniciar ambiente**:
   ```bash
   docker compose up -d
   # Aguardar serviços iniciarem
   ```

2. **Acessar aplicação**:
   ```bash
   open http://localhost:3000
   ```

3. **Capturar screenshots**:
   - Usar ferramenta de screenshot (macOS: Cmd+Shift+4, Win: Snipping Tool)
   - Resolução: 1920x1080 (desktop) ou 375x812 (mobile)
   - Formato: PNG
   - Salvar em `/opt/cursor/artifacts/flowcomments-screenshots/`

4. **Nomenclatura**:
   - `01-landing.png`
   - `02-licenca.png`
   - `03-setup-step1.png`
   - `04-setup-step2.png`
   - `05-login.png`
   - `06-dashboard-empty.png`
   - `06-dashboard-with-accounts.png`
   - `07-automations-empty.png`
   - `07-automations-list.png`
   - `08-automation-builder.png`
   - `09-settings-no-accounts.png`
   - `09-settings-connected.png`
   - `09-settings-error.png`
   - `10-contacts-empty.png`
   - `10-contacts-list.png`
   - `11-inbox-empty.png`
   - `11-inbox-list.png`

## Fluxo de Teste para Screenshots

1. Landing → /licenca → volta para /
2. Primeiro acesso → /setup → completa wizard → /login
3. Login → /dashboard (vazio)
4. /settings → testa credenciais → conecta Instagram → mostra conta
5. /automations → cria nova → volta para lista
6. /contacts (mostra vazio, depois com dados mock)
7. /inbox (mostra vazio)

---

**Nota**: Screenshots reais serão capturados após o primeiro deploy de teste estar funcional com banco de dados populado.
