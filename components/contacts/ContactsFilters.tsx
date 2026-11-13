'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export type ContactsFilterValues = {
  q: string;
  account: string;
  automation: string;
};

export function ContactsFilters({
  values,
  accounts,
  automations,
}: {
  values: ContactsFilterValues;
  accounts: Array<{ id: string; igUsername: string }>;
  automations: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const apply = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const params = new URLSearchParams();
    const q = String(data.get('q') || '').trim();
    const account = String(data.get('account') || '').trim();
    const automation = String(data.get('automation') || '').trim();
    if (q) params.set('q', q);
    if (account) params.set('account', account);
    if (automation) params.set('automation', automation);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/contacts?${qs}` : '/contacts');
    });
  };

  const clear = () => {
    startTransition(() => router.push('/contacts'));
  };

  const hasFilters = Boolean(values.q || values.account || values.automation);

  return (
    <form
      className="rounded-2xl border border-border/80 bg-white p-3 shadow-soft sm:p-4"
      onSubmit={(event) => {
        event.preventDefault();
        apply(event.currentTarget);
      }}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <label className="min-w-0 flex-1 space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Pesquisar</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="q"
              defaultValue={values.q}
              placeholder="Nome ou @username"
              className="h-10 rounded-xl pl-9"
            />
          </div>
        </label>

        <label className="w-full space-y-1.5 lg:w-52">
          <span className="text-xs font-semibold text-muted-foreground">Conta IG</span>
          <select
            name="account"
            defaultValue={values.account}
            className="flex h-10 w-full rounded-xl border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Todas</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                @{account.igUsername}
              </option>
            ))}
          </select>
        </label>

        <label className="w-full space-y-1.5 lg:w-56">
          <span className="text-xs font-semibold text-muted-foreground">Automação</span>
          <select
            name="automation"
            defaultValue={values.automation}
            className="flex h-10 w-full rounded-xl border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Todas</option>
            <option value="unknown">Sem origem</option>
            <option value="removed">Automação removida</option>
            {automations.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-2">
          <Button type="submit" className="rounded-full px-5" disabled={pending}>
            {pending ? '…' : 'Filtrar'}
          </Button>
          {hasFilters ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-full px-4"
              disabled={pending}
              onClick={clear}
            >
              <X className="h-4 w-4" />
              Limpar
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
