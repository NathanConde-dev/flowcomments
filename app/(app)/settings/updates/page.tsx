'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpCircle, Check, Copy, LoaderCircle, RefreshCw, Sparkles } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/ui/toast';
import { isNewerVersion } from '@/lib/updates/version';

type ApplyStatus = {
  status: 'idle' | 'running' | 'done' | 'failed';
  startedAt: string | null;
  finishedAt: string | null;
  message: string | null;
  logTail: string[];
};

type ReleaseItem = {
  version: string;
  date: string | null;
  title: string;
  htmlUrl: string | null;
  sections: Record<string, string[]>;
  body: string;
};

type UpdatesPayload = {
  current: string;
  latest: string | null;
  updateAvailable: boolean;
  selfUpdateEnabled: boolean;
  repo: string;
  checkedAt: string;
  remoteAvailable: boolean;
  releases: ReleaseItem[];
  installHints: {
    docker: string;
    git: string;
    railway: string;
  };
  applyStatus: ApplyStatus;
};

type HintKey = keyof UpdatesPayload['installHints'];

export default function UpdatesSettingsPage() {
  const [data, setData] = useState<UpdatesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [hint, setHint] = useState<HintKey>('docker');
  const [copied, setCopied] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/settings/updates', { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Falha ao verificar atualizações');
      }
      const json = (await res.json()) as UpdatesPayload;
      setData(json);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar atualizações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (data?.applyStatus.status !== 'running') return;

    const id = window.setInterval(async () => {
      try {
        const res = await fetch('/api/settings/updates/status', { cache: 'no-store' });
        if (!res.ok) return;
        const status = (await res.json()) as ApplyStatus;
        setData((prev) => (prev ? { ...prev, applyStatus: status } : prev));
        if (status.status === 'done') {
          toast.success('Atualização concluída');
          load(true);
        } else if (status.status === 'failed') {
          toast.error(status.message || 'Falha na atualização');
        }
      } catch {
        // ignore polling errors
      }
    }, 2500);

    return () => window.clearInterval(id);
  }, [data?.applyStatus.status, load]);

  const newerReleases = useMemo(() => {
    if (!data) return [];
    const newer = data.releases.filter(
      (item) => item.version === data.current || isNewerVersion(item.version, data.current)
    );
    return (newer.length ? newer : data.releases).slice(0, 12);
  }, [data]);

  const copyHints = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(data.installHints[hint]);
    setCopied(true);
    toast.success('Comandos copiados');
    setTimeout(() => setCopied(false), 1400);
  };

  const applyUpdate = async () => {
    setApplying(true);
    try {
      const res = await fetch('/api/settings/updates/apply', { method: 'POST' });
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (body.installHints) {
          setData((prev) =>
            prev
              ? {
                  ...prev,
                  installHints: body.installHints,
                  selfUpdateEnabled: false,
                }
              : prev
          );
        }
        throw new Error(body.error || 'Não foi possível iniciar a atualização');
      }

      toast.success('Atualização iniciada', 'Acompanhe o status abaixo.');
      setData((prev) =>
        prev
          ? {
              ...prev,
              applyStatus: body.applyStatus || prev.applyStatus,
            }
          : prev
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar');
    } finally {
      setApplying(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Verificando atualizações...
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">Não foi possível carregar o status de atualização.</p>
          <Button className="mt-4" variant="outline" onClick={() => load()}>
            Tentar de novo
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ArrowUpCircle className="h-5 w-5" />
                Atualizações
              </CardTitle>
              <CardDescription className="mt-1">
                Self-hosted opt-in — nada atualiza sozinho. Seus dados e automações permanecem intactos até você confirmar.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Verificar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Versão atual</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">v{data.current}</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Última disponível</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {data.latest ? `v${data.latest}` : '—'}
              </p>
            </div>
          </div>

          {data.updateAvailable ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
              Há uma atualização disponível{data.latest ? ` (v${data.latest})` : ''}. Revise as novidades e atualize quando quiser.
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              Você está na versão mais recente conhecida.
              {!data.remoteAvailable ? ' (GitHub indisponível — usando changelog local.)' : ''}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            {data.selfUpdateEnabled ? (
              <Button onClick={applyUpdate} disabled={applying || data.applyStatus.status === 'running'}>
                {applying || data.applyStatus.status === 'running' ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  'Atualizar agora'
                )}
              </Button>
            ) : (
              <Button variant="outline" disabled title="Ative ENABLE_SELF_UPDATE=true no host">
                One-click desativado
              </Button>
            )}
            {data.releases[0]?.htmlUrl && (
              <a href={data.releases[0].htmlUrl} target="_blank" rel="noreferrer">
                <Button variant="outline">Ver release no GitHub</Button>
              </a>
            )}
          </div>

          {(data.applyStatus.status === 'running' ||
            data.applyStatus.status === 'failed' ||
            data.applyStatus.status === 'done') && (
            <div className="rounded-2xl border border-border bg-zinc-950 p-4 text-xs text-zinc-100">
              <p className="mb-2 font-medium">
                Status: {data.applyStatus.status}
                {data.applyStatus.message ? ` — ${data.applyStatus.message}` : ''}
              </p>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap font-mono leading-relaxed opacity-90">
                {(data.applyStatus.logTail || []).join('\n') || 'Sem logs ainda.'}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Como atualizar neste servidor</CardTitle>
          <CardDescription>
            Sem one-click, use os comandos do seu método de instalação. `.env`, Postgres e Redis não são apagados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {([
              ['docker', 'Docker Compose'],
              ['git', 'Git / PM2'],
              ['railway', 'Railway'],
            ] as const).map(([key, label]) => (
              <Button
                key={key}
                size="sm"
                variant={hint === key ? 'default' : 'outline'}
                onClick={() => setHint(key)}
              >
                {label}
              </Button>
            ))}
          </div>
          <pre className="overflow-x-auto rounded-2xl border border-border bg-muted/50 p-4 text-xs leading-relaxed">
            {data.installHints[hint]}
          </pre>
          <Button variant="outline" size="sm" onClick={copyHints}>
            {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
            {copied ? 'Copiado' : 'Copiar comandos'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Novidades
          </CardTitle>
          <CardDescription>O que entrou em cada versão.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {(newerReleases.length ? newerReleases : data.releases.slice(0, 8)).map((release) => (
            <article key={release.version} className="border-b border-border pb-5 last:border-0 last:pb-0">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-base font-semibold tracking-tight">
                  {release.title || `v${release.version}`}
                </h3>
                <p className="text-xs text-muted-foreground">
                  v{release.version}
                  {release.date ? ` · ${release.date}` : ''}
                </p>
              </div>
              {Object.keys(release.sections || {}).length > 0 ? (
                <div className="mt-3 space-y-3">
                  {Object.entries(release.sections).map(([section, items]) => (
                    <div key={section}>
                      <p className="text-sm font-medium text-foreground">{section}</p>
                      <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                        {items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : release.body ? (
                <pre className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{release.body}</pre>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">Sem notas detalhadas nesta versão.</p>
              )}
            </article>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
