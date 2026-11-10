'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { BrandLogo } from '@/components/brand/BrandLogo';

type SiteFooterProps = {
  description?: string;
};

/** Zona da marca, mais baixa, logo após o card */
const BRAND_ZONE = 'min(28vh, 180px)';

export function SiteFooter({
  description = 'Automatize comentários e DMs no Instagram com um fluxo limpo, self-hosted e sob o seu controle, tudo em um só lugar.',
}: SiteFooterProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [reveal, setReveal] = useState(0);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setReveal(1);
      return;
    }

    let frame = 0;
    const update = () => {
      const rect = card.getBoundingClientRect();
      const brandH = Math.min(window.innerHeight * 0.28, 180);
      // Só aparece quando há espaço abaixo do card (card já passou / subiu)
      const spaceBelow = window.innerHeight - rect.bottom;
      setReveal(Math.min(1, Math.max(0, spaceBelow / brandH)));
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

  const t = 1 - (1 - reveal) ** 1.6;

  return (
    <footer className="relative px-4 pt-4 sm:px-6">
      {/* Marca fixa, só visível depois que o card sobe */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 bottom-0 z-0 flex items-end justify-center overflow-hidden px-4"
        style={{
          height: BRAND_ZONE,
          opacity: t,
          visibility: reveal > 0.02 ? 'visible' : 'hidden',
        }}
      >
        <p
          className="mb-[-0.1em] select-none whitespace-nowrap font-brand text-[clamp(3.5rem,16vw,8.5rem)] font-bold leading-none tracking-tight text-zinc-300 will-change-transform"
          style={{
            transform: `translate3d(0, ${(1 - t) * 36}px, 0)`,
            WebkitMaskImage:
              'linear-gradient(180deg, #000 0%, #000 42%, rgba(0,0,0,0.4) 70%, transparent 100%)',
            maskImage:
              'linear-gradient(180deg, #000 0%, #000 42%, rgba(0,0,0,0.4) 70%, transparent 100%)',
          }}
        >
          Flowcomments
        </p>
      </div>

      {/* Card por cima */}
      <div
        ref={cardRef}
        className="relative z-10 mx-auto max-w-6xl rounded-3xl border border-white/80 bg-white px-5 pb-8 pt-8 shadow-float sm:px-10 sm:pt-12"
      >
        <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div className="max-w-md">
            <BrandLogo className="text-xl" speedMs={36} />
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Produto</p>
              <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
                <li>
                  <Link href="/login" className="hover:text-foreground">
                    Entrar
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com/NathanConde-dev/flowcomments"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground"
                  >
                    GitHub
                  </a>
                </li>
                <li>
                  <Link href="/login" className="hover:text-foreground">
                    Automações
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Recursos</p>
              <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
                <li>
                  <Link href="/licenca" className="hover:text-foreground">
                    Licença
                  </Link>
                </li>
                <li>
                  <a
                    href="https://github.com/NathanConde-dev/flowcomments"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground"
                  >
                    Documentação
                  </a>
                </li>
                <li>
                  <a href="mailto:contato@nathanconde.com" className="hover:text-foreground">
                    Suporte
                  </a>
                </li>
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-sm font-semibold text-foreground">Empresa</p>
              <ul className="mt-3 space-y-2.5 text-sm text-muted-foreground">
                <li>
                  <a href="mailto:contato@nathanconde.com" className="hover:text-foreground">
                    Contato
                  </a>
                </li>
                <li>
                  <a
                    href="mailto:contato@nathanconde.com?subject=Interesse%20em%20Flowcomments%20Cloud"
                    className="hover:text-foreground"
                  >
                    Cloud
                  </a>
                </li>
                <li>
                  <a
                    href="https://nathanconde.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground"
                  >
                    Nathan Condé
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border/70 pt-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Flowcomments. Todos os direitos reservados.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/licenca" className="underline underline-offset-2 hover:text-foreground">
              Licença
            </Link>
            <a
              href="mailto:contato@nathanconde.com"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Contato
            </a>
            <a
              href="https://github.com/NathanConde-dev/flowcomments"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>

      {/* Pista curta após o card */}
      <div aria-hidden className="relative z-0" style={{ height: BRAND_ZONE }} />
    </footer>
  );
}
