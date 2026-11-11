import type { AppLocale } from '@/i18n/config';
import { localeFlags } from '@/i18n/config';

/** Thin Apple-style system emoji flag (no Twemoji cartoon). */
export function LocaleFlag({
  locale,
  className = '',
}: {
  locale: AppLocale;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-flex select-none items-center justify-center leading-none ${className}`}
      style={{
        fontFamily:
          '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "EmojiOne Color", sans-serif',
        fontSize: '1.05em',
        lineHeight: 1,
        filter: 'saturate(0.92) contrast(1.02)',
      }}
    >
      {localeFlags[locale]}
    </span>
  );
}
