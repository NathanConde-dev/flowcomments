import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

type PaginationNavProps = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  basePath: string;
  /** Extra query params preserved across pages (e.g. search filters) */
  query?: Record<string, string | undefined>;
  className?: string;
};

function hrefFor(
  basePath: string,
  page: number,
  query?: Record<string, string | undefined>
) {
  const path = basePath.split('?')[0] || '/';
  const params = new URLSearchParams();
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (key === 'page') continue;
      if (value != null && String(value).trim()) params.set(key, String(value));
    }
  }
  if (page > 1) params.set('page', String(page));
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export function PaginationNav({
  page,
  totalPages,
  totalItems,
  pageSize,
  basePath,
  query,
  className,
}: PaginationNavProps) {
  if (totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-border bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <p className="text-xs text-muted-foreground">
        Mostrando {from}–{to} de {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={hrefFor(basePath, page - 1, query)}
          aria-disabled={page <= 1}
          className={cn(
            'inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium transition-colors',
            page <= 1
              ? 'pointer-events-none opacity-40'
              : 'hover:bg-muted'
          )}
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Link>
        <span className="min-w-[7rem] text-center text-xs font-medium text-muted-foreground">
          Página {page} de {totalPages}
        </span>
        <Link
          href={hrefFor(basePath, page + 1, query)}
          aria-disabled={page >= totalPages}
          className={cn(
            'inline-flex h-9 items-center gap-1 rounded-lg border border-border px-3 text-sm font-medium transition-colors',
            page >= totalPages
              ? 'pointer-events-none opacity-40'
              : 'hover:bg-muted'
          )}
        >
          Próxima
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

export const DEFAULT_PAGE_SIZE = 20;

export function parsePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number(raw || '1');
  return Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
}
