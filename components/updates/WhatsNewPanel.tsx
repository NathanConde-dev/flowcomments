'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpCircle,
  Check,
  Copy,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WhatsNewSkeleton } from '@/components/ui/skeletons';
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
  remoteAvailable: boolean;
  releases: ReleaseItem[];
  installHints: {
    docker: string;
    git: string;
    railway: string;
  };
  applyStatus: ApplyStatus;
};

type Announcement = {
  id: string;
  title: string;
  body: string;
  mediaUrl: string | null;
  mediaType: string | null;
  ctaUrl: string | null;
  ctaLabel: string | null;
  publishedAt: string;
};

type HintKey = keyof UpdatesPayload['installHints'];

export function WhatsNewPanel() {
  const t = useTranslations('updates');
  const tCommon = useTranslations('common');
  const [data, setData] = useState<UpdatesPayload | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [hint, setHint] = useState<HintKey>('docker');
  const [copied, setCopied] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const [updatesRes, announcementsRes] = await Promise.all([
          fetch('/api/settings/updates', { cache: 'no-store' }),
          fetch('/api/settings/announcements', { cache: 'no-store' }),
        ]);

        if (!updatesRes.ok) {
          const body = await updatesRes.json().catch(() => ({}));
          throw new Error(body.error || tCommon('error'));
        }

        const json = (await updatesRes.json()) as UpdatesPayload;
        setData(json);

        if (announcementsRes.ok) {
          const ann = await announcementsRes.json();
          setAnnouncements(ann.announcements || []);
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : tCommon('error'));
      } finally {
        setLoading(false);
      }
    },
    [tCommon]
  );

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
          toast.success(t('updateNow'));
          load(true);
        } else if (status.status === 'failed') {
          toast.error(status.message || tCommon('error'));
        }
      } catch {
        // ignore
      }
    }, 2500);

    return () => window.clearInterval(id);
  }, [data?.applyStatus.status, load, t, tCommon]);

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
    toast.success(tCommon('copied'));
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
        throw new Error(body.error || tCommon('error'));
      }

      toast.success(t('updating'));
      setData((prev) =>
        prev
          ? {
              ...prev,
              applyStatus: body.applyStatus || prev.applyStatus,
            }
          : prev
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : tCommon('error'));
    } finally {
      setApplying(false);
    }
  };

  if (loading && !data) {
    return <WhatsNewSkeleton />;
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">{tCommon('error')}</p>
          <Button className="mt-4" variant="outline" onClick={() => load()}>
            {tCommon('retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 p-4 sm:p-6 md:p-8">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <ArrowUpCircle className="h-6 w-6" />
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('description')}</p>
      </div>

      <Card className="border-emerald-200/80 bg-emerald-50/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-emerald-700" />
            {t('safeTitle')}
          </CardTitle>
          <CardDescription className="text-emerald-950/80">{t('safeBody')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-emerald-950/90">
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
              {t('guaranteeData')}
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
              {t('guaranteeEnv')}
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0" />
              {t('guaranteeOptIn')}
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{t('safeTitle')}</CardTitle>
              <CardDescription className="mt-1">{t('description')}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('check')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('current')}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">v{data.current}</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('latest')}
              </p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {data.latest ? `v${data.latest}` : '—'}
              </p>
            </div>
          </div>

          {data.updateAvailable ? (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
              <p className="font-medium">
                {t('available')}
                {data.latest ? ` (v${data.latest})` : ''}
              </p>
              <p className="mt-1 text-sky-900/80">{t('availableHint')}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
              {t('upToDate')}
              {!data.remoteAvailable ? ` ${t('githubUnavailable')}` : ''}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            {data.selfUpdateEnabled ? (
              <Button
                onClick={applyUpdate}
                disabled={applying || data.applyStatus.status === 'running' || !data.updateAvailable}
              >
                {applying || data.applyStatus.status === 'running' ? (
                  <>
                    <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                    {t('updating')}
                  </>
                ) : (
                  t('updateNow')
                )}
              </Button>
            ) : null}
            {data.releases[0]?.htmlUrl && (
              <a href={data.releases[0].htmlUrl} target="_blank" rel="noreferrer">
                <Button variant="outline">{t('viewRelease')}</Button>
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
                {(data.applyStatus.logTail || []).join('\n') || '…'}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>

      {!data.selfUpdateEnabled && (
        <Card>
          <CardHeader>
            <CardTitle>{t('oneClickOff')}</CardTitle>
            <CardDescription>{t('oneClickHint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium">{t('howTo')}</p>
            <p className="text-sm text-muted-foreground">{t('howToHint')}</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['docker', 'Docker Compose'],
                  ['git', 'Git / PM2'],
                  ['railway', 'Railway'],
                ] as const
              ).map(([key, label]) => (
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
              {copied ? tCommon('copied') : t('copyCommands')}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {t('whatsNew')}
          </CardTitle>
          <CardDescription>{t('whatsNewHint')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {(newerReleases.length ? newerReleases : data.releases.slice(0, 8)).map((release) => (
            <article
              key={release.version}
              className="border-b border-border pb-5 last:border-0 last:pb-0"
            >
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
                <pre className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
                  {release.body}
                </pre>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">{t('noNotes')}</p>
              )}
            </article>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('announcementsTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('announcementsEmpty')}</p>
          ) : (
            announcements.slice(0, 5).map((item) => (
              <article key={item.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <h3 className="font-semibold tracking-tight">{item.title}</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{item.body}</p>
                {item.mediaUrl && (
                  <a
                    href={item.mediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm font-medium underline"
                  >
                    {item.mediaType === 'video' ? 'Video' : 'Media'}
                  </a>
                )}
              </article>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
