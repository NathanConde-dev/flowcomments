'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Instagram } from 'lucide-react';
import { ChooseAccountSkeleton } from '@/components/ui/skeletons';
import { toast } from '@/lib/ui/toast';

interface Account {
  id: string;
  username: string;
  name?: string;
  followers_count?: number;
  profile_picture_url?: string;
}

export default function ChooseAccountPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/instagram/pending-accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (accountId: string) => {
    setSelecting(accountId);
    try {
      const res = await fetch('/api/instagram/select-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      if (res.ok) {
        router.push('/settings/instagram?success=connected');
      } else {
        toast.error('Erro ao conectar conta');
      }
    } catch (error) {
      console.error('Error selecting account:', error);
      toast.error('Erro ao conectar conta');
    } finally {
      setSelecting(null);
    }
  };

  if (loading) {
    return <ChooseAccountSkeleton />;
  }

  return (
    <div className="min-h-full bg-background p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Selecione a Conta do Instagram</CardTitle>
            <p className="text-sm text-muted-foreground">
              Encontramos {accounts.length} {accounts.length === 1 ? 'conta' : 'contas'}.
              Escolha qual deseja conectar.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex flex-col gap-3 rounded-2xl border border-border p-4 hover:border-zinc-300 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    {account.profile_picture_url ? (
                      <img
                        src={account.profile_picture_url}
                        alt={account.username}
                        className="h-12 w-12 rounded-full"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
                        <Instagram className="h-6 w-6 text-zinc-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium">@{account.username}</p>
                      {account.name && <p className="text-sm text-gray-600">{account.name}</p>}
                      {account.followers_count !== undefined && (
                        <p className="text-xs text-gray-500">
                          {account.followers_count.toLocaleString('pt-BR')} seguidores
                        </p>
                      )}
                    </div>
                  </div>
                  <Button
                    className="w-full shrink-0 sm:w-auto"
                    onClick={() => handleSelect(account.id)}
                    disabled={selecting !== null}
                  >
                    {selecting === account.id ? 'Conectando...' : 'Conectar'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
