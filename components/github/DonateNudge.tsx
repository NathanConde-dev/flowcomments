'use client';

import { useEffect, useState } from 'react';
import { Heart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'fc-donate-nudge-dismissed';
const DONATE_URL = 'https://flowcomments.com/donate';

export function DonateNudge({ compact = false }: { compact?: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === '1') return;
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, []);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  };

  if (!visible) return null;

  if (compact) {
    return (
      <a
        href={DONATE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-lg px-2.5 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
      >
        <Heart className="h-4 w-4 text-rose-500" />
        Doe para apoiar o projeto
      </a>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-rose-200/80 bg-gradient-to-br from-rose-50 to-white p-4 shadow-soft">
      <button
        type="button"
        aria-label="Fechar"
        onClick={dismiss}
        className="absolute right-2 top-2 rounded-lg p-1 text-muted-foreground hover:bg-white hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-rose-300">
          <Heart className="h-5 w-5 fill-current" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Doe para continuar apoiando o projeto</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Self-host é grátis. Uma doação pontual ajuda docs, updates e o core público.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={DONATE_URL} target="_blank" rel="noopener noreferrer">
              <Button size="sm" className="rounded-full">
                <Heart className="h-3.5 w-3.5" />
                Doar agora
              </Button>
            </a>
            <Button size="sm" variant="outline" className="rounded-full" onClick={dismiss}>
              Agora não
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
