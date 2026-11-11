'use client';

import { useEffect } from 'react';

/**
 * If the user has no explicit locale cookie, refine detection on the client
 * using timezone (Brazil) — useful when the edge has no geo headers (Railway).
 */
export function LocaleBootstrap() {
  useEffect(() => {
    const cookie = document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('NEXT_LOCALE='));
    if (cookie) return;

    let tz = '';
    try {
      tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    } catch {
      // ignore
    }

    const inBrazil =
      tz === 'America/Sao_Paulo' ||
      tz === 'America/Manaus' ||
      tz === 'America/Belem' ||
      tz === 'America/Fortaleza' ||
      tz === 'America/Recife' ||
      tz === 'America/Cuiaba' ||
      tz === 'America/Porto_Velho' ||
      tz === 'America/Boa_Vista' ||
      tz === 'America/Rio_Branco' ||
      tz.startsWith('America/Sao_') ||
      /\bpt-BR\b/i.test(navigator.language);

    if (!inBrazil) return;

    void fetch('/api/locale', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale: 'pt', source: 'geo-bootstrap' }),
    }).then((res) => {
      if (res.ok) window.location.reload();
    });
  }, []);

  return null;
}
