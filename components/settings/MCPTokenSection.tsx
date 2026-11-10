'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Key, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function MCPTokenSection() {
  const [hasToken, setHasToken] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('');

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
      } else {
        alert('Erro ao gerar token');
      }
    } catch (error) {
      alert('Erro ao gerar token');
    } finally {
      setGenerating(false);
    }
  };

  const revokeToken = async () => {
    if (!confirm('Tem certeza? Todas as conexões MCP existentes pararão de funcionar.')) {
      return;
    }

    try {
      const res = await fetch('/api/settings/mcp-token', { method: 'DELETE' });
      if (res.ok) {
        setHasToken(false);
        setGeneratedToken(null);
        alert('Token revogado com sucesso');
      }
    } catch (error) {
      alert('Erro ao revogar token');
    }
  };

  const claudeDesktopConfig = `{
  "mcpServers": {
    "flowcomments": {
      "url": "${baseUrl}/api/mcp",
      "headers": {
        "Authorization": "Bearer SEU_TOKEN_AQUI"
      }
    }
  }
}`;

  const cursorConfig = `{
  "mcpServers": {
    "flowcomments": {
      "url": "${baseUrl}/api/mcp",
      "headers": {
        "Authorization": "Bearer SEU_TOKEN_AQUI"
      }
    }
  }
}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Servidor MCP para IA
        </CardTitle>
        <CardDescription>
          Conecte assistentes de IA (Claude, Cursor, ChatGPT) para obter ajuda em tempo real
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasToken ? (
          <div className="rounded-lg bg-gray-50 p-4">
            <p className="text-sm text-gray-700 mb-4">
              Gere um token MCP para permitir que assistentes de IA acessem ferramentas de setup e diagnóstico.
              O token é armazenado de forma segura (SHA-256) e só é exibido uma vez.
            </p>
            <Button onClick={generateToken} disabled={generating}>
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Key className="h-4 w-4 mr-2" />
                  Gerar Token MCP
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {generatedToken && (
              <div className="rounded-lg bg-yellow-50 border-2 border-yellow-200 p-4">
                <p className="text-sm font-medium text-yellow-900 mb-2">
                  ⚠️ Copie e guarde este token agora! Ele não será exibido novamente.
                </p>
                <div className="flex gap-2">
                  <Input
                    value={generatedToken}
                    readOnly
                    className="font-mono text-xs bg-white"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedToken);
                      alert('Token copiado!');
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="rounded-lg bg-green-50 p-4">
              <p className="text-sm text-green-800 mb-2">
                ✓ Token MCP ativo
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={revokeToken}
                className="text-red-600 hover:text-red-700"
              >
                Revogar Token
              </Button>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-sm">Configurações para Clientes MCP:</h4>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Copy className="h-4 w-4 mr-2" />
                    Claude Desktop
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Configuração para Claude Desktop</DialogTitle>
                    <DialogDescription>
                      Adicione ao arquivo claude_desktop_config.json
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Localização do arquivo:</p>
                      <ul className="text-xs text-gray-600 list-disc list-inside space-y-1">
                        <li>macOS: <code>~/Library/Application Support/Claude/claude_desktop_config.json</code></li>
                        <li>Windows: <code>%APPDATA%\Claude\claude_desktop_config.json</code></li>
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-2">Configuração:</p>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                        {claudeDesktopConfig}
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          navigator.clipboard.writeText(claudeDesktopConfig);
                          alert('Configuração copiada!');
                        }}
                      >
                        <Copy className="h-3 w-3 mr-2" />
                        Copiar
                      </Button>
                    </div>
                    <p className="text-xs text-gray-600">
                      Substitua <code>SEU_TOKEN_AQUI</code> pelo token gerado acima.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Copy className="h-4 w-4 mr-2" />
                    Cursor (mcp.json)
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Configuração para Cursor</DialogTitle>
                    <DialogDescription>
                      Adicione ao arquivo mcp.json do seu projeto
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Configuração:</p>
                      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                        {cursorConfig}
                      </pre>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          navigator.clipboard.writeText(cursorConfig);
                          alert('Configuração copiada!');
                        }}
                      >
                        <Copy className="h-3 w-3 mr-2" />
                        Copiar
                      </Button>
                    </div>
                    <p className="text-xs text-gray-600">
                      Substitua <code>SEU_TOKEN_AQUI</code> pelo token gerado acima.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              <a 
                href="/docs/ai" 
                target="_blank"
                className="block"
              >
                <Button variant="outline" size="sm" className="w-full justify-start">
                  Documentação Completa →
                </Button>
              </a>
            </div>
          </div>
        )}

        <div className="rounded-lg bg-zinc-50 p-4">
          <p className="text-xs text-blue-900">
            <strong>Ferramentas disponíveis:</strong> get_setup_guide, get_instance_urls, 
            check_setup_status, test_meta_credentials, explain_error
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
