'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Instagram } from 'lucide-react';

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
        router.push('/settings?success=connected');
      } else {
        alert('Erro ao conectar conta');
      }
    } catch (error) {
      console.error('Error selecting account:', error);
      alert('Erro ao conectar conta');
    } finally {
      setSelecting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Carregando contas...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Selecione a Conta do Instagram</CardTitle>
            <p className="text-sm text-gray-600">
              Encontramos {accounts.length} {accounts.length === 1 ? 'conta' : 'contas'}.
              Escolha qual deseja conectar.
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-4 hover:border-zinc-300"
                >
                  <div className="flex items-center gap-4">
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
