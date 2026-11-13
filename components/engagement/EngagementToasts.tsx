'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Github, Heart, MessageCircle, Star } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import {
  ENGAGEMENT_EVENT,
  ENGAGEMENT_PROMPT_ORDER,
  type EngagementPromptId,
  type EngagementStore,
  completePrompt,
  nextEligiblePrompt,
  readEngagementStore,
  signalEngagement,
  snoozePrompt,
  wakeOnEngagement,
  writeEngagementStore,
} from '@/lib/engagement/storage';

const DONATE_URL = 'https://flowcomments.com/donate';
const REPO_URL = 'https://github.com/NathanConde-dev/flowcomments';
/** Set NEXT_PUBLIC_WHATSAPP_GROUP_URL when the community invite is ready. */
const WHATSAPP_URL = (process.env.NEXT_PUBLIC_WHATSAPP_GROUP_URL || '').trim();

const INITIAL_DELAY_MS = 7000;
const ENGAGEMENT_SHOW_DELAY_MS = 1800;

type PromptCopy = {
  id: EngagementPromptId;
  title: string;
  body: string;
  cta: string;
  href: string | null;
  icon: 'heart' | 'github' | 'whatsapp';
};

const PROMPTS: PromptCopy[] = [
  {
    id: 'donate',
    title: 'Quer apoiar o Flowcomments?',
    body: 'Self-host é grátis. Uma doação pontual ajuda a manter o projeto atualizado.',
    cta: 'Doar agora',
    href: DONATE_URL,
    icon: 'heart',
  },
  {
    id: 'github-star',
    title: 'Está gostando do Flowcomments?',
    body: 'Uma estrela no GitHub ajuda mais pessoas a encontrar o projeto.',
    cta: 'Dar uma estrela no GitHub',
    href: REPO_URL,
    icon: 'github',
  },
  {
    id: 'whatsapp',
    title: 'Entre no grupo open source',
    body: 'Receba outros projetos de código aberto e novidades da comunidade.',
    cta: WHATSAPP_URL ? 'Entrar no WhatsApp' : 'Em breve no WhatsApp',
    href: WHATSAPP_URL || null,
    icon: 'whatsapp',
  },
];

function IconBadge({ kind }: { kind: PromptCopy['icon'] }) {
  const base =
    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-zinc-50 text-foreground';
  if (kind === 'heart') {
    return (
      <span className={base}>
        <Heart className="h-4 w-4 text-rose-500" fill="currentColor" />
      </span>
    );
  }
  if (kind === 'whatsapp') {
    return (
      <span className={base}>
        <MessageCircle className="h-4 w-4 text-emerald-600" />
      </span>
    );
  }
  return (
    <span className={base}>
      <Github className="h-4 w-4" />
    </span>
  );
}

export function EngagementToasts() {
  const pathname = usePathname();
  const [store, setStore] = useState<EngagementStore | null>(null);
  const [activeId, setActiveId] = useState<EngagementPromptId | null>(null);
  const [entered, setEntered] = useState(false);

  const persist = useCallback((next: EngagementStore) => {
    writeEngagementStore(next);
    setStore(next);
  }, []);

  const pick = useCallback((nextStore: EngagementStore) => {
    const id = nextEligiblePrompt(nextStore);
    setActiveId(id);
    setEntered(false);
    if (id) {
      window.setTimeout(() => setEntered(true), 30);
    }
  }, []);

  useEffect(() => {
    const initial = readEngagementStore();
    setStore(initial);
    const t = window.setTimeout(() => {
      pick(readEngagementStore());
    }, INITIAL_DELAY_MS);
    return () => window.clearTimeout(t);
  }, [pick]);

  // Soft engagement: browsing automation builder / list
  useEffect(() => {
    if (!pathname) return;
    const hot =
      pathname.startsWith('/automations/new') ||
      pathname.startsWith('/automations/') ||
      pathname === '/automations';
    if (!hot) return;
    const t = window.setTimeout(() => signalEngagement({ source: `route:${pathname}` }), 1200);
    return () => window.clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    const onEngage = () => {
      const current = readEngagementStore();
      const { store: woken, woke } = wakeOnEngagement(current);
      if (woke.length === 0) return;
      writeEngagementStore(woken);
      setStore(woken);
      window.setTimeout(() => {
        pick(woken);
      }, ENGAGEMENT_SHOW_DELAY_MS);
    };

    window.addEventListener(ENGAGEMENT_EVENT, onEngage as EventListener);
    return () => window.removeEventListener(ENGAGEMENT_EVENT, onEngage as EventListener);
  }, [pick]);

  const prompt = useMemo(
    () => PROMPTS.find((p) => p.id === activeId) || null,
    [activeId]
  );

  const dismiss = () => {
    if (!store || !activeId) return;
    const next = snoozePrompt(store, activeId);
    persist(next);
    // Immediately surface the next card in the queue
    pick(next);
  };

  const complete = () => {
    if (!store || !activeId) return;
    const next = completePrompt(store, activeId);
    persist(next);
    pick(next);
  };

  if (!prompt || !activeId) return null;

  const ctaDisabled = !prompt.href;

  return (
    <div
      className={cn(
        'pointer-events-none fixed z-[60] flex justify-end px-4',
        // Sit above mobile bottom nav
        'bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-0',
        'sm:bottom-6 sm:right-6 sm:px-0',
        'lg:bottom-6'
      )}
      aria-live="polite"
    >
      <div
        className={cn(
          'pointer-events-auto w-[min(100%,22rem)] overflow-hidden rounded-2xl border border-border/80 bg-white p-4 shadow-float transition-[opacity,transform] duration-300 ease-out',
          entered ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
        )}
        role="dialog"
        aria-label={prompt.title}
      >
        <div className="flex items-start gap-3">
          <IconBadge kind={prompt.icon} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold leading-snug text-foreground">{prompt.title}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{prompt.body}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg px-1 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Agora não
          </button>

          {ctaDisabled ? (
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3.5 py-2 text-sm font-semibold text-foreground transition hover:bg-zinc-200"
            >
              {prompt.cta}
            </button>
          ) : (
            <a
              href={prompt.href!}
              target="_blank"
              rel="noopener noreferrer"
              onClick={complete}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800"
            >
              {prompt.icon === 'github' ? <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" /> : null}
              {prompt.icon === 'heart' ? <Heart className="h-3.5 w-3.5 fill-rose-300 text-rose-300" /> : null}
              {prompt.icon === 'whatsapp' ? <MessageCircle className="h-3.5 w-3.5" /> : null}
              {prompt.cta}
            </a>
          )}
        </div>

        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {ENGAGEMENT_PROMPT_ORDER.map((id) => (
            <span
              key={id}
              className={cn(
                'h-1 w-1 rounded-full',
                id === activeId ? 'bg-zinc-800' : 'bg-zinc-300'
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
