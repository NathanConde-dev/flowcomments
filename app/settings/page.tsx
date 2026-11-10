import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Instagram } from 'lucide-react';

async function getSettings(userId: string) {
  const [igAccounts, metaConfig] = await Promise.all([
    prisma.instagramAccount.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
    Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'META_APP_ID' } }),
      prisma.systemConfig.findUnique({ where: { key: 'WEBHOOK_VERIFY_TOKEN' } }),
    ]),
  ]);

  return {
    igAccounts,
    hasMetaConfig: metaConfig[0] !== null && metaConfig[1] !== null,
  };
}

export default async function SettingsPage() {
  const session = await requireAuth();
  const { igAccounts, hasMetaConfig } = await getSettings(session.userId);

  const webhookUrl = process.env.NEXT_PUBLIC_URL
    ? `${process.env.NEXT_PUBLIC_URL}/api/webhook`
    : 'https://seu-dominio.com/api/webhook';

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-600">Gerencie suas contas e integrações</p>
      </div>

      {!hasMetaConfig && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="p-6">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-medium text-yellow-900 mb-2">
                  Configuração do Meta App Incompleta
                </p>
                <p className="text-sm text-yellow-800 mb-4">
                  Complete a configuração do Meta App ID e credenciais para conectar contas do Instagram.
                  Se você já fez isso durante o setup, atualize as variáveis de ambiente ou o banco de dados.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
          {igAccounts.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-600 mb-4">
                Nenhuma conta conectada ainda
              </p>
              <Button disabled={!hasMetaConfig}>
                Conectar Instagram (Em breve)
              </Button>
              {!hasMetaConfig && (
                <p className="mt-2 text-xs text-gray-500">
                  Complete a configuração do Meta App primeiro
                </p>
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
                      <p className="text-sm text-gray-500">
                        {account.isActive ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-3 w-3" />
                            Ativo
                          </span>
                        ) : (
                          <span className="text-gray-500">Inativo</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled>
                      Reconectar
                    </Button>
                    <Button variant="destructive" size="sm" disabled>
                      Desconectar
                    </Button>
                  </div>
                </div>
              ))}
              <Button disabled={!hasMetaConfig} className="w-full">
                + Adicionar Outra Conta
              </Button>
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
                    target="_blank"
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
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
