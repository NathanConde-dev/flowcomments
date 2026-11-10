# Guia de Configuração do Flowcomments com IA

Copie este prompt e cole no Claude, ChatGPT ou Cursor para receber ajuda passo-a-passo na configuração do Flowcomments.

---

Olá! Preciso de ajuda para configurar o **Flowcomments** (alternativa self-hosted ao ManyChat para Instagram). Vou te passar informações sobre minha instância e preciso que você me guie passo-a-passo na configuração do Meta App.

## Informações da Minha Instância

- **URL da aplicação**: {{NEXT_PUBLIC_URL}}
- **Webhook URL**: {{NEXT_PUBLIC_URL}}/api/webhook
- **OAuth Redirect URI**: {{NEXT_PUBLIC_URL}}/api/instagram/callback

## O Que Preciso Configurar

Preciso criar um aplicativo no Meta for Developers para integrar com o Instagram. Os passos principais são:

1. Criar App no Meta (tipo Business)
2. Adicionar produtos: Instagram, Facebook Login for Business, Webhooks
3. Configurar OAuth e permissões
4. Configurar Webhook
5. Obter credenciais (App ID, App Secret, Config ID)

## Erros Comuns e Soluções

### Erro: "Invalid OAuth access token"
**Causa**: Token sem permissões necessárias ou expirado
**Solução**: 
- Verificar se todas as permissões foram concedidas
- Reautenticar a conta do Instagram
- Verificar se o token não expirou

### Erro: "Instagram account not found in token"
**Causa**: App e Instagram no mesmo Business Portfolio
**Solução**: No diálogo de login, selecionar EXPLICITAMENTE a Página + Instagram. Não confiar na seleção automática.

### Erro: "Webhook verification failed"
**Causa**: Verify Token diferente entre Flowcomments e Meta
**Solução**: Verificar se o token é EXATAMENTE o mesmo em ambos os lugares

### Erro: "The app is in Development Mode"
**Causa**: App em modo desenvolvimento
**Solução**: 
- Para testes: adicionar usuário testador no app
- Para produção: enviar app para revisão da Meta

### Erro: "Instagram account must be Business or Creator"
**Causa**: Conta Instagram é pessoal
**Solução**: Converter para conta Profissional no Instagram

### Erro: "Page not linked to Instagram"
**Causa**: Página do Facebook não está vinculada ao Instagram
**Solução**: No Instagram, ir em Configurações > Empresa > Conectar página

## Checklist de Configuração

- [ ] Criar app tipo "Business" no Meta
- [ ] Adicionar produto "Instagram"
- [ ] Adicionar produto "Facebook Login for Business"
- [ ] Adicionar produto "Webhooks"
- [ ] Criar configuração no Facebook Login for Business
- [ ] Adicionar permissões obrigatórias:
  - [ ] instagram_basic
  - [ ] instagram_manage_comments
  - [ ] instagram_manage_messages
  - [ ] pages_show_list
  - [ ] pages_read_engagement
  - [ ] pages_manage_metadata
  - [ ] business_management
- [ ] Adicionar OAuth Redirect URI: {{NEXT_PUBLIC_URL}}/api/instagram/callback
- [ ] Configurar webhook:
  - [ ] Callback URL: {{NEXT_PUBLIC_URL}}/api/webhook
  - [ ] Verify Token (mesmo em ambos os lugares)
  - [ ] Inscrever campos: comments, messages, mentions
- [ ] Copiar App ID
- [ ] Copiar App Secret (clicar em "Mostrar")
- [ ] Copiar Config ID do Facebook Login for Business
- [ ] Instagram é conta Profissional (Business/Creator)
- [ ] Instagram vinculado a uma Página do Facebook
- [ ] Página e App no mesmo Business Manager (opcional mas recomendado)

## Armadilhas Importantes

⚠️ **ARMADILHA #1**: App e Instagram no mesmo portfolio
- Se o app e a conta Instagram estiverem no mesmo Business Portfolio, o token pode vir SEM a conta IG associada
- **Solução**: No diálogo de login OAuth, selecionar EXPLICITAMENTE a Página + Instagram

⚠️ **ARMADILHA #2**: Modo desenvolvimento
- Usuários que não têm role no app não conseguem fazer login
- **Solução**: Adicionar como testador OU publicar o app

⚠️ **ARMADILHA #3**: Webhook verify token
- Deve ser IDÊNTICO no Flowcomments e no Meta
- **Solução**: Copiar e colar, não digitar manualmente

⚠️ **ARMADILHA #4**: HTTPS obrigatório
- Webhooks não funcionam com http://localhost
- **Solução**: Railway/Heroku fornecem HTTPS automaticamente

## Como Você Pode Me Ajudar

Por favor:
1. Me guie passo-a-passo na criação do app Meta
2. Me avise sobre cada armadilha quando chegarmos nela
3. Se eu te passar um erro, me ajude a diagnosticar baseado na lista acima
4. Confirme cada etapa antes de prosseguir para a próxima

Vamos começar?
