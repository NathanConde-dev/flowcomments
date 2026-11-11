export const locales = ['en', 'pt'] as const;
export type AppLocale = (typeof locales)[number];

/** English is the primary / default locale */
export const defaultLocale: AppLocale = 'en';

export const localeCookieName = 'NEXT_LOCALE';

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return value === 'en' || value === 'pt';
}
