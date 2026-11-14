'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/lib/ui/toast';
import type { IceBreakerItem } from '@/lib/automation/types';

type AccountOption = { id: string; igUsername: string };
type AutomationOption = { id: string; name: string; igAccountId: string };

export function IceBreakersEditor({ accounts }: { accounts: AccountOption[] }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [automations, setAutomations] = useState<AutomationOption[]>([]);
  const [items, setItems] = useState<IceBreakerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accounts.length) return;
    if (!accountId || !accounts.some((a) => a.id === accountId)) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, accountId]);

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [iceRes, autoRes] = await Promise.all([
          fetch(`/api/instagram/ice-breakers?accountId=${accountId}`),
          fetch('/api/automations'),
        ]);
        if (iceRes.ok) {
          const data = await iceRes.json();
          if (!cancelled) setItems(data.items || []);
        }
        if (autoRes.ok) {
          const data = await autoRes.json();
          const list = (data.automations || []) as Array<{
            id: string;
            name: string;
            igAccountId: string;
          }>;
          if (!cancelled) {
            setAutomations(list.filter((a) => a.igAccountId === accountId));
          }
        }
      } catch {
        if (!cancelled) toast.error('Falha ao carregar ice breakers');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [accountId]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/instagram/ice-breakers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, items }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar');
      setItems(data.items || []);
      toast.success('Ice breakers atualizados no Instagram');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (accounts.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ice breakers</CardTitle>
        <CardDescription>
          Atalhos que aparecem quando alguém abre o Direct (até 4). Cada um dispara uma
          automação.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Conta</span>
          <select
            className="flex h-10 w-full rounded-xl border border-border bg-white px-3 text-sm"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                @{account.igUsername}
              </option>
            ))}
          </select>
        </label>

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : (
          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="space-y-2 rounded-xl border border-border p-3"
              >
                <Input
                  value={item.question}
                  maxLength={80}
                  placeholder="Ex: Quero o link do produto"
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = { ...item, question: e.target.value };
                    setItems(next);
                  }}
                />
                <select
                  className="flex h-10 w-full rounded-md border border-border bg-white px-3 text-sm"
                  value={item.automationId}
                  onChange={(e) => {
                    const next = [...items];
                    next[index] = { ...item, automationId: e.target.value };
                    setItems(next);
                  }}
                >
                  <option value="">Automação…</option>
                  {automations.map((automation) => (
                    <option key={automation.id} value={automation.id}>
                      {automation.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setItems(items.filter((_, i) => i !== index))}
                >
                  Remover
                </Button>
              </div>
            ))}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={items.length >= 4}
                onClick={() =>
                  setItems([
                    ...items,
                    {
                      question: '',
                      automationId: automations[0]?.id || '',
                    },
                  ])
                }
              >
                + Ice breaker
              </Button>
              <Button type="button" size="sm" disabled={saving} onClick={save}>
                {saving ? 'Salvando…' : 'Salvar no Instagram'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
