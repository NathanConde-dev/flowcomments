'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/lib/ui/toast';

type IceItem = { question: string; automationId: string };
type AutomationOption = { id: string; name: string };

export function IceBreakersPanel({ accountId }: { accountId: string }) {
  const [items, setItems] = useState<IceItem[]>([]);
  const [automations, setAutomations] = useState<AutomationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [iceRes, autoRes] = await Promise.all([
          fetch(`/api/instagram/ice-breakers?accountId=${accountId}`),
          fetch('/api/automations'),
        ]);
        if (iceRes.ok) {
          const data = await iceRes.json();
          setItems(data.items?.length ? data.items : [{ question: '', automationId: '' }]);
        }
        if (autoRes.ok) {
          const data = await autoRes.json();
          setAutomations(
            (data.automations || []).map((a: { id: string; name: string }) => ({
              id: a.id,
              name: a.name,
            }))
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [accountId]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/instagram/ice-breakers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          items: items.filter((i) => i.question.trim() && i.automationId),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar');
      setItems(data.items?.length ? data.items : [{ question: '', automationId: '' }]);
      toast.success('Conversation Starters publicados');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Carregando ice breakers…</p>;
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border bg-white p-5">
      <div>
        <h3 className="text-base font-bold text-foreground">Conversation Starters</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Até 4 perguntas no início do DM (mobile). Cada toque dispara uma automação.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              value={item.question}
              maxLength={80}
              placeholder="Ex: Qual o preço?"
              onChange={(e) => {
                const next = [...items];
                next[index] = { ...item, question: e.target.value };
                setItems(next);
              }}
            />
            <select
              className="flex h-10 w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
              value={item.automationId}
              onChange={(e) => {
                const next = [...items];
                next[index] = { ...item, automationId: e.target.value };
                setItems(next);
              }}
            >
              <option value="">Automação</option>
              {automations.map((automation) => (
                <option key={automation.id} value={automation.id}>
                  {automation.name}
                </option>
              ))}
            </select>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setItems(items.filter((_, i) => i !== index))}
            >
              Remover
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={items.length >= 4}
          onClick={() => setItems([...items, { question: '', automationId: '' }])}
        >
          + Pergunta
        </Button>
        <Button type="button" size="sm" onClick={save} disabled={saving}>
          {saving ? 'Publicando…' : 'Publicar no Instagram'}
        </Button>
      </div>
    </div>
  );
}
