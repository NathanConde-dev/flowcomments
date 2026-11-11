'use client';

import { useEffect, useState } from 'react';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ToggleSwitch } from '@/components/ui/toggle-switch';
import {
  DEFAULT_INBOX_SETTINGS,
  SUSPEND_AUTOMATION_OPTIONS,
  type InboxSettings as InboxSettingsType,
} from '@/lib/inbox/settings';
import { cn } from '@/lib/utils/cn';
import { toast } from '@/lib/ui/toast';

function SettingsRow({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-4 border-b border-border px-5 py-5 last:border-b-0 md:grid-cols-[minmax(180px,240px)_minmax(220px,1fr)_minmax(200px,1.1fr)] md:items-start',
        className
      )}
    >
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <div className="min-w-0">{children}</div>
      <div>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
    </div>
  );
}

export function InboxSettings() {
  const [settings, setSettings] = useState<InboxSettingsType>(DEFAULT_INBOX_SETTINGS);
  const [openCount, setOpenCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/settings/inbox');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Erro ao carregar');
        if (cancelled) return;
        setSettings(json.settings || DEFAULT_INBOX_SETTINGS);
        setOpenCount(json.openCount || 0);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao carregar');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const patch = async (partial: Partial<InboxSettingsType>) => {
    const previous = settings;
    setSettings((curr) => ({ ...curr, ...partial }));
    setSaving(true);
    try {
      const res = await fetch('/api/settings/inbox', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(partial),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao salvar');
      setSettings(json.settings);
    } catch (err) {
      setSettings(previous);
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const closeAll = async () => {
    setClosing(true);
    try {
      const res = await fetch('/api/settings/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close_all_open' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao fechar');
      setOpenCount(0);
      toast.success(
        json.closed > 0
          ? `${json.closed} conversa(s) fechada(s)`
          : 'Nenhuma conversa aberta'
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao fechar');
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="w-full max-w-5xl space-y-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
          <Inbox className="h-4 w-4 text-foreground" />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            Comportamento da caixa de entrada
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Defina como conversas abrem, fecham e pausam automações durante o atendimento.
          </p>
        </div>
      </div>

      <div
        className={cn(
          'overflow-hidden rounded-2xl border border-border bg-white shadow-sm',
          (loading || saving) && 'opacity-90'
        )}
      >
        <SettingsRow
          title="Comportamento da caixa de entrada"
          description={
            settings.conversationStartMode === 'any_message'
              ? 'Abra uma nova conversa da caixa de entrada com qualquer mensagem do contato. Conversas automatizadas na pasta Fechada não são reabertas automaticamente.'
              : 'Só mantém a conversa ativa na inbox quando ela já estiver aberta. Mensagens em conversas fechadas não reabrem automaticamente.'
          }
        >
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input
                type="radio"
                className="mt-1"
                name="conversationStartMode"
                checked={settings.conversationStartMode === 'any_message'}
                disabled={loading || saving}
                onChange={() => void patch({ conversationStartMode: 'any_message' })}
              />
              <span className="font-medium">Qualquer mensagem inicia uma conversa</span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 text-sm">
              <input
                type="radio"
                className="mt-1"
                name="conversationStartMode"
                checked={settings.conversationStartMode === 'manual'}
                disabled={loading || saving}
                onChange={() => void patch({ conversationStartMode: 'manual' })}
              />
              <span className="font-medium">A conversa deve ser aberta manualmente</span>
            </label>
          </div>
        </SettingsRow>

        <SettingsRow
          title="Fechar todas as conversas abertas"
          description={
            openCount > 0
              ? `Há ${openCount} conversa(s) aberta(s) no momento.`
              : 'Não há conversas abertas no momento.'
          }
        >
          <Button
            type="button"
            variant="outline"
            disabled={loading || closing || openCount === 0}
            onClick={() => void closeAll()}
            className="border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800"
          >
            {closing ? 'Fechando…' : 'Fechar Tudo'}
          </Button>
        </SettingsRow>

        <SettingsRow
          title="Suspender automações enquanto houver conversas"
          description="Enquanto estiver conversando pela caixa de entrada, as automações vinculadas ao contato serão pausadas temporariamente pelo período selecionado."
        >
          <select
            value={settings.suspendAutomationsFor}
            disabled={loading || saving}
            onChange={(e) =>
              void patch({
                suspendAutomationsFor: e.target.value as InboxSettingsType['suspendAutomationsFor'],
              })
            }
            className="h-10 w-full max-w-xs rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-foreground disabled:opacity-60"
          >
            {SUSPEND_AUTOMATION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </SettingsRow>

        <SettingsRow
          title="Conversas reabertas"
          description="Quando o contato reabre uma conversa fechada, você pode atribuí-la ao mesmo agente que trabalhou anteriormente nela."
        >
          <ToggleSwitch
            checked={settings.reassignSameAgent}
            disabled={loading || saving}
            label="Atribuir ao mesmo agente"
            onCheckedChange={(checked) => void patch({ reassignSameAgent: checked })}
          />
        </SettingsRow>

        <SettingsRow
          title="Visibilidade das conversas"
          description="Desative esta opção se quiser que agentes da caixa de entrada tenham acesso apenas a novas conversas e conversas atribuídas a eles."
        >
          <ToggleSwitch
            checked={settings.allAgentsSeeAll}
            disabled={loading || saving}
            label="Conceder acesso a todas as conversas para todos os Agentes"
            onCheckedChange={(checked) => void patch({ allAgentsSeeAll: checked })}
          />
        </SettingsRow>

        <SettingsRow
          title="Notificações na plataforma"
          description="Mostra um alerta no canto inferior direito quando chega mensagem nova fora da inbox."
        >
          <ToggleSwitch
            checked={settings.toastNotifications}
            disabled={loading || saving}
            label="Ativar notificações no app"
            onCheckedChange={(checked) => void patch({ toastNotifications: checked })}
          />
        </SettingsRow>

        <SettingsRow
          title="Notificações de som"
          description="Toque um alerta sonoro junto com a notificação de nova mensagem."
        >
          <ToggleSwitch
            checked={settings.soundNotifications}
            disabled={loading || saving}
            label="Permitir alertas de som no app"
            onCheckedChange={(checked) => void patch({ soundNotifications: checked })}
          />
        </SettingsRow>
      </div>
    </div>
  );
}
