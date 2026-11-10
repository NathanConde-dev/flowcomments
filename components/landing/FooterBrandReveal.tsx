'use client';

import { useEffect, useRef, useState } from 'react';

/** Texto da marca com gradiente, usado na camada sticky atrás do card */
export function FooterBrandText() {
  const ref = useRef<HTMLParagraphElement>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(1);
      return;
    }

    let frame = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const raw = (vh - rect.top) / (vh * 0.65);
      setProgress(Math.min(1, Math.max(0, raw)));
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  const t = 1 - (1 - progress) ** 2;
  const opacity = 0.35 + t * 0.65;

  return (
    <p
      ref={ref}
      aria-hidden
      className="mb-[-0.12em] select-none whitespace-nowrap font-brand text-[clamp(4rem,18vw,10rem)] font-bold leading-none tracking-tight text-zinc-300"
      style={{
        opacity,
        WebkitMaskImage:
          'linear-gradient(180deg, #000 0%, #000 45%, rgba(0,0,0,0.4) 70%, transparent 100%)',
        maskImage:
          'linear-gradient(180deg, #000 0%, #000 45%, rgba(0,0,0,0.4) 70%, transparent 100%)',
      }}
    >
      Flowcomments
    </p>
  );
}
