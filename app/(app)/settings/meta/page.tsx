'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dices, ExternalLink } from 'lucide-react';
import { useState, useEffect } from 'react';
import { MetaFieldHelp, getMetaFieldUrl } from '@/components/setup/MetaFieldHelp';
import { SettingsFormSkeleton } from '@/components/ui/skeletons';

function generateWebhookToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

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

  const appId = config.metaAppId;

  useEffect(() => {
    fetchConfig();
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('needConfig') === '1') {
        setMessage({
          type: 'error',
          text: 'Configure o Meta App antes de conectar o Instagram.',
        });
      }
    }
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

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' });
        if (data.config) setConfig((prev) => ({ ...prev, ...data.config }));
      } else {
        setMessage({
          type: 'error',
          text:
            data.error ||
            (res.status === 404
              ? 'API de configuração indisponível. Faça redeploy da versão mais recente.'
              : 'Erro ao salvar configurações'),
        });
      }
    } catch {
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

  const openMeta = (field: Parameters<typeof getMetaFieldUrl>[0]) => {
    window.open(getMetaFieldUrl(field, appId), '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return <SettingsFormSkeleton />;
  }

  return (
    <div className="w-full space-y-6">
      {message && (
        <div
          className={`rounded-2xl p-4 ${
            message.type === 'error' ? 'bg-red-50 text-red-900' : 'bg-green-50 text-green-900'
          }`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>Configuração do Meta App</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openMeta('appId')}
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
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                Meta App ID
                <MetaFieldHelp field="appId" appId={appId} compact />
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-600"
                onClick={() => openMeta('appId')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Abrir
              </Button>
            </div>
            <Input
              value={config.metaAppId}
              onChange={(e) => setConfig({ ...config, metaAppId: e.target.value })}
              placeholder="123456789012345"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                Meta App Secret
                <MetaFieldHelp field="appSecret" appId={appId} compact />
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-600"
                onClick={() => openMeta('appSecret')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Abrir
              </Button>
            </div>
            <Input
              type="password"
              value={config.metaAppSecret}
              onChange={(e) => setConfig({ ...config, metaAppSecret: e.target.value })}
              placeholder="••••••••••••••••"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                Meta Config ID
                <MetaFieldHelp field="configId" appId={appId} compact />
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-600"
                onClick={() => openMeta('configId')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Abrir
              </Button>
            </div>
            <Input
              value={config.metaConfigId}
              onChange={(e) => setConfig({ ...config, metaConfigId: e.target.value })}
              placeholder="987654321098765"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                Instagram App ID
                <MetaFieldHelp field="igAppId" appId={appId} compact />
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-600"
                onClick={() => openMeta('igAppId')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Abrir
              </Button>
            </div>
            <Input
              value={config.igAppId}
              onChange={(e) => setConfig({ ...config, igAppId: e.target.value })}
              placeholder="456789012345678"
            />
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                Instagram App Secret
                <MetaFieldHelp field="igAppSecret" appId={appId} compact />
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-zinc-600"
                onClick={() => openMeta('igAppSecret')}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                Abrir
              </Button>
            </div>
            <Input
              type="password"
              value={config.igAppSecret}
              onChange={(e) => setConfig({ ...config, igAppSecret: e.target.value })}
              placeholder="••••••••••••••••"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                Webhook Verify Token
                <MetaFieldHelp field="webhookToken" appId={appId} compact />
              </label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-zinc-600"
                  onClick={() =>
                    setConfig({
                      ...config,
                      webhookVerifyToken: generateWebhookToken(),
                    })
                  }
                >
                  <Dices className="mr-1 h-3 w-3" />
                  Gerar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-zinc-600"
                  onClick={() => openMeta('webhookToken')}
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Abrir
                </Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                value={config.webhookVerifyToken}
                onChange={(e) => setConfig({ ...config, webhookVerifyToken: e.target.value })}
                placeholder="Clique em Gerar e cole o mesmo token no Meta"
              />
              <Button
                type="button"
                variant="outline"
                disabled={!config.webhookVerifyToken || config.webhookVerifyToken.includes('••••')}
                onClick={() => navigator.clipboard.writeText(config.webhookVerifyToken)}
              >
                Copiar
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Gere um token, salve aqui e cole o mesmo valor no Verify Token do webhook na Meta.
            </p>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving} className={saving ? 'opacity-80' : undefined}>
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? 'Testando...' : 'Testar Credenciais'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>OAuth Callback URL</CardTitle>
              <CardDescription>
                Configure esta URL no Meta for Developers para o fluxo OAuth
              </CardDescription>
            </div>
            <MetaFieldHelp field="oauthCallback" appId={appId} />
          </div>
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
          <div className="rounded-xl bg-zinc-50 p-4 text-sm">
            <p className="font-medium mb-2">Como configurar no Meta:</p>
            <ol className="list-decimal list-inside space-y-1 text-zinc-700">
              <li>Abra Facebook Login for Business → Settings</li>
              <li>Cole a URL em Valid OAuth Redirect URIs</li>
              <li>Salve e teste o fluxo Conectar Instagram</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Webhook do Meta</CardTitle>
              <CardDescription>
                Configure este webhook no Meta for Developers
              </CardDescription>
            </div>
            <MetaFieldHelp field="webhookUrl" appId={appId} />
          </div>
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
          <div className="rounded-xl bg-zinc-50 p-4 text-sm">
            <p className="font-medium mb-2">Como configurar:</p>
            <ol className="list-decimal list-inside space-y-1 text-zinc-700">
              <li>Abra Webhooks do seu App</li>
              <li>Cole a URL acima no produto Instagram</li>
              <li>Use o Verify Token configurado acima</li>
              <li>Ative os campos: comments, mentions, messages</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
