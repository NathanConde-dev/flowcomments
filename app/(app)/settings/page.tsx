'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Instagram, Settings as SettingsIcon, Cpu, User, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MCPTokenSection } from '@/components/settings/MCPTokenSection';
import { MetaFieldHelp } from '@/components/setup/MetaFieldHelp';

const tabs = [
  { id: 'geral', label: 'Geral', icon: SettingsIcon },
  { id: 'instagram', label: 'Instagram / Canais', icon: Instagram },
  { id: 'meta', label: 'Meta App', icon: Shield },
  { id: 'mcp', label: 'MCP / IA', icon: Cpu },
  { id: 'conta', label: 'Conta', icon: User },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('geral');
  const [metaConfig, setMetaConfig] = useState({
    appId: '',
    appSecret: '',
    configId: '',
    webhookVerifyToken: '',
  });

  const webhookUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/webhook`
    : '';

  const oauthCallbackUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/instagram/oauth/callback`
    : '';

  useEffect(() => {
    // TODO: Fetch meta config from API
  }, []);

  return (
    <div className="flex h-full">
      {/* Left Sidebar Navigation */}
      <aside className="w-64 border-r border-neutral-200 bg-white p-4">
        <nav className="space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                )}
              >
                <Icon className="mr-3 h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'geral' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">Configurações Gerais</h1>
              <p className="text-sm text-neutral-600">Gerencie as configurações gerais da sua conta</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Informações da Instância</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>URL do Webhook</Label>
                  <div className="mt-1 flex gap-2">
                    <Input value={webhookUrl} readOnly />
                    <Button
                      variant="outline"
                      onClick={() => navigator.clipboard.writeText(webhookUrl)}
                    >
                      Copiar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'instagram' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">Instagram / Canais</h1>
              <p className="text-sm text-neutral-600">Gerencie suas contas conectadas do Instagram</p>
            </div>

            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
                  <Instagram className="h-8 w-8 text-neutral-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-neutral-900">
                  Nenhuma conta conectada
                </h3>
                <p className="mb-4 text-sm text-neutral-600">
                  Conecte sua conta do Instagram para começar
                </p>
                <Button className="bg-neutral-900 hover:bg-neutral-800">
                  <Instagram className="mr-2 h-4 w-4" />
                  Conectar Instagram
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'meta' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">Configuração Meta App</h1>
              <p className="text-sm text-neutral-600">
                Configure suas credenciais do Meta Developer
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Credenciais Meta</CardTitle>
                <CardDescription>
                  Insira as credenciais do seu app do Meta Developer Portal
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <Label>App ID</Label>
                    <MetaFieldHelp field="appId" />
                  </div>
                  <Input
                    value={metaConfig.appId}
                    onChange={(e) => setMetaConfig({ ...metaConfig, appId: e.target.value })}
                    placeholder="123456789012345"
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <Label>App Secret</Label>
                    <MetaFieldHelp field="appSecret" />
                  </div>
                  <Input
                    type="password"
                    value={metaConfig.appSecret}
                    onChange={(e) => setMetaConfig({ ...metaConfig, appSecret: e.target.value })}
                    placeholder="••••••••••••••••"
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <Label>Configuration ID</Label>
                    <MetaFieldHelp field="configId" />
                  </div>
                  <Input
                    value={metaConfig.configId}
                    onChange={(e) => setMetaConfig({ ...metaConfig, configId: e.target.value })}
                    placeholder="987654321098765"
                  />
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <Label>Webhook Verify Token</Label>
                    <MetaFieldHelp field="webhookVerifyToken" />
                  </div>
                  <Input
                    value={metaConfig.webhookVerifyToken}
                    onChange={(e) =>
                      setMetaConfig({ ...metaConfig, webhookVerifyToken: e.target.value })
                    }
                    placeholder="seu_token_secreto"
                  />
                </div>

                <div>
                  <Label>URL de Callback OAuth</Label>
                  <div className="mt-1 flex gap-2">
                    <Input value={oauthCallbackUrl} readOnly />
                    <Button
                      variant="outline"
                      onClick={() => navigator.clipboard.writeText(oauthCallbackUrl)}
                    >
                      Copiar
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-neutral-500">
                    Adicione esta URL nas configurações de OAuth do seu app Meta
                  </p>
                </div>

                <Button className="bg-neutral-900 hover:bg-neutral-800">Salvar</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'mcp' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">MCP / IA</h1>
              <p className="text-sm text-neutral-600">
                Configure tokens MCP para assistentes de IA
              </p>
            </div>

            <MCPTokenSection />
          </div>
        )}

        {activeTab === 'conta' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold text-neutral-900">Conta</h1>
              <p className="text-sm text-neutral-600">Gerencie suas informações de conta</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Informações do Usuário</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-neutral-600">Em breve: gerencie nome, email, senha</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
