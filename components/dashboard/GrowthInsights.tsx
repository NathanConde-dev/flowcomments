'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { useSelectedIgAccount } from '@/components/instagram/SelectedIgAccountContext';
import { cn } from '@/lib/utils/cn';

type GrowthResponse = {
  from: string;
  to: string;
  summary: {
    active: number;
    inactive: number;
    total: number;
  };
  series: Array<{ date: string; value: number }>;
};

function parseDateOnly(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatRangeLabel(from: string, to: string) {
  const fromDate = parseDateOnly(from);
  const toDate = parseDateOnly(to);
  const sameYear = fromDate.getUTCFullYear() === toDate.getUTCFullYear();

  const fromLabel = fromDate.toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: sameYear ? undefined : 'numeric',
  });
  const toLabel = toDate.toLocaleDateString('pt-BR', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `${fromLabel} – ${toLabel}`;
}

function formatAxisDate(value: string) {
  return parseDateOnly(value).toLocaleDateString('en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
  });
}

function defaultRange() {
  const to = new Date();
  const toUtc = new Date(
    Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())
  );
  const from = addDays(toUtc, -14);
  return { from: toDateInputValue(from), to: toDateInputValue(toUtc) };
}

function niceMax(value: number) {
  if (value <= 0) return 10;
  const padded = Math.ceil(value * 1.15);
  const magnitude = 10 ** Math.floor(Math.log10(padded));
  const normalized = padded / magnitude;
  const nice =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  return nice * magnitude;
}

function GrowthChart({
  series,
}: {
  series: Array<{ date: string; value: number }>;
}) {
  const width = 720;
  const height = 280;
  const padding = { top: 16, right: 16, bottom: 36, left: 36 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const maxValue = niceMax(Math.max(...series.map((point) => point.value), 0));
  const ticks = 6;

  const points = series.map((point, index) => {
    const x =
      series.length <= 1
        ? padding.left + innerWidth / 2
        : padding.left + (index / (series.length - 1)) * innerWidth;
    const y =
      padding.top + innerHeight - (point.value / maxValue) * innerHeight;
    return { ...point, x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`
      : '';

  const xLabels =
    points.length <= 2
      ? points
      : [points[0], points[Math.floor(points.length / 2)], points[points.length - 1]];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" role="img">
      <defs>
        <linearGradient id="fc-growth-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#18181B" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#18181B" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {Array.from({ length: ticks + 1 }, (_, index) => {
        const value = (maxValue / ticks) * (ticks - index);
        const y = padding.top + (innerHeight / ticks) * index;
        return (
          <g key={value}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={y}
              y2={y}
              stroke="#E5E7EB"
              strokeWidth="1"
            />
            <text
              x={padding.left - 10}
              y={y + 4}
              textAnchor="end"
              className="fill-zinc-400"
              fontSize="11"
            >
              {Math.round(value)}
            </text>
          </g>
        );
      })}

      {areaPath && <path d={areaPath} fill="url(#fc-growth-fill)" />}
      {linePath && (
        <path
          d={linePath}
          fill="none"
          stroke="#18181B"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {points.map((point) => (
        <circle
          key={point.date}
          cx={point.x}
          cy={point.y}
          r="3.5"
          fill="#fff"
          stroke="#18181B"
          strokeWidth="2"
        />
      ))}

      {xLabels.map((point) => (
        <text
          key={`label-${point.date}`}
          x={point.x}
          y={height - 12}
          textAnchor="middle"
          className="fill-zinc-400"
          fontSize="11"
        >
          {formatAxisDate(point.date)}
        </text>
      ))}
    </svg>
  );
}

export function GrowthInsights() {
  const { selectedAccountId, selectedAccount, accounts } = useSelectedIgAccount();
  const initial = useMemo(() => defaultRange(), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [draftFrom, setDraftFrom] = useState(initial.from);
  const [draftTo, setDraftTo] = useState(initial.to);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<GrowthResponse | null>(null);
  const rangeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rangeRef.current?.contains(event.target as Node)) {
        setRangeOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    return () => window.removeEventListener('mousedown', onPointerDown);
  }, []);

  useEffect(() => {
    if (!selectedAccountId) {
      setData(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    const params = new URLSearchParams({
      accountId: selectedAccountId,
      from,
      to,
    });

    fetch(`/api/insights/growth?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((payload: GrowthResponse | null) => {
        if (!payload) return;
        setData(payload);
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setData(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [selectedAccountId, from, to]);

  const applyRange = () => {
    if (draftFrom > draftTo) return;
    setFrom(draftFrom);
    setTo(draftTo);
    setRangeOpen(false);
  };

  if (accounts.length === 0) {
    return (
      <section className="rounded-2xl border border-border/70 bg-white p-6 shadow-float">
        <h2 className="text-lg font-bold text-foreground">Insights de crescimento</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Conecte uma conta do Instagram para acompanhar contatos ativos.
        </p>
      </section>
    );
  }

  const summary = data?.summary ?? { active: 0, inactive: 0, total: 0 };
  const series = data?.series ?? [];

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-white shadow-float">
      <div className="flex flex-col gap-4 border-b border-border/70 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-foreground"
            aria-label="Métrica de insights"
          >
            Contatos Ativos
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
          {selectedAccount && (
            <p className="mt-1 text-xs text-muted-foreground">
              Conta @{selectedAccount.username}
            </p>
          )}
        </div>

        <div className="relative" ref={rangeRef}>
          <button
            type="button"
            onClick={() => {
              setDraftFrom(from);
              setDraftTo(to);
              setRangeOpen((open) => !open);
            }}
            className="inline-flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-white px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted sm:min-w-[280px]"
          >
            <span>{formatRangeLabel(from, to)}</span>
            <Calendar className="h-4 w-4 shrink-0 text-foreground" />
          </button>

          {rangeOpen && (
            <div className="absolute right-0 z-20 mt-2 w-[min(100vw-2rem,320px)] rounded-xl border border-border bg-white p-3 shadow-float">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1 text-xs font-medium text-muted-foreground">
                  De
                  <input
                    type="date"
                    value={draftFrom}
                    onChange={(event) => setDraftFrom(event.target.value)}
                    className="w-full rounded-lg border border-border px-2.5 py-2 text-sm text-foreground outline-none focus:border-blue-400"
                  />
                </label>
                <label className="space-y-1 text-xs font-medium text-muted-foreground">
                  Até
                  <input
                    type="date"
                    value={draftTo}
                    onChange={(event) => setDraftTo(event.target.value)}
                    className="w-full rounded-lg border border-border px-2.5 py-2 text-sm text-foreground outline-none focus:border-blue-400"
                  />
                </label>
              </div>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRangeOpen(false)}
                  className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={applyRange}
                  className="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Aplicar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_220px]">
        <div className="min-h-[280px] px-2 py-3 sm:px-4 sm:py-4">
          {loading && !data ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              Carregando insights…
            </div>
          ) : series.length === 0 ? (
            <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
              Sem dados no período
            </div>
          ) : (
            <div className={cn('h-[280px]', loading && 'opacity-60')}>
              <GrowthChart series={series} />
            </div>
          )}
        </div>

        <div className="border-t border-border/70 lg:border-l lg:border-t-0">
          {[
            { label: 'Contatos Ativos', value: summary.active },
            { label: 'Contatos Inativos', value: summary.inactive },
            { label: 'Total de contatos', value: summary.total },
          ].map((item, index) => (
            <div
              key={item.label}
              className={cn(
                'px-5 py-5',
                index > 0 && 'border-t border-border/70'
              )}
            >
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
                {item.value.toLocaleString('pt-BR')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
