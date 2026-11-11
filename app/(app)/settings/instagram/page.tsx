'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Instagram } from 'lucide-react';
import { AccountRowSkeleton } from '@/components/ui/skeletons';
import { StatusBadge } from '@/components/ui/status-badge';
import { IceBreakersPanel } from '@/components/settings/IceBreakersPanel';
import { toast } from '@/lib/ui/toast';

interface IGAccount {
  id: string;
  igUsername: string;
  profilePictureUrl?: string | null;
  isActive: boolean;
  tokenExpiresAt: string | null;
}

export default function InstagramSettingsPage() {
  const router = useRouter();
  const [igAccounts, setIgAccounts] = useState<IGAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [metaConfigured, setMetaConfigured] = useState(false);
  const [expiryInfoAccount, setExpiryInfoAccount] = useState<IGAccount | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [accountsRes, setupRes] = await Promise.all([
          fetch('/api/instagram/accounts'),
          fetch('/api/settings/setup-status'),
        ]);

        if (accountsRes.ok) {
          const data = await accountsRes.json();
          setIgAccounts(data.accounts || []);
        }

        if (setupRes.ok) {
          const setup = await setupRes.json();
          setMetaConfigured(Boolean(setup.metaConfigured));
        }
      } catch (error) {
        console.error('Error fetching Instagram settings:', error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    const message = params.get('message');
    const hint = params.get('hint');

    if (success === 'connected') {
      toast.success('Conta Instagram conectada');
      router.replace('/settings/instagram');
    } else if (error) {
      const detail = hint || message;
      toast.error(
        detail && detail.length <= 180 ? detail : 'Falha ao conectar Instagram'
      );
      router.replace('/settings/instagram');
    }
  }, [router]);

  const handleConnect = async () => {
    if (!metaConfigured) return;
    setConnecting(true);
    window.location.href = '/api/instagram/connect?returnUrl=/settings/instagram';
  };

  const handleDisconnect = async (accountId: string, username: string) => {
    if (!confirm(`Desconectar @${username}?`)) return;

    try {
      const res = await fetch('/api/instagram/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      if (res.ok) {
        toast.success(`@${username} desconectada`);
        const accountsRes = await fetch('/api/instagram/accounts');
        if (accountsRes.ok) {
          const data = await accountsRes.json();
          setIgAccounts(data.accounts || []);
        }
      } else {
        toast.error('Erro ao desconectar conta');
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast.error('Erro ao desconectar conta');
    }
  };

  const connectButton = (
    <Button onClick={handleConnect} disabled={connecting || !metaConfigured}>
      {connecting ? 'Conectando...' : '+ Conectar Instagram'}
    </Button>
  );

  return (
    <div className="w-full space-y-4">
      {!loading && !metaConfigured && (
        <Card className="border-amber-200 bg-amber-50 shadow-soft">
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-amber-950">Meta App ainda não configurado</p>
              <p className="mt-1 text-sm text-amber-900/80">
                Configure App ID, App Secret e Webhook Verify Token antes de conectar o Instagram.
              </p>
            </div>
            <Link href="/settings/meta">
              <Button className="rounded-full whitespace-nowrap">Configurar Meta App</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <Card>
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
            <AccountRowSkeleton rows={2} />
          ) : igAccounts.length === 0 ? (
            <div className="py-6 text-center">
              <p className="mb-4 text-zinc-600">Nenhuma conta conectada</p>
              {connectButton}
              {!metaConfigured && (
                <p className="mt-3 text-sm text-muted-foreground">
                  O botão fica bloqueado até o Meta App estar pronto.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {igAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-2xl border border-border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-[2px] shadow-sm">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white p-[1.5px]">
                        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-zinc-900 text-sm font-medium text-white">
                          {account.profilePictureUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={account.profilePictureUrl}
                              alt={`@${account.igUsername}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            account.igUsername[0].toUpperCase()
                          )}
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="font-medium">@{account.igUsername}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {account.isActive !== false ? (
                          <StatusBadge tone="success">Ativa</StatusBadge>
                        ) : (
                          <StatusBadge tone="expired">Inativa</StatusBadge>
                        )}
                        {account.tokenExpiresAt && (
                          <button
                            type="button"
                            onClick={() => setExpiryInfoAccount(account)}
                            className="cursor-pointer rounded-lg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <StatusBadge tone="pending" icon={false}>
                              Expira em{' '}
                              {Math.ceil(
                                (new Date(account.tokenExpiresAt).getTime() - Date.now()) /
                                  (1000 * 60 * 60 * 24)
                              )}{' '}
                              dias
                            </StatusBadge>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDisconnect(account.id, account.igUsername)}
                  >
                    Desconectar
                  </Button>
                </div>
              ))}
              <Button
                onClick={handleConnect}
                disabled={connecting || !metaConfigured}
                className="w-full"
              >
                {connecting ? 'Conectando...' : '+ Adicionar Outra Conta'}
              </Button>
              {!metaConfigured && (
                <p className="text-center text-sm text-muted-foreground">
                  Configure o Meta App para adicionar contas.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {!loading &&
        igAccounts
          .filter((account) => account.isActive !== false)
          .map((account) => <IceBreakersPanel key={`ice-${account.id}`} accountId={account.id} />)}

      <Dialog
        open={Boolean(expiryInfoAccount)}
        onOpenChange={(open) => !open && setExpiryInfoAccount(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Expiração do token</DialogTitle>
            <DialogDescription>
              {expiryInfoAccount
                ? `Entenda o acesso da conta @${expiryInfoAccount.igUsername}.`
                : 'Entenda como funciona o acesso do Instagram.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              O Instagram/Meta libera um token de acesso com validade limitada. Quando ele
              expira, o Flowcomments deixa de conseguir ler comentários e enviar respostas/DMs
              por aquela conta.
            </p>
            <p>
              O selo mostra quantos dias restam. Antes de zerar, basta{' '}
              <span className="font-medium text-foreground">reconectar a mesma conta</span> —
              o token é renovado e as automações continuam normalmente.
            </p>
            {expiryInfoAccount?.tokenExpiresAt && (
              <p className="rounded-xl border border-border bg-muted/50 px-3 py-2 text-foreground">
                Expira em{' '}
                <span className="font-semibold">
                  {Math.max(
                    0,
                    Math.ceil(
                      (new Date(expiryInfoAccount.tokenExpiresAt).getTime() - Date.now()) /
                        (1000 * 60 * 60 * 24)
                    )
                  )}{' '}
                  dias
                </span>
                {' · '}
                {new Date(expiryInfoAccount.tokenExpiresAt).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setExpiryInfoAccount(null)}>
              Fechar
            </Button>
            <Button
              type="button"
              onClick={() => {
                setExpiryInfoAccount(null);
                handleConnect();
              }}
              disabled={connecting || !metaConfigured}
            >
              {connecting ? 'Conectando...' : 'Reconectar agora'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
