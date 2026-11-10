'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils/cn';

const BRAND = 'Flowcomments';

type BrandLogoProps = {
  className?: string;
  href?: string;
  as?: 'span' | 'p' | 'h1';
  /** ms between characters */
  speedMs?: number;
  showCaret?: boolean;
};

export function BrandLogo({
  className,
  href,
  as: Tag = 'span',
  speedMs = 42,
  showCaret = true,
}: BrandLogoProps) {
  const [visible, setVisible] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      setVisible(BRAND);
      setDone(true);
      return;
    }

    let i = 0;
    setVisible('');
    setDone(false);

    const id = window.setInterval(() => {
      i += 1;
      setVisible(BRAND.slice(0, i));
      if (i >= BRAND.length) {
        window.clearInterval(id);
        setDone(true);
      }
    }, speedMs);

    return () => window.clearInterval(id);
  }, [speedMs]);

  const mark = (
    <Tag
      className={cn(
        'font-brand font-bold tracking-tight inline-flex items-baseline',
        className
      )}
      aria-label={BRAND}
    >
      <span className="relative inline-block whitespace-nowrap">
        <span className="invisible select-none" aria-hidden>
          {BRAND}
        </span>
        <span className="absolute inset-y-0 left-0 flex items-baseline">
          <span>{visible}</span>
          {showCaret && !done && (
            <span
              aria-hidden
              className="ml-[1px] inline-block h-[0.85em] w-[2px] translate-y-[0.08em] rounded-full bg-current animate-pulse"
            />
          )}
        </span>
      </span>
    </Tag>
  );

  if (href) {
    return (
      <Link href={href} className="cursor-pointer">
        {mark}
      </Link>
    );
  }

  return mark;
}
