'use client';

import { useState, useEffect, Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, Instagram, Loader2, X } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { MCPTokenSection } from '@/components/settings/MCPTokenSection';

interface IGAccount {
  id: string;
  igUsername: string;
  igUserId: string;
  isActive: boolean;
  lastSyncAt: string | null;
  tokenExpiresAt: string | null;
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const [igAccounts, setIgAccounts] = useState<IGAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [testingCredentials, setTestingCredentials] = useState(false);
  const [showManualConnect, setShowManualConnect] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [manualConnecting, setManualConnecting] = useState(false);
  
  const [credentialsTest, setCredentialsTest] = useState<{
    appId: string;
    appSecret: string;
  }>({ appId: '', appSecret: '' });
  
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    hint?: string;
  } | null>(null);

  useEffect(() => {
    fetchAccounts();
    
    const error = searchParams?.get('error');
    const success = searchParams?.get('success');
    const errorMessage = searchParams?.get('message');
    const hint = searchParams?.get('hint');

    if (success === 'connected') {
      setMessage({
        type: 'success',
        text: 'Conta do Instagram conectada com sucesso!',
      });
    } else if (error) {
      setMessage({
        type: 'error',
        text: errorMessage || getErrorMessage(error),
        hint: hint || undefined,
      });
    }
  }, [searchParams]);

  const getErrorMessage = (error: string) => {
    const messages: Record<string, string> = {
      oauth_failed: 'Falha na autenticação OAuth',
      missing_params: 'Parâmetros ausentes',
      invalid_state: 'Estado inválido (possível CSRF)',
      csrf_mismatch: 'Token CSRF não corresponde',
      state_expired: 'Sessão OAuth expirada',
      no_config: 'Configuração do Meta não encontrada',
      token_exchange_failed: 'Falha ao trocar código por token',
      long_token_failed: 'Falha ao obter token de longa duração',
      discovery_failed: 'Falha ao descobrir contas',
      no_accounts: 'Nenhuma conta encontrada',
      callback_failed: 'Erro no callback OAuth',
    };
    return messages[error] || 'Erro desconhecido';
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/instagram/accounts');
      if (res.ok) {
        const data = await res.json();
        setIgAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    setMessage(null);
    window.location.href = '/api/instagram/connect?returnUrl=/settings';
  };

  const handleTestCredentials = async () => {
    if (!credentialsTest.appId || !credentialsTest.appSecret) {
      setMessage({
        type: 'error',
        text: 'Preencha App ID e App Secret para testar',
      });
      return;
    }

    setTestingCredentials(true);
    setMessage(null);

    try {
      const res = await fetch('/api/instagram/test-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentialsTest),
      });

      const data = await res.json();

      if (data.valid) {
        setMessage({
          type: 'success',
          text: '✓ Credenciais válidas! Você pode conectar sua conta do Instagram.',
        });
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Credenciais inválidas',
          hint: data.hint,
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Erro ao testar credenciais',
      });
    } finally {
      setTestingCredentials(false);
    }
  };

  const handleManualConnect = async () => {
    if (!manualToken.trim()) {
      setMessage({
        type: 'error',
        text: 'Cole o access token para conectar',
      });
      return;
    }

    setManualConnecting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/instagram/manual-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: manualToken }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Conta @${data.account.username} conectada com sucesso!`,
        });
        setManualToken('');
        setShowManualConnect(false);
        fetchAccounts();
      } else {
        setMessage({
          type: 'error',
          text: data.error || 'Erro ao conectar',
          hint: data.hint,
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Erro ao conectar conta',
      });
    } finally {
      setManualConnecting(false);
    }
  };

  const handleDisconnect = async (accountId: string, username: string) => {
    if (!confirm(`Desconectar @${username}? As automações desta conta serão pausadas.`)) {
      return;
    }

    try {
      const res = await fetch('/api/instagram/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      if (res.ok) {
        setMessage({
          type: 'success',
          text: `Conta @${username} desconectada`,
        });
        fetchAccounts();
      } else {
        setMessage({
          type: 'error',
          text: 'Erro ao desconectar conta',
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Erro ao desconectar conta',
      });
    }
  };

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhook`
    : process.env.NEXT_PUBLIC_URL
    ? `${process.env.NEXT_PUBLIC_URL}/api/webhook`
    : 'https://seu-dominio.com/api/webhook';

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600">Gerencie suas contas e integrações</p>
      </div>

      {message && (
        <Card className={`mb-6 ${message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          <CardContent className="p-6">
            <div className="flex gap-3">
              {message.type === 'error' ? (
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
              )}
              <div className="flex-1">
                <p className={`font-medium ${message.type === 'error' ? 'text-red-900' : 'text-green-900'}`}>
                  {message.text}
                </p>
                {message.hint && (
                  <p className={`mt-2 text-sm ${message.type === 'error' ? 'text-red-800' : 'text-green-800'}`}>
                    💡 {message.hint}
                  </p>
                )}
              </div>
              <button
                onClick={() => setMessage(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
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
            {testingCredentials ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testando...
              </>
            ) : (
              'Testar Credenciais'
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Instagram className="h-5 w-5" />
            Contas do Instagram
          </CardTitle>
          <CardDescription>
            Conecte suas contas do Instagram para começar a automatizar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-6">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary-600" />
            </div>
          ) : igAccounts.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-600 mb-4">
                Nenhuma conta conectada ainda
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={handleConnect} disabled={connecting}>
                  {connecting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    <>
                      <Instagram className="mr-2 h-4 w-4" />
                      Conectar Instagram
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowManualConnect(!showManualConnect)}
                >
                  Conectar com Token Manual
                </Button>
              </div>
              
              {showManualConnect && (
                <div className="mt-4 p-4 border border-gray-200 rounded-lg text-left">
                  <p className="text-sm text-gray-700 mb-3">
                    Cole um access token de system user ou long-lived token:
                  </p>
                  <Input
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="EAAG..."
                    className="mb-2"
                  />
                  <Button
                    onClick={handleManualConnect}
                    disabled={manualConnecting}
                    size="sm"
                  >
                    {manualConnecting ? 'Conectando...' : 'Conectar'}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {igAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100">
                      <Instagram className="h-5 w-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-medium">@{account.igUsername}</p>
                      <div className="flex items-center gap-2 text-sm">
                        {account.isActive ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Ativa
                          </span>
                        ) : (
                          <span className="text-gray-500">Inativa</span>
                        )}
                        {account.tokenExpiresAt && (
                          <span className="text-gray-500">
                            • Expira em{' '}
                            {Math.ceil(
                              (new Date(account.tokenExpiresAt).getTime() - Date.now()) /
                                (1000 * 60 * 60 * 24)
                            )}{' '}
                            dias
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {account.isActive && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDisconnect(account.id, account.igUsername)}
                      >
                        Desconectar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <div className="flex gap-2">
                <Button onClick={handleConnect} disabled={connecting} className="flex-1">
                  {connecting ? 'Conectando...' : '+ Adicionar Outra Conta'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowManualConnect(!showManualConnect)}
                >
                  Token Manual
                </Button>
              </div>

              {showManualConnect && (
                <div className="p-4 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-700 mb-3">
                    Cole um access token de system user ou long-lived token:
                  </p>
                  <Input
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="EAAG..."
                    className="mb-2"
                  />
                  <Button
                    onClick={handleManualConnect}
                    disabled={manualConnecting}
                    size="sm"
                  >
                    {manualConnecting ? 'Conectando...' : 'Conectar'}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mb-6">
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
                className="flex h-10 w-full rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-sm"
              />
              <Button
                variant="outline"
                onClick={() => navigator.clipboard.writeText(webhookUrl)}
              >
                Copiar
              </Button>
            </div>
          </div>
          <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-800">
            <p className="font-medium mb-2">Como configurar:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Acesse o Meta for Developers</li>
              <li>Vá em Webhooks do seu App</li>
              <li>Cole a URL acima</li>
              <li>Use o mesmo Verify Token configurado no setup</li>
              <li>Ative os campos: comments, mentions, messages</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sobre o Flowcomments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div>
              <span className="font-medium">Versão:</span> 0.1.0
            </div>
            <div>
              <span className="font-medium">Licença:</span> Flowcomments Sustainable Use License
            </div>
            <div className="flex items-start gap-2">
              <div className="h-8 w-8 rounded bg-primary-600 flex-shrink-0"></div>
              <div>
                <p className="font-medium">Powered by Flowcomments</p>
                <p className="text-gray-600">© 2026 Nathan Condé</p>
                <div className="mt-2 flex gap-3">
                  <a
                    href="/licenca"
                    className="text-primary-600 hover:underline"
                  >
                    Ver Licença
                  </a>
                  <a
                    href="https://github.com/NathanConde-dev/flowcomments"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:underline"
                  >
                    GitHub
                  </a>
                  <a
                    href="mailto:contato@nathanconde.com"
                    className="text-primary-600 hover:underline"
                  >
                    Contato
                  </a>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="p-8 max-w-4xl">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
