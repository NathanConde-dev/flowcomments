import type { NextRequest } from 'next/server';
import { defaultLocale, isAppLocale, type AppLocale } from './config';

/**
 * Locale resolution:
 * 1) Explicit user preference cookie
 * 2) Geo country BR/PT
 * 3) Accept-Language
 * 4) Default English
 */
export function detectLocale(request: NextRequest): AppLocale {
  const cookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (isAppLocale(cookie)) return cookie;

  const country = (
    request.headers.get('cf-ipcountry') ||
    request.headers.get('x-vercel-ip-country') ||
    request.headers.get('x-country-code') ||
    request.headers.get('cloudfront-viewer-country') ||
    ''
  ).toUpperCase();

  if (country === 'BR' || country === 'PT') return 'pt';

  const accept = request.headers.get('accept-language') || '';
  const ranked = accept
    .split(',')
    .map((part) => {
      const [tag, qPart] = part.trim().split(';');
      const q = qPart?.startsWith('q=') ? Number(qPart.slice(2)) : 1;
      return { tag: (tag || '').toLowerCase(), q: Number.isFinite(q) ? q : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const item of ranked) {
    const base = item.tag.split('-')[0];
    if (isAppLocale(base)) return base;
  }

  return defaultLocale;
}
