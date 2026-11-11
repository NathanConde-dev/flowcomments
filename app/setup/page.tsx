'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MetaFieldHelp } from '@/components/setup/MetaFieldHelp';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { Copy } from 'lucide-react';
import { toast } from '@/lib/ui/toast';

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [adminData, setAdminData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
  });

  const [metaConfig, setMetaConfig] = useState({
    appId: '',
    appSecret: '',
    configId: '',
    webhookVerifyToken: '',
  });

  const generateToken = () => {
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    setMetaConfig({ ...metaConfig, webhookVerifyToken: token });
    toast.success('Verify Token gerado');
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (adminData.password !== adminData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (adminData.password.length < 8) {
      toast.error('A senha deve ter pelo menos 8 caracteres');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/setup/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminData),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao criar admin');
      }

      toast.success('Administrador criado');
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleMetaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/setup/meta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metaConfig),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erro ao salvar configuração');
      }

      toast.success('Configuração Meta salva');
      setStep(3);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    router.push('/login');
  };

  const webhookUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/webhook`
    : 'https://seu-dominio.com/api/webhook';

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="mb-8 text-center">
          <BrandLogo as="p" className="mb-3 text-3xl text-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Configuração Inicial</h1>
          <p className="mt-2 text-gray-600">Configure o Flowcomments em {step === 1 ? '2' : step === 2 ? '1' : '0'} passos</p>
        </div>

        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Criar Conta Administrador</CardTitle>
              <CardDescription>
                Crie sua conta de administrador para gerenciar o sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAdminSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Nome de Usuário</label>
                  <Input
                    type="text"
                    value={adminData.username}
                    onChange={(e) => setAdminData({ ...adminData, username: e.target.value })}
                    placeholder="admin"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">E-mail</label>
                  <Input
                    type="email"
                    value={adminData.email}
                    onChange={(e) => setAdminData({ ...adminData, email: e.target.value })}
                    placeholder="admin@exemplo.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Senha</label>
                  <Input
                    type="password"
                    value={adminData.password}
                    onChange={(e) => setAdminData({ ...adminData, password: e.target.value })}
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Confirmar Senha</label>
                  <Input
                    type="password"
                    value={adminData.confirmPassword}
                    onChange={(e) => setAdminData({ ...adminData, confirmPassword: e.target.value })}
                    placeholder="••••••••"
                    required
                    minLength={8}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Criando...' : 'Continuar'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>Configurar Meta App</CardTitle>
                  <CardDescription>
                    Configure suas credenciais do Meta/Facebook para integração com Instagram
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                    const prompt = await fetch('/setup-com-ia.md').then(r => r.text());
                    const filled = prompt
                      .replace(/\{\{NEXT_PUBLIC_URL\}\}/g, baseUrl);
                    await navigator.clipboard.writeText(filled);
                    toast.success(
                      'Prompt copiado!',
                      'Cole no Claude, ChatGPT ou Cursor para receber ajuda passo a passo.'
                    );
                  }}
                  className="ml-4"
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Configurar com IA
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleMetaSubmit} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">App ID</label>
                    <MetaFieldHelp field="appId" appId={metaConfig.appId} />
                  </div>
                  <Input
                    type="text"
                    value={metaConfig.appId}
                    onChange={(e) => setMetaConfig({ ...metaConfig, appId: e.target.value })}
                    placeholder="123456789012345"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Encontre no painel do Meta for Developers
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">App Secret</label>
                    <MetaFieldHelp field="appSecret" appId={metaConfig.appId} />
                  </div>
                  <Input
                    type="password"
                    value={metaConfig.appSecret}
                    onChange={(e) => setMetaConfig({ ...metaConfig, appSecret: e.target.value })}
                    placeholder="••••••••••••••••"
                    required
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Config ID (Facebook Login)</label>
                    <MetaFieldHelp field="configId" appId={metaConfig.appId} />
                  </div>
                  <Input
                    type="text"
                    value={metaConfig.configId}
                    onChange={(e) => setMetaConfig({ ...metaConfig, configId: e.target.value })}
                    placeholder="123456789012345"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Opcional: ID da configuração do Facebook Login for Business
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium">Webhook Verify Token</label>
                    <MetaFieldHelp 
                      field="webhookToken" 
                      appId={metaConfig.appId}
                      onGenerate={generateToken}
                    />
                  </div>
                  <Input
                    type="text"
                    value={metaConfig.webhookVerifyToken}
                    onChange={(e) => setMetaConfig({ ...metaConfig, webhookVerifyToken: e.target.value })}
                    placeholder="meu-token-secreto-123"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Crie um token aleatório e use o mesmo no painel do Meta
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="rounded-lg bg-zinc-50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-blue-900">
                        URL do Webhook (cole no Meta):
                      </p>
                      <MetaFieldHelp field="webhookUrl" appId={metaConfig.appId} />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={webhookUrl}
                        readOnly
                        className="text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(webhookUrl)}
                      >
                        Copiar
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-lg bg-purple-50 p-4">
                    <p className="text-sm font-medium text-purple-900 mb-2">
                      OAuth Redirect URI (adicione no Meta):
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={typeof window !== 'undefined' 
                          ? `${window.location.origin}/api/instagram/callback`
                          : 'https://seu-dominio.com/api/instagram/callback'}
                        readOnly
                        className="text-xs"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const url = typeof window !== 'undefined' 
                            ? `${window.location.origin}/api/instagram/callback`
                            : '';
                          navigator.clipboard.writeText(url);
                          toast.success('URL de callback copiada');
                        }}
                      >
                        Copiar
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-purple-700">
                      Cole em: Facebook Login for Business → Settings → Valid OAuth Redirect URIs
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={loading}
                  >
                    Voltar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? 'Salvando...' : 'Continuar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>✓ Configuração Concluída!</CardTitle>
              <CardDescription>
                O Flowcomments está pronto para uso
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-sm text-green-800">
                  Sua conta foi criada e as configurações foram salvas com sucesso.
                </p>
              </div>
              <div className="rounded-lg bg-yellow-50 p-4">
                <p className="text-sm font-medium text-yellow-900 mb-2">
                  Próximos passos:
                </p>
                <ol className="list-decimal list-inside text-sm text-yellow-800 space-y-1">
                  <li>Faça login com suas credenciais</li>
                  <li>Conecte sua conta do Instagram</li>
                  <li>Configure seu webhook no Meta for Developers</li>
                  <li>Crie sua primeira automação</li>
                </ol>
              </div>
              <Button onClick={handleFinish} className="w-full">
                Ir para Login
              </Button>
            </CardContent>
          </Card>
        )}

        <footer className="mt-8 text-center text-sm text-gray-600">
          Powered by Flowcomments © 2026 Nathan Condé
        </footer>
      </div>
    </div>
  );
}
