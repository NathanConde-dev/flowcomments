import type { AppLocale } from '@/i18n/config';
import { localeFlagCodes } from '@/i18n/config';

/** Raster flags — Windows shows emoji regional indicators as “BR/US” text. */
export function LocaleFlag({
  locale,
  className = '',
}: {
  locale: AppLocale;
  className?: string;
}) {
  const code = localeFlagCodes[locale];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      srcSet={`https://flagcdn.com/w40/${code}.png 1x, https://flagcdn.com/w80/${code}.png 2x`}
      alt=""
      width={18}
      height={14}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={`inline-block h-[1.05em] w-[1.4em] rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.06)] ${className}`}
      aria-hidden
    />
  );
}
