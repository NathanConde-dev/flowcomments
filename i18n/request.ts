import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { defaultLocale, isAppLocale, type AppLocale } from './config';

async function resolveLocale(): Promise<AppLocale> {
  const jar = await cookies();
  const cookieLocale = jar.get('NEXT_LOCALE')?.value;
  if (isAppLocale(cookieLocale)) return cookieLocale;

  const h = await headers();
  const country = (
    h.get('cf-ipcountry') ||
    h.get('x-vercel-ip-country') ||
    h.get('x-country-code') ||
    h.get('cloudfront-viewer-country') ||
    ''
  ).toUpperCase();
  if (country === 'BR' || country === 'PT') return 'pt';

  const accept = h.get('accept-language') || '';
  for (const part of accept.split(',')) {
    const tag = part.trim().split(';')[0]?.toLowerCase() || '';
    const base = tag.split('-')[0];
    if (isAppLocale(base)) return base;
  }

  return defaultLocale;
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
