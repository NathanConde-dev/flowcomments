'use client';

import { useCallback, useEffect, useState } from 'react';
import { Bell, ExternalLink, LoaderCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from '@/lib/ui/toast';
import { markAnnouncementsSeen } from '@/components/settings/AnnouncementBadge';

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

type Payload = {
  ok: boolean;
  announcements: Announcement[];
  controlPlaneConfigured: boolean;
  controlPlaneUrl: string | null;
  checkedAt?: string;
  error?: string;
};

export default function AnnouncementsSettingsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/announcements', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Falha ao carregar comunicados');
      setData(json);
      const ids = (json.announcements || []).map((a: Announcement) => a.id);
      markAnnouncementsSeen(ids);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao carregar comunicados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Comunicados
              </CardTitle>
              <CardDescription className="mt-1">
                Mensagens oficiais do Flowcomments (novidades, vídeos, avisos) via control plane.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!data?.controlPlaneConfigured ? (
            <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
              Control plane não configurado. Defina{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">
                FLOWCOMMENTS_CONTROL_PLANE_URL
              </code>{' '}
              no `.env` apontando para a URL do Flowcomments Cloud (Railway oficial).
            </div>
          ) : data.error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {data.error}
            </div>
          ) : loading && !data.announcements?.length ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Buscando comunicados...
            </div>
          ) : data.announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum comunicado no momento.</p>
          ) : (
            <ul className="space-y-5">
              {data.announcements.map((item) => (
                <li key={item.id} className="border-b border-border pb-5 last:border-0 last:pb-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-semibold tracking-tight">{item.title}</h3>
                    <time className="text-xs text-muted-foreground">
                      {new Date(item.publishedAt).toLocaleString('pt-BR')}
                    </time>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{item.body}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.mediaUrl && (
                      <a href={item.mediaUrl} target="_blank" rel="noreferrer">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          {item.mediaType === 'video' ? 'Ver vídeo' : 'Abrir mídia'}
                        </Button>
                      </a>
                    )}
                    {item.ctaUrl && (
                      <a href={item.ctaUrl} target="_blank" rel="noreferrer">
                        <Button size="sm">{item.ctaLabel || 'Abrir'}</Button>
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
