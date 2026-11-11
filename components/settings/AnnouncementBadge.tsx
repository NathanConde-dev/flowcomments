'use client';

import { useEffect, useState } from 'react';

const SEEN_KEY = 'fc-announcements-seen';

export function AnnouncementBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/settings/announcements', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        const ids: string[] = (data.announcements || []).map((a: { id: string }) => a.id);
        const seenRaw = window.localStorage.getItem(SEEN_KEY);
        const seen = seenRaw ? (JSON.parse(seenRaw) as string[]) : [];
        const unseen = ids.filter((id) => !seen.includes(id));
        if (!cancelled) setCount(unseen.length);
      } catch {
        // ignore
      }
    };

    load();
    const id = window.setInterval(load, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (count <= 0) return null;

  return (
    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-600 px-1.5 text-[10px] font-semibold text-white">
      {count > 9 ? '9+' : count}
    </span>
  );
}

export function markAnnouncementsSeen(ids: string[]) {
  if (typeof window === 'undefined') return;
  const seenRaw = window.localStorage.getItem(SEEN_KEY);
  const seen = new Set(seenRaw ? (JSON.parse(seenRaw) as string[]) : []);
  ids.forEach((id) => seen.add(id));
  window.localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
}
