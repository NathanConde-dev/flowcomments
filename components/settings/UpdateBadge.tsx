'use client';

import { useEffect, useState } from 'react';

export function UpdateBadge() {
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch('/api/settings/updates', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setAvailable(Boolean(data.updateAvailable));
      } catch {
        // ignore
      }
    };

    load();
    const id = window.setInterval(load, 6 * 60 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!available) return null;

  return (
    <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-semibold text-white">
      1
    </span>
  );
}
