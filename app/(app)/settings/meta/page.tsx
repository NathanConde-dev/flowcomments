'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

export default function MetaAppSettingsPage() {
  const [credentialsTest, setCredentialsTest] = useState({ appId: '', appSecret: '' });
  const [testingCredentials, setTestingCredentials] = useState(false);

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhook`
    : 'https://seu-dominio.com/api/webhook';

  const handleTestCredentials = async () => {
    if (!credentialsTest.appId || !credentialsTest.appSecret) {
      alert('Preencha App ID e App Secret');
      return;
    }

    setTestingCredentials(true);

    try {
      const res = await fetch('/api/instagram/test-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentialsTest),
      });

      const data = await res.json();
      alert(data.valid ? 'Credenciais válidas!' : data.error || 'Credenciais inválidas');
    } catch (error) {
      alert('Erro ao testar credenciais');
    } finally {
      setTestingCredentials(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Testar Credenciais do Meta App</CardTitle>
          <CardDescription>
            Valide suas credenciais antes de conectar uma conta
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">App ID</label>
            <Input
              value={credentialsTest.appId}
              onChange={(e) => setCredentialsTest({ ...credentialsTest, appId: e.target.value })}
              placeholder="123456789012345"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">App Secret</label>
            <Input
              type="password"
              value={credentialsTest.appSecret}
              onChange={(e) => setCredentialsTest({ ...credentialsTest, appSecret: e.target.value })}
              placeholder="••••••••••••••••"
            />
          </div>
          <Button onClick={handleTestCredentials} disabled={testingCredentials} variant="outline">
            {testingCredentials ? 'Testando...' : 'Testar Credenciais'}
          </Button>
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
              <li>Use o mesmo Verify Token configurado no setup</li>
              <li>Ative os campos: comments, mentions, messages</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
