'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export function ScrollReveal({
  children,
  className,
  delayMs = 0,
  y = 28,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.14, rootMargin: '0px 0px -10% 0px' }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn('will-change-[opacity,transform]', className)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : `translateY(${y}px) scale(0.985)`,
        transition: `opacity 700ms var(--ease-out-soft) ${delayMs}ms, transform 700ms var(--ease-out-soft) ${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
}

/** Soft overlays + parallax tied to page scroll */
export function ScrollAtmosphere({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        setProgress(Math.min(1, window.scrollY / max));
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const veil = Math.min(0.18, progress * 0.35);
  const glow = Math.max(0, 0.55 - progress * 0.7);

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[25] transition-opacity duration-300"
        style={{
          opacity: veil,
          background:
            'linear-gradient(180deg, rgba(15,15,15,0.12) 0%, transparent 28%, transparent 72%, rgba(15,15,15,0.1) 100%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-[24] h-[42vh]"
        style={{
          opacity: glow,
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(255,255,255,0.85), transparent 70%)',
          transform: `translateY(${progress * -40}px)`,
        }}
      />
      {children}
    </div>
  );
}
