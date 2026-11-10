'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Settings } from 'lucide-react';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { isImmersiveAppRoute } from './nav';

interface MobileTopBarProps {
  username: string;
}

export function MobileTopBar({ username }: MobileTopBarProps) {
  const pathname = usePathname();

  if (isImmersiveAppRoute(pathname)) return null;

  const initial = (username || 'U')[0]?.toUpperCase() || 'U';
  const settingsActive = (pathname || '').startsWith('/settings');

  return (
    <header
      className="sticky top-0 z-30 border-b border-border/80 bg-white/95 backdrop-blur-xl lg:hidden"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex h-14 items-center justify-between gap-3 px-4">
        <BrandLogo href="/dashboard" className="text-[22px] leading-none" />
        <Link
          href="/settings/instagram"
          title={`Configurações · ${username}`}
          aria-label="Abrir configurações"
          aria-current={settingsActive ? 'page' : undefined}
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold text-zinc-700"
        >
          {initial}
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-white bg-zinc-900 text-white shadow-sm">
            <Settings className="h-2.5 w-2.5" strokeWidth={2.5} aria-hidden />
          </span>
        </Link>
      </div>
    </header>
  );
}
