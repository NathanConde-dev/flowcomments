'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/ui/status-badge';
import { Copy, Key, Sparkles } from 'lucide-react';
import { toast } from '@/lib/ui/toast';

type Guide = {
  id: string;
  name: string;
  shortName: string;
  summary: string;
  steps: string[];
  fileHint?: string[];
  configKey: 'claude' | 'cursor' | 'chatgpt' | 'gemini' | 'generic';
};

const GUIDES: Guide[] = [
  {
    id: 'claude',
    name: 'Claude (Desktop)',
    shortName: 'Claude',
    summary: 'Ideal se você usa o app Claude no computador.',
    steps: [
      'Gere o token MCP nesta página e copie.',
      'Abra o arquivo de configuração do Claude Desktop.',
      'Cole a configuração abaixo (troque SEU_TOKEN_AQUI pelo token).',
      'Salve o arquivo e reinicie o Claude.',
      'Pergunte algo como: “verifique o setup do Flowcomments”.',
    ],
    fileHint: [
      'macOS: ~/Library/Application Support/Claude/claude_desktop_config.json',
      'Windows: %APPDATA%\\Claude\\claude_desktop_config.json',
    ],
    configKey: 'claude',
  },
  {
    id: 'cursor',
    name: 'Cursor',
    shortName: 'Cursor',
    summary: 'Para quem programa no Cursor e quer a IA ajudando no setup.',
    steps: [
      'Gere e copie o token MCP.',
      'No projeto, abra ou crie o arquivo mcp.json (ou use Settings → MCP).',
      'Cole a configuração e substitua SEU_TOKEN_AQUI.',
      'Recarregue o Cursor e ative o servidor “flowcomments”.',
      'Peça ajuda no chat: “cheque se o Instagram está conectado”.',
    ],
    fileHint: ['Arquivo comum: .cursor/mcp.json ou configuração MCP nas settings do Cursor'],
    configKey: 'cursor',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    shortName: 'ChatGPT',
    summary: 'Use se a sua conta/plano permitir conectores ou apps com MCP.',
    steps: [
      'Gere e copie o token MCP.',
      'No ChatGPT, abra Configurações / Conectores (ou Apps) e procure a opção de MCP/custom connector.',
      'Informe a URL do servidor e o token (Authorization Bearer).',
      'Salve e teste pedindo: “liste o status do Flowcomments”.',
      'Se a opção não aparecer, o plano atual pode não liberar MCP ainda. Use Claude ou Cursor.',
    ],
    fileHint: [
      'URL do servidor: use a URL desta instalação + /api/mcp',
      'Header: Authorization: Bearer SEU_TOKEN_AQUI',
    ],
    configKey: 'chatgpt',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    shortName: 'Gemini',
    summary: 'Funciona quando o produto Google que você usa aceitar servidor MCP remoto.',
    steps: [
      'Gere e copie o token MCP.',
      'No Gemini / Google AI Studio (ou app com suporte a MCP), adicione um servidor remoto.',
      'Cole a URL /api/mcp e o token Bearer.',
      'Confirme a conexão e faça um teste simples de status.',
      'Se não houver campo de MCP, use Claude Desktop ou Cursor por enquanto.',
    ],
    fileHint: ['URL: {BASE}/api/mcp', 'Autenticação: Bearer SEU_TOKEN_AQUI'],
    configKey: 'gemini',
  },
  {
    id: 'outros',
    name: 'Outros (Windsurf, Continue, etc.)',
    shortName: 'Outros',
    summary: 'Qualquer cliente que aceite MCP por URL + token.',
    steps: [
      'Gere o token nesta página.',
      'No app de IA, procure “MCP server”, “custom tools” ou “connectors”.',
      'Use a URL /api/mcp e Authorization Bearer com o token.',
      'Reinicie o app se pedido e teste uma pergunta de diagnóstico.',
    ],
    configKey: 'generic',
  },
];

export function MCPTokenSection() {
  const [hasToken, setHasToken] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [activeGuideId, setActiveGuideId] = useState(GUIDES[0].id);

  const activeGuide = GUIDES.find((g) => g.id === activeGuideId) ?? GUIDES[0];

  useEffect(() => {
    setBaseUrl(window.location.origin);
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const res = await fetch('/api/settings/mcp-token');
      if (res.ok) {
        const data = await res.json();
        setHasToken(data.hasToken);
      }
    } catch (error) {
      console.error('Error checking MCP token:', error);
    }
  };

  const generateToken = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/settings/mcp-token', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setGeneratedToken(data.token);
        setHasToken(true);
        toast.success('Token MCP gerado', 'Copie agora — ele só aparece uma vez.');
      } else {
        toast.error('Erro ao gerar token');
      }
    } catch {
      toast.error('Erro ao gerar token');
    } finally {
      setGenerating(false);
    }
  };

  const revokeToken = async () => {
    if (!confirm('Tem certeza? As conexões MCP atuais vão parar de funcionar.')) {
      return;
    }

    try {
      const res = await fetch('/api/settings/mcp-token', { method: 'DELETE' });
      if (res.ok) {
        setHasToken(false);
        setGeneratedToken(null);
        toast.success('Token MCP revogado');
      } else {
        toast.error('Erro ao revogar token');
      }
    } catch {
      toast.error('Erro ao revogar token');
    }
  };

  const buildConfig = (key: Guide['configKey']) => {
    const tokenPlaceholder = 'SEU_TOKEN_AQUI';
    const url = `${baseUrl}/api/mcp`;

    if (key === 'chatgpt' || key === 'gemini' || key === 'generic') {
      return `URL: ${url}
Header: Authorization: Bearer ${tokenPlaceholder}`;
    }

    return `{
  "mcpServers": {
    "flowcomments": {
      "url": "${url}",
      "headers": {
        "Authorization": "Bearer ${tokenPlaceholder}"
      }
    }
  }
}`;
  };

  const copyText = async (value: string, id: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(id);
    toast.success('Copiado');
    setTimeout(() => setCopied(null), 1600);
  };

  const config = buildConfig(activeGuide.configKey);

  return (
    <div className="w-full space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Ajuda com IA (MCP)
          </CardTitle>
          <CardDescription>
            Em português simples: o MCP é uma “ponte” que deixa a IA do seu computador acessar
            ferramentas do Flowcomments (checar setup, URLs, erros). Você gera um token (uma senha
            especial) e cola no Claude, Cursor, ChatGPT, Gemini ou outro app compatível.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">Como funciona (3 passos)</p>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">1.</span> Gere o token abaixo e guarde
                em local seguro.
              </li>
              <li>
                <span className="font-medium text-foreground">2.</span> Escolha sua IA na aba e siga
                o guia.
              </li>
              <li>
                <span className="font-medium text-foreground">3.</span> Peça para a IA “verificar o
                setup do Flowcomments”.
              </li>
            </ol>
          </div>

          <div className="rounded-2xl border border-border bg-white">
            <div className="border-b border-border px-3 pt-3 sm:px-4">
              <p className="px-1 text-sm font-semibold text-foreground">Escolha sua IA</p>
              <p className="mt-1 px-1 text-sm text-muted-foreground">
                Toque na aba do app que você usa. Os passos são feitos para quem não é técnico.
              </p>
              <div
                role="tablist"
                aria-label="Guias por IA"
                className="mt-3 flex gap-1 overflow-x-auto pb-px [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {GUIDES.map((guide) => {
                  const active = guide.id === activeGuideId;
                  return (
                    <button
                      key={guide.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveGuideId(guide.id)}
                      className={`shrink-0 cursor-pointer rounded-t-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        active
                          ? 'border border-b-white border-border bg-white text-foreground'
                          : 'border border-transparent text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {guide.shortName}
                    </button>
                  );
                })}
              </div>
            </div>

            <div role="tabpanel" className="space-y-5 p-4 sm:p-5">
              <div>
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  {activeGuide.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{activeGuide.summary}</p>
              </div>

              <ol className="space-y-2.5 text-sm text-muted-foreground">
                {activeGuide.steps.map((step, index) => (
                  <li key={step} className="flex gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-[11px] font-semibold text-white">
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>

              {activeGuide.fileHint && (
                <div className="rounded-xl bg-muted/50 p-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Onde colocar</p>
                  <ul className="mt-2 space-y-1">
                    {activeGuide.fileHint.map((hint) => (
                      <li key={hint} className="break-all text-xs sm:text-sm">
                        {hint.replace('{BASE}', baseUrl || 'https://seu-dominio')}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">Configuração para copiar</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => copyText(config, activeGuide.id)}
                  >
                    <Copy className="mr-2 h-3.5 w-3.5" />
                    {copied === activeGuide.id ? 'Copiado' : 'Copiar'}
                  </Button>
                </div>
                <p className="mb-2 text-xs text-muted-foreground">
                  Substitua <code className="rounded bg-muted px-1 py-0.5">SEU_TOKEN_AQUI</code> pelo
                  seu token.
                </p>
                <pre className="overflow-x-auto rounded-xl bg-zinc-950 p-4 text-xs text-zinc-100">
                  {config}
                </pre>
              </div>
            </div>
          </div>

          {!hasToken ? (
            <div className="rounded-2xl border border-dashed border-border bg-white p-5">
              <p className="text-sm text-muted-foreground">
                Ainda não há token. Sem ele, nenhuma IA consegue se conectar a esta instalação.
              </p>
              <Button onClick={generateToken} disabled={generating} className="mt-4 rounded-full">
                <Key className="mr-2 h-4 w-4" />
                {generating ? 'Gerando...' : 'Gerar token MCP'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {generatedToken && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                  <StatusBadge tone="pending">Copie agora</StatusBadge>
                  <p className="mt-3 text-sm text-amber-950">
                    Este token aparece só uma vez. Cole no app de IA e guarde em um gerenciador de
                    senhas.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={generatedToken}
                      readOnly
                      className="bg-white font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      className="shrink-0 rounded-full"
                      onClick={() => copyText(generatedToken, 'token')}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      {copied === 'token' ? 'Copiado' : 'Copiar token'}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-white p-4">
                <div className="flex items-center gap-2">
                  <StatusBadge tone="success">Token ativo</StatusBadge>
                  <span className="text-sm text-muted-foreground">
                    Pronto para conectar suas IAs
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="rounded-full" onClick={generateToken}>
                    Gerar novo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full text-red-600 hover:text-red-700"
                    onClick={revokeToken}
                  >
                    Revogar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">O que a IA consegue fazer</CardTitle>
          <CardDescription>
            Depois de conectada, ela pode usar estas ferramentas no Flowcomments:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <li className="rounded-xl bg-muted/40 px-3 py-2">Ver guia de setup</li>
            <li className="rounded-xl bg-muted/40 px-3 py-2">Checar status da instalação</li>
            <li className="rounded-xl bg-muted/40 px-3 py-2">Mostrar URLs da instância</li>
            <li className="rounded-xl bg-muted/40 px-3 py-2">Testar credenciais da Meta</li>
            <li className="rounded-xl bg-muted/40 px-3 py-2 sm:col-span-2">
              Explicar erros comuns em linguagem simples
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
