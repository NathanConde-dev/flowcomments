'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, HelpCircle, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';

interface MetaConfig {
  metaAppId: string;
  metaAppSecret: string;
  metaConfigId: string;
  igAppId: string;
  igAppSecret: string;
  webhookVerifyToken: string;
}

export default function MetaAppSettingsPage() {
  const [config, setConfig] = useState<MetaConfig>({
    metaAppId: '',
    metaAppSecret: '',
    metaConfigId: '',
    igAppId: '',
    igAppSecret: '',
    webhookVerifyToken: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhook`
    : process.env.NEXT_PUBLIC_URL
    ? `${process.env.NEXT_PUBLIC_URL}/api/webhook`
    : 'https://seu-dominio.com/api/webhook';

  const oauthCallbackUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/instagram/callback`
    : process.env.NEXT_PUBLIC_URL
    ? `${process.env.NEXT_PUBLIC_URL}/api/instagram/callback`
    : 'https://seu-dominio.com/api/instagram/callback';

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/settings/meta');
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config || config);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/settings/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Erro ao salvar configurações' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao salvar configurações' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!config.metaAppId || !config.metaAppSecret) {
      setMessage({ type: 'error', text: 'Preencha App ID e App Secret para testar' });
      return;
    }

    setTesting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/instagram/test-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId: config.metaAppId, appSecret: config.metaAppSecret }),
      });

      const data = await res.json();
      setMessage({
        type: data.valid ? 'success' : 'error',
        text: data.valid ? '✓ Credenciais válidas!' : data.error || 'Credenciais inválidas',
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Erro ao testar credenciais' });
    } finally {
      setTesting(false);
    }
  };

  const MetaFieldHelp = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <button
      type="button"
      className="inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-zinc-700"
      title={title}
      onClick={(e) => {
        e.preventDefault();
        alert(`${title}\n\n${children}`);
      }}
    >
      <HelpCircle className="w-3 h-3" />
    </button>
  );

  if (loading) {
    return (
      <div className="max-w-3xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'error' ? 'bg-red-50 text-red-900' : 'bg-green-50 text-green-900'
          }`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Configuração do Meta App</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://developers.facebook.com/apps/', '_blank')}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Abrir na Meta
            </Button>
          </div>
          <CardDescription>
            Configure as credenciais do seu Meta App para conectar contas do Instagram
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              Meta App ID
              <MetaFieldHelp title="Meta App ID">
                ID do aplicativo no Meta for Developers (App Dashboard → Settings → Basic)
              </MetaFieldHelp>
            </label>
            <Input
              value={config.metaAppId}
              onChange={(e) => setConfig({ ...config, metaAppId: e.target.value })}
              placeholder="123456789012345"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              Meta App Secret
              <MetaFieldHelp title="Meta App Secret">
                Secret do aplicativo no Meta for Developers (App Dashboard → Settings → Basic)
              </MetaFieldHelp>
            </label>
            <Input
              type="password"
              value={config.metaAppSecret}
              onChange={(e) => setConfig({ ...config, metaAppSecret: e.target.value })}
              placeholder="••••••••••••••••"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              Meta Config ID
              <MetaFieldHelp title="Meta Config ID">
                ID da configuração do Instagram no Meta App (Products → Instagram → Settings)
              </MetaFieldHelp>
            </label>
            <Input
              value={config.metaConfigId}
              onChange={(e) => setConfig({ ...config, metaConfigId: e.target.value })}
              placeholder="987654321098765"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              Instagram App ID
              <MetaFieldHelp title="Instagram App ID">
                ID do Instagram Business App vinculado (opcional, usado em alguns fluxos OAuth)
              </MetaFieldHelp>
            </label>
            <Input
              value={config.igAppId}
              onChange={(e) => setConfig({ ...config, igAppId: e.target.value })}
              placeholder="456789012345678"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              Instagram App Secret
              <MetaFieldHelp title="Instagram App Secret">
                Secret do Instagram Business App vinculado (opcional)
              </MetaFieldHelp>
            </label>
            <Input
              type="password"
              value={config.igAppSecret}
              onChange={(e) => setConfig({ ...config, igAppSecret: e.target.value })}
              placeholder="••••••••••••••••"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2">
              Webhook Verify Token
              <MetaFieldHelp title="Webhook Verify Token">
                Token usado para verificar webhooks (configure o mesmo valor no Meta for Developers)
              </MetaFieldHelp>
            </label>
            <Input
              value={config.webhookVerifyToken}
              onChange={(e) => setConfig({ ...config, webhookVerifyToken: e.target.value })}
              placeholder="seu_token_secreto_aqui"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configurações'
              )}
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? 'Testando...' : 'Testar Credenciais'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>OAuth Callback URL</CardTitle>
          <CardDescription>
            Configure esta URL no Meta for Developers para o fluxo OAuth
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Callback URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={oauthCallbackUrl}
                readOnly
                className="flex h-10 w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm"
              />
              <Button
                variant="outline"
                onClick={() => navigator.clipboard.writeText(oauthCallbackUrl)}
              >
                Copiar
              </Button>
            </div>
          </div>
          <div className="rounded-lg bg-zinc-50 p-4 text-sm">
            <p className="font-medium mb-2">Como configurar no Meta:</p>
            <ol className="list-decimal list-inside space-y-1 text-zinc-700">
              <li>Acesse o Meta for Developers</li>
              <li>Vá em Use Cases → Authentication and Account Creation</li>
              <li>Cole a URL acima em Valid OAuth Redirect URIs</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhook do Meta</CardTitle>
          <CardDescription>
            Configure este webhook no Meta for Developers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">URL do Webhook</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="flex h-10 w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm"
              />
              <Button
                variant="outline"
                onClick={() => navigator.clipboard.writeText(webhookUrl)}
              >
                Copiar
              </Button>
            </div>
          </div>
          <div className="rounded-lg bg-zinc-50 p-4 text-sm">
            <p className="font-medium mb-2">Como configurar:</p>
            <ol className="list-decimal list-inside space-y-1 text-zinc-700">
              <li>Acesse o Meta for Developers</li>
              <li>Vá em Webhooks do seu App</li>
              <li>Cole a URL acima</li>
              <li>Use o Verify Token configurado acima</li>
              <li>Ative os campos: comments, mentions, messages</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
