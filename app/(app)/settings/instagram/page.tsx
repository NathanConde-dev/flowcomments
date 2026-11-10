'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Instagram } from 'lucide-react';
import { AccountRowSkeleton } from '@/components/ui/skeletons';
import { StatusBadge } from '@/components/ui/status-badge';

interface IGAccount {
  id: string;
  igUsername: string;
  isActive: boolean;
  tokenExpiresAt: string | null;
}

export default function InstagramSettingsPage() {
  const [igAccounts, setIgAccounts] = useState<IGAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

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
        fetchAccounts();
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  return (
    <div className="w-full">
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
            <div className="text-center py-6">
              <p className="text-zinc-600 mb-4">Nenhuma conta conectada</p>
              <Button onClick={handleConnect} disabled={connecting}>
                {connecting ? 'Conectando...' : '+ Conectar Instagram'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {igAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-2xl border border-border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white font-medium">
                      {account.igUsername[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">@{account.igUsername}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        {account.isActive ? (
                          <StatusBadge tone="success">Ativa</StatusBadge>
                        ) : (
                          <StatusBadge tone="expired">Inativa</StatusBadge>
                        )}
                        {account.tokenExpiresAt && (
                          <StatusBadge tone="pending" icon={false}>
                            Expira em{' '}
                            {Math.ceil(
                              (new Date(account.tokenExpiresAt).getTime() - Date.now()) /
                                (1000 * 60 * 60 * 24)
                            )}{' '}
                            dias
                          </StatusBadge>
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
              <Button onClick={handleConnect} disabled={connecting} className="w-full">
                {connecting ? 'Conectando...' : '+ Adicionar Outra Conta'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
