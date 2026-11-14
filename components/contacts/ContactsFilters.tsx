'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useTransition } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';

export type ContactsFilterValues = {
  q: string;
  account: string;
  automation: string;
  tag: string;
};

export function ContactsFilters({
  values,
  accounts,
  automations,
  tags,
}: {
  values: ContactsFilterValues;
  accounts: Array<{ id: string; igUsername: string }>;
  automations: string[];
  tags: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const accountOptions = useMemo(
    () => [
      { value: '', label: 'Todas' },
      ...accounts.map((account) => ({
        value: account.id,
        label: `@${account.igUsername}`,
      })),
    ],
    [accounts]
  );

  const automationOptions = useMemo(
    () => [
      { value: '', label: 'Todas (só automações)' },
      { value: 'unknown', label: 'Sem automação (limpeza)' },
      { value: 'removed', label: 'Automação removida' },
      ...automations.map((name) => ({ value: name, label: name })),
    ],
    [automations]
  );

  const tagOptions = useMemo(
    () => [
      { value: '', label: 'Todas' },
      ...tags.map((tag) => ({ value: tag, label: tag })),
    ],
    [tags]
  );

  const apply = (form: HTMLFormElement) => {
    const data = new FormData(form);
    const params = new URLSearchParams();
    const q = String(data.get('q') || '').trim();
    const account = String(data.get('account') || '').trim();
    const automation = String(data.get('automation') || '').trim();
    const tag = String(data.get('tag') || '').trim();
    if (q) params.set('q', q);
    if (account) params.set('account', account);
    if (automation) params.set('automation', automation);
    if (tag) params.set('tag', tag);
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/contacts?${qs}` : '/contacts');
    });
  };

  const clear = () => {
    startTransition(() => router.push('/contacts'));
  };

  const hasFilters = Boolean(values.q || values.account || values.automation || values.tag);

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

        <div className="w-full space-y-1.5 lg:w-52">
          <span className="text-xs font-semibold text-muted-foreground">Conta IG</span>
          <SelectField
            name="account"
            defaultValue={values.account}
            options={accountOptions}
            placeholder="Todas"
          />
        </div>

        <div className="w-full space-y-1.5 lg:w-56">
          <span className="text-xs font-semibold text-muted-foreground">Automação</span>
          <SelectField
            name="automation"
            defaultValue={values.automation}
            options={automationOptions}
            placeholder="Todas (só automações)"
          />
        </div>

        <div className="w-full space-y-1.5 lg:w-44">
          <span className="text-xs font-semibold text-muted-foreground">Tag</span>
          <SelectField
            name="tag"
            defaultValue={values.tag}
            options={tagOptions}
            placeholder="Todas"
          />
        </div>

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
