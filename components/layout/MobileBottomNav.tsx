'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MOBILE_TAB_NAV, isImmersiveAppRoute } from './nav';

export function MobileBottomNav() {
  const pathname = usePathname();

  if (isImmersiveAppRoute(pathname)) return null;

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-white/95 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <ul className="mx-auto grid h-[3.75rem] max-w-lg grid-cols-4">
        {MOBILE_TAB_NAV.map((item) => {
          const active = item.match(pathname || '');
          const Icon = item.icon;

          return (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex h-full flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-semibold tracking-tight transition-colors ${
                  active ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-2xl transition-colors ${
                    active ? 'bg-zinc-900 text-white' : 'bg-transparent'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <span className="truncate">{item.shortName}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
