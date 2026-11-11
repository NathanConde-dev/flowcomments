export const locales = ['pt', 'en', 'fr', 'it', 'de', 'es'] as const;
export type AppLocale = (typeof locales)[number];

/** English remains primary for self-host product UI; BR geo still prefers pt. */
export const defaultLocale: AppLocale = 'en';

export const localeCookieName = 'NEXT_LOCALE';

export const localeLabels: Record<AppLocale, string> = {
  pt: 'Português',
  en: 'English',
  fr: 'Français',
  it: 'Italiano',
  de: 'Deutsch',
  es: 'Español',
};

/** Unicode regional flags (Apple Color Emoji / system emoji). */
export const localeFlags: Record<AppLocale, string> = {
  pt: '🇧🇷',
  en: '🇺🇸',
  fr: '🇫🇷',
  it: '🇮🇹',
  de: '🇩🇪',
  es: '🇪🇸',
};

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return !!value && (locales as readonly string[]).includes(value);
}
