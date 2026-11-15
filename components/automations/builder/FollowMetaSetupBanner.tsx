'use client';

import { AlertTriangle, ExternalLink } from 'lucide-react';
import {
  FOLLOW_CHECK_DOCS_URL,
  FOLLOW_CHECK_SETUP_ERROR,
} from '@/lib/instagram/follow-check-shared';

export function FollowMetaSetupBanner({
  compact = false,
  className = '',
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-amber-300 bg-amber-50 text-amber-950 ${
        compact ? 'px-3 py-2.5' : 'px-4 py-3'
      } ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <AlertTriangle className={`mt-0.5 shrink-0 ${compact ? 'h-4 w-4' : 'h-4.5 w-4.5'}`} />
        <div className="min-w-0 space-y-1.5">
          <p className={`font-semibold ${compact ? 'text-xs' : 'text-sm'}`}>
            Follow check precisa de configuração no Meta
          </p>
          <p className={`leading-relaxed opacity-90 ${compact ? 'text-[11px]' : 'text-xs'}`}>
            {FOLLOW_CHECK_SETUP_ERROR} Sem Page token, o botão “Já segui” não valida e a
            automação fica bloqueada para ativar.
          </p>
          <a
            href={FOLLOW_CHECK_DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold underline underline-offset-2 hover:opacity-80"
          >
            Ver como corrigir
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
