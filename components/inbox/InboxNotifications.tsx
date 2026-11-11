'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast as sonnerToast } from 'sonner';
import { cn } from '@/lib/utils/cn';

type UnreadItem = {
  id: string;
  unreadCount: number;
  contactUsername: string;
  preview: string | null;
};

type Summary = {
  unreadConversations: number;
  unreadMessages: number;
  toastNotifications: boolean;
  soundNotifications: boolean;
  items: UnreadItem[];
};

const POLL_MS = 12_000;
const listeners = new Set<(summary: Summary) => void>();
let sharedSummary: Summary | null = null;
let sharedPromise: Promise<Summary | null> | null = null;

async function fetchSummary(): Promise<Summary | null> {
  try {
    const res = await fetch('/api/inbox/notifications', { cache: 'no-store' });
    if (!res.ok) return null;
    const json = (await res.json()) as Summary;
    sharedSummary = json;
    listeners.forEach((listener) => listener(json));
    return json;
  } catch {
    return null;
  }
}

function ensurePolling() {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { __fcInboxPoll?: number };
  if (w.__fcInboxPoll) return;

  void fetchSummary();
  w.__fcInboxPoll = window.setInterval(() => {
    if (document.visibilityState === 'hidden') return;
    void fetchSummary();
  }, POLL_MS);
}

function subscribe(listener: (summary: Summary) => void) {
  listeners.add(listener);
  ensurePolling();
  if (sharedSummary) listener(sharedSummary);
  else if (!sharedPromise) {
    sharedPromise = fetchSummary().finally(() => {
      sharedPromise = null;
    });
  }
  return () => {
    listeners.delete(listener);
  };
}

function playNotificationSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.start(now);
    osc.stop(now + 0.24);
    window.setTimeout(() => void ctx.close(), 400);
  } catch {
    // ignore
  }
}

export function useInboxUnreadCount() {
  const [count, setCount] = useState(sharedSummary?.unreadConversations || 0);

  useEffect(() => {
    return subscribe((summary) => setCount(summary.unreadConversations || 0));
  }, []);

  return count;
}

export function InboxNavBadge({
  active = false,
  className,
}: {
  active?: boolean;
  className?: string;
}) {
  const count = useInboxUnreadCount();
  if (count <= 0) return null;

  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold',
        active ? 'bg-white text-zinc-900' : 'bg-emerald-600 text-white',
        className
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

export function InboxMobileBadgeDot() {
  const count = useInboxUnreadCount();
  if (count <= 0) return null;
  return (
    <span className="absolute right-3 top-1.5 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-white" />
  );
}

export function InboxNotifier() {
  const pathname = usePathname();
  const router = useRouter();
  const baselineRef = useRef<Map<string, number> | null>(null);
  const seenToastRef = useRef<Set<string>>(new Set());

  const maybeNotify = useCallback(
    (summary: Summary) => {
      const next = new Map(summary.items.map((item) => [item.id, item.unreadCount]));

      if (!baselineRef.current) {
        baselineRef.current = next;
        return;
      }

      const increased = summary.items.filter((item) => {
        const prev = baselineRef.current!.get(item.id) || 0;
        return item.unreadCount > prev;
      });

      baselineRef.current = next;

      if (increased.length === 0) return;
      if (pathname?.startsWith('/inbox')) return;

      for (const item of increased.slice(0, 3)) {
        const key = `${item.id}:${item.unreadCount}:${item.preview || ''}`;
        if (seenToastRef.current.has(key)) continue;
        seenToastRef.current.add(key);

        if (summary.soundNotifications) playNotificationSound();

        if (summary.toastNotifications) {
          sonnerToast.message(`Nova mensagem · @${item.contactUsername}`, {
            description: item.preview?.slice(0, 120) || 'Abrir conversa na inbox',
            action: {
              label: 'Abrir',
              onClick: () => router.push(`/inbox?c=${item.id}`),
            },
            duration: 6000,
          });
        }
      }
    },
    [pathname, router]
  );

  useEffect(() => subscribe(maybeNotify), [maybeNotify]);

  return null;
}
