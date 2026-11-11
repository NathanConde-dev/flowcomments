'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpCircle, Settings } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { UpdateBadge } from '@/components/settings/UpdateBadge';
import { isImmersiveAppRoute } from './nav';

interface MobileTopBarProps {
  username: string;
}

export function MobileTopBar({ username }: MobileTopBarProps) {
  const pathname = usePathname();

  if (isImmersiveAppRoute(pathname)) return null;

  const initial = (username || 'U')[0]?.toUpperCase() || 'U';
  const settingsActive = (pathname || '').startsWith('/settings');
  const whatsNewActive = (pathname || '').startsWith('/whats-new');

  return (
    <header
      className="sticky top-0 z-30 border-b border-border/80 bg-white/95 backdrop-blur-xl lg:hidden"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <BrandLogo href="/dashboard" className="text-[22px] leading-none" />
        <div className="flex items-center gap-2">
          <Link
            href="/whats-new"
            aria-label="What's new"
            aria-current={whatsNewActive ? 'page' : undefined}
            className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full ${
              whatsNewActive ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700'
            }`}
          >
            <ArrowUpCircle className="h-4 w-4" />
            <span className="absolute -right-1 -top-1">
              <UpdateBadge />
            </span>
          </Link>
          <Link
            href="/settings/instagram"
            title={`Settings · ${username}`}
            aria-label="Open settings"
            aria-current={settingsActive ? 'page' : undefined}
            className="relative flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold text-zinc-700"
          >
            {initial}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-zinc-900 text-white shadow-sm">
              <Settings className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
