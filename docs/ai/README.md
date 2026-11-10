# Assistente de IA para Setup do Flowcomments

O Flowcomments oferece duas formas de obter ajuda passo-a-passo na configuração do Meta App usando inteligência artificial.

## Opção 1: Prompt Pronto (Recomendado)

A forma mais simples: copie um prompt pronto e cole no seu assistente de IA favorito.

### Como usar:

1. No wizard de setup, clique no botão **"Configurar com IA"**
2. O prompt será copiado automaticamente para sua área de transferência
3. Cole no Claude, ChatGPT ou Cursor
4. Siga as instruções passo-a-passo do assistente

O prompt inclui:
- URLs específicas da sua instância
- Checklist completo de configuração
- Erros comuns e suas soluções
- Armadilhas importantes para evitar

### Acesso direto ao guia:

Você também pode acessar o guia em texto puro:
```
https://sua-instancia.com/setup-com-ia.md
```

## Opção 2: Servidor MCP (Avançado)

Para usuários que querem integração mais profunda, oferecemos um servidor MCP (Model Context Protocol) com ferramentas específicas.

### O que é MCP?

MCP permite que assistentes de IA acessem ferramentas e dados do Flowcomments em tempo real, verificando o status do setup e explicando erros específicos.

### Ferramentas disponíveis:

1. **get_setup_guide** - Retorna o guia completo com URLs da sua instância
2. **get_instance_urls** - URLs de webhook, OAuth, etc.
3. **check_setup_status** - Verifica quais etapas foram concluídas
4. **explain_error** - Explica erros específicos e fornece soluções

### Configuração:

#### 1. Gerar Token MCP

1. Vá em **Settings** → **Integrações**
2. Seção "MCP Server for AI"
3. Clique em "Gerar Token MCP"
4. **Copie e guarde o token** (só é mostrado uma vez)

#### 2. Configurar seu Cliente MCP

##### Claude Desktop

Adicione ao seu `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "flowcomments": {
      "url": "https://sua-instancia.com/api/mcp",
      "headers": {
        "Authorization": "Bearer SEU_TOKEN_MCP_AQUI"
      }
    }
  }
}
```

Localização do arquivo:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

##### Cursor

Adicione ao `mcp.json` do seu projeto:

```json
{
  "mcpServers": {
    "flowcomments": {
      "url": "https://sua-instancia.com/api/mcp",
      "headers": {
        "Authorization": "Bearer SEU_TOKEN_MCP_AQUI"
      }
    }
  }
}
```

##### ChatGPT (via Custom Actions)

No ChatGPT, crie uma Custom Action com este OpenAPI spec:

```yaml
openapi: 3.0.0
info:
  title: Flowcomments Setup Assistant
  version: 1.0.0
servers:
  - url: https://sua-instancia.com/api
paths:
  /mcp:
    post:
      operationId: callMCPTool
      summary: Call Flowcomments MCP tool
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                jsonrpc:
                  type: string
                  default: "2.0"
                id:
                  type: number
                method:
                  type: string
                params:
                  type: object
      responses:
        '200':
          description: Tool response
components:
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
```

Depois, adicione o token na seção "Authentication".

### Segurança

⚠️ **Importante**: 
- O servidor MCP **NUNCA** expõe App Secrets ou tokens de usuário
- Apenas informações de status e guias são acessíveis
- O token MCP pode ser regenerado a qualquer momento em Settings
- Cada instância tem seu próprio token independente

### Exemplos de uso:

Com MCP configurado, você pode perguntar ao assistente:

```
"Verifique o status do meu setup do Flowcomments"
```

```
"Explique o erro: Invalid OAuth access token"
```

```
"Me mostre as URLs que preciso configurar no Meta"
```

O assistente usará as ferramentas MCP automaticamente para responder com informações precisas e atualizadas da sua instância.

## Qual opção escolher?

### Use o Prompt Pronto se:
- ✅ Você quer uma solução simples e rápida
- ✅ Não quer configurar nada extra
- ✅ Só precisa de ajuda durante o setup inicial

### Use o Servidor MCP se:
- ✅ Você usa Claude Desktop ou Cursor regularmente
- ✅ Quer verificar o status do setup em tempo real
- ✅ Precisa de ajuda contínua, não apenas no setup inicial
- ✅ Está confortável editando arquivos de configuração

## Problemas comuns

### "Token MCP inválido"
- Verifique se copiou o token completo
- Regenere o token em Settings se necessário
- Certifique-se de incluir o prefixo "Bearer " no header

### "Endpoint MCP não responde"
- Verifique se sua instância está acessível via HTTPS
- Teste o endpoint manualmente: `curl -H "Authorization: Bearer TOKEN" https://sua-instancia.com/api/mcp -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`

### "Ferramentas MCP não aparecem"
- Reinicie o Claude Desktop ou Cursor
- Verifique se o arquivo de config está no local correto
- Valide o JSON (sem vírgulas extras, aspas corretas)

## Feedback

Encontrou algum problema ou tem sugestões? Abra uma issue no GitHub ou entre em contato: contato@nathanconde.com
