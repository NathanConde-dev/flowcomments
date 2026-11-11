'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe2, Languages, LogOut, Trash2 } from 'lucide-react';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ACCOUNT_TIMEZONES,
  DEFAULT_ACCOUNT_TIMEZONE,
  isAccountTimezone,
  type AccountTimezone,
} from '@/lib/settings/timezones';
import { toast } from '@/lib/ui/toast';

export function GeneralSettings() {
  const router = useRouter();
  const [timezone, setTimezone] = useState<AccountTimezone>(DEFAULT_ACCOUNT_TIMEZONE);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingTz, setSavingTz] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/settings/general');
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Erro ao carregar');
        if (cancelled) return;
        const nextTz = String(json.timezone || '');
        setTimezone(isAccountTimezone(nextTz) ? nextTz : DEFAULT_ACCOUNT_TIMEZONE);
        setUsername(json.username || '');
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

  const saveTimezone = async (next: AccountTimezone) => {
    setTimezone(next);
    setSavingTz(true);
    try {
      const res = await fetch('/api/settings/general', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao salvar');
      toast.success('Fuso horário atualizado');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao salvar');
    } finally {
      setSavingTz(false);
    }
  };

  const logout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('Falha ao sair');
      setLoggingOut(false);
    }
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      const res = await fetch('/api/settings/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: confirmText.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao excluir');
      toast.success('Conta excluída');
      router.push('/login');
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Falha ao excluir');
      setDeleting(false);
    }
  };

  const closeDelete = () => {
    if (deleting) return;
    setDeleteStep(0);
    setConfirmText('');
  };

  return (
    <div className="w-full max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe2 className="h-5 w-5" />
            Fuso horário da conta
          </CardTitle>
          <CardDescription>
            Define como datas e horários aparecem no inbox e no restante do app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <select
            value={timezone}
            disabled={loading || savingTz}
            onChange={(e) => {
              const value = e.target.value;
              if (!isAccountTimezone(value)) return;
              void saveTimezone(value);
            }}
            className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-foreground disabled:opacity-60"
          >
            {ACCOUNT_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            Idioma
          </CardTitle>
          <CardDescription>
            Escolha o idioma da interface. O Brasil abre em português por padrão.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LanguageSwitcher />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogOut className="h-5 w-5" />
            Sessão
          </CardTitle>
          <CardDescription>Encerra o acesso neste dispositivo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            disabled={loggingOut}
            onClick={() => void logout()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            {loggingOut ? 'Saindo…' : 'Sair da conta'}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <Trash2 className="h-5 w-5" />
            Zona de perigo
          </CardTitle>
          <CardDescription>
            Excluir a conta remove permanentemente automações, conversas, contatos e dados
            vinculados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="destructive" onClick={() => setDeleteStep(1)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Excluir conta
          </Button>
        </CardContent>
      </Card>

      <Dialog open={deleteStep === 1} onOpenChange={(open) => (!open ? closeDelete() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir conta?</DialogTitle>
            <DialogDescription>
              Esta ação é irreversível. Todos os dados da conta {username ? `@${username}` : ''}{' '}
              serão apagados permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={closeDelete}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={() => setDeleteStep(2)}>
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteStep === 2} onOpenChange={(open) => (!open ? closeDelete() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmação final</DialogTitle>
            <DialogDescription>
              Digite <span className="font-semibold text-foreground">{username || 'EXCLUIR'}</span>{' '}
              ou <span className="font-semibold text-foreground">EXCLUIR</span> para confirmar.
            </DialogDescription>
          </DialogHeader>
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={username || 'EXCLUIR'}
            autoComplete="off"
            className="h-11 w-full rounded-xl border border-border bg-white px-3 text-sm outline-none focus:border-foreground"
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" disabled={deleting} onClick={closeDelete}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={
                deleting ||
                (confirmText.trim() !== username && confirmText.trim().toUpperCase() !== 'EXCLUIR')
              }
              onClick={() => void deleteAccount()}
            >
              {deleting ? 'Excluindo…' : 'Excluir definitivamente'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
