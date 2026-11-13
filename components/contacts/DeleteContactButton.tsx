'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/ui/toast';

export function DeleteContactButton({
  contactId,
  username,
}: {
  contactId: string;
  username: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const remove = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Não foi possível remover');
      toast.success(`@${username} removido`);
      setConfirming(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao remover');
    } finally {
      setBusy(false);
    }
  };

  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Remover @{username}?</span>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={busy}
          onClick={remove}
          className="rounded-full"
        >
          {busy ? '…' : 'Confirmar'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={busy}
          onClick={() => setConfirming(false)}
          className="rounded-full"
        >
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={() => setConfirming(true)}
      className="rounded-full text-muted-foreground hover:text-destructive"
      aria-label={`Remover @${username}`}
    >
      <Trash2 className="h-4 w-4" />
      <span className="sm:inline">Remover</span>
    </Button>
  );
}
