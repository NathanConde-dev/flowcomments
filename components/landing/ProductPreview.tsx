'use client';

import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, Zap } from 'lucide-react';
import { StatusBadge } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils/cn';

const FLOW_STEPS = [
  {
    key: 'trigger',
    body: (
      <>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Trigger
        </p>
        <p className="text-sm text-foreground">
          Comentário contém <span className="font-semibold">“preço”</span> ou{' '}
          <span className="font-semibold">“quero”</span>
        </p>
      </>
    ),
  },
  {
    key: 'reply',
    body: (
      <>
        <div className="mb-2 flex items-center gap-2 text-foreground">
          <MessageCircle className="h-4 w-4" />
          <p className="text-sm font-semibold">Resposta pública</p>
        </div>
        <p className="text-sm text-muted-foreground">“Te enviei o link no Direct ✨”</p>
      </>
    ),
  },
  {
    key: 'dm',
    body: (
      <>
        <div className="mb-2 flex items-center gap-2 text-foreground">
          <Send className="h-4 w-4" />
          <p className="text-sm font-semibold">DM automática</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Envia catálogo + CTA de compra em segundos.
        </p>
      </>
    ),
  },
] as const;

const INBOX = [
  { name: 'marina.store', preview: 'Mandou o preço?', tone: 'progress' as const, label: 'Aberto' },
  { name: 'joao.fit', preview: 'Recebeu o link', tone: 'success' as const, label: 'OK' },
  { name: 'ana.beauty', preview: 'Quero o catálogo', tone: 'progress' as const, label: 'Aberto' },
];

function useInViewOnce<T extends HTMLElement>(threshold = 0.28) {
  const ref = useRef<T | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setActive(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          io.disconnect();
        }
      },
      { threshold, rootMargin: '0px 0px -8% 0px' }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [threshold]);

  return { ref, active };
}

function CountUp({ to, active }: { to: number; active: boolean }) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(to);
      return;
    }

    const duration = 1200;
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(to * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, to]);

  return <>{value}</>;
}

function RevealItem({
  active,
  delayMs,
  className,
  children,
}: {
  active: boolean;
  delayMs: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn('will-change-[opacity,transform]', className)}
      style={{
        opacity: active ? 1 : 0,
        transform: active ? 'translateY(0) scale(1)' : 'translateY(14px) scale(0.98)',
        transition: `opacity 520ms var(--ease-out-soft) ${delayMs}ms, transform 520ms var(--ease-out-soft) ${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
}

export function ProductPreview() {
  const { ref, active } = useInViewOnce<HTMLDivElement>(0.22);

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-3xl overflow-hidden">
      <div className="pointer-events-none absolute -inset-6 fc-soft-orb opacity-80 sm:-inset-10" aria-hidden />

      <div className="relative grid items-stretch gap-3 sm:gap-4 md:grid-cols-2">
        <div className="fc-soft-panel flex h-full flex-col rounded-3xl border border-white/80 p-4 shadow-float sm:p-5 md:p-6">
          <RevealItem active={active} delayMs={0}>
            <div className="mb-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-soft">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Comentário → DM</p>
                  <p className="text-xs text-muted-foreground">Automação ao vivo</p>
                </div>
              </div>
              <StatusBadge tone="success">Ativo</StatusBadge>
            </div>
          </RevealItem>

          <div className="flex flex-1 flex-col justify-between space-y-3">
            {FLOW_STEPS.map((step, index) => (
              <div key={step.key}>
                {index > 0 && (
                  <RevealItem active={active} delayMs={140 + index * 180}>
                    <div className="mb-3 flex justify-center">
                      <div className="h-6 w-px bg-gradient-to-b from-zinc-300 to-transparent" />
                    </div>
                  </RevealItem>
                )}
                <RevealItem active={active} delayMs={80 + index * 180}>
                  <div className="rounded-2xl border border-border/70 bg-white/90 px-4 py-3 shadow-soft">
                    {step.body}
                  </div>
                </RevealItem>
              </div>
            ))}
          </div>
        </div>

        <div className="flex h-full min-h-0 flex-col gap-4">
          <div className="fc-soft-panel flex min-h-0 flex-1 flex-col rounded-3xl border border-white/80 p-5 shadow-float">
            <RevealItem active={active} delayMs={120}>
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Inbox
              </p>
            </RevealItem>
            <div className="flex flex-1 flex-col justify-center gap-3">
              {INBOX.map((item, index) => (
                <RevealItem key={item.name} active={active} delayMs={280 + index * 160}>
                  <div className="flex items-center gap-3 rounded-2xl bg-white/90 px-3 py-2.5 shadow-soft">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                      {item.name[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">@{item.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{item.preview}</p>
                    </div>
                    <StatusBadge tone={item.tone} icon={false}>
                      {item.label}
                    </StatusBadge>
                  </div>
                </RevealItem>
              ))}
            </div>
          </div>

          <div className="fc-soft-panel flex shrink-0 flex-col justify-center rounded-3xl border border-white/80 p-5 shadow-float">
            <RevealItem active={active} delayMs={520}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Resultado
              </p>
              <p className="text-2xl font-bold tracking-tight text-foreground">
                +<CountUp to={38} active={active} /> leads
              </p>
            </RevealItem>
            <RevealItem active={active} delayMs={720}>
              <p className="mt-1 text-sm text-muted-foreground">
                convertidos de comentários hoje, sem responder manualmente.
              </p>
            </RevealItem>
          </div>
        </div>
      </div>
    </div>
  );
}
