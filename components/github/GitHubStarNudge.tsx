'use client';

import { useEffect, useState } from 'react';
import { Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISMISS_KEY = 'fc-github-star-dismissed';
const REPO_URL = 'https://github.com/NathanConde-dev/flowcomments';

export function GitHubStarNudge({ compact = false }: { compact?: boolean }) {
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
        href={REPO_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={dismiss}
        className="flex items-center gap-2 rounded-lg px-2.5 py-2.5 text-sm text-foreground transition-colors hover:bg-muted"
      >
        <Star className="h-4 w-4 text-amber-500" />
        Dar uma estrela no GitHub
      </a>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white p-4 shadow-soft">
      <button
        type="button"
        aria-label="Fechar"
        onClick={dismiss}
        className="absolute right-2 top-2 rounded-lg p-1 text-muted-foreground hover:bg-white hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-amber-300">
          <Star className="h-5 w-5 fill-current" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Curtiu o Flowcomments?</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Uma estrela no GitHub ajuda o projeto a crescer e mostra que o self-host vale a pena.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" onClick={dismiss}>
              <Button size="sm" className="rounded-full">
                <Star className="h-3.5 w-3.5" />
                Star no GitHub
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
