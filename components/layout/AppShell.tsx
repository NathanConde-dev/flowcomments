'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Instagram,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { ConnectedBadge } from '@/components/ui/status-badge';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { APP_NAV, isImmersiveAppRoute } from './nav';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileTopBar } from './MobileTopBar';

interface AppShellProps {
  username: string;
  email: string;
  igAccount: {
    username: string;
    userId: string;
  } | null;
  children: React.ReactNode;
}

const STORAGE_KEY = 'fc-sidebar-collapsed';

export function AppShell({ username, email, igAccount, children }: AppShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const immersive = isImmersiveAppRoute(pathname);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === '1') setCollapsed(true);
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <aside
        className={`
          relative z-40 hidden h-full shrink-0 border-r border-border bg-white
          lg:flex lg:flex-col
          ${collapsed ? 'w-[72px]' : 'w-64'}
        `}
      >
        <div className="flex h-full flex-col">
          <div
            className={`flex h-16 items-center border-b border-border ${
              collapsed ? 'justify-center px-2' : 'justify-between px-4'
            }`}
          >
            {!collapsed && (
              <BrandLogo
                href="/dashboard"
                className="truncate text-[24px] leading-none text-foreground"
              />
            )}
            <button
              type="button"
              onClick={toggleCollapsed}
              title={collapsed ? 'Expandir menu' : 'Recolher menu'}
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>

          <nav className={`flex-1 space-y-1 py-4 ${collapsed ? 'px-2' : 'px-3'}`}>
            {APP_NAV.map((item) => {
              const isActive = item.match(pathname || '');
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  title={item.name}
                  className={`
                    flex cursor-pointer items-center rounded-xl text-sm font-medium
                    transition-[background-color,color,transform,box-shadow,gap,padding] duration-200 ease-out
                    ${collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'}
                    ${
                      isActive
                        ? 'bg-black text-white shadow-sm'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }
                  `}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span
                    className={`overflow-hidden whitespace-nowrap transition-all duration-200 ${
                      collapsed ? 'max-w-0 opacity-0' : 'max-w-[140px] opacity-100'
                    }`}
                  >
                    {item.name}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div
            className={`space-y-2 border-t border-border ${collapsed ? 'px-2 py-3' : 'px-3 py-3'}`}
          >
            {igAccount ? (
              <Link
                href="/settings/instagram"
                className={`flex cursor-pointer items-center rounded-xl transition-colors hover:bg-muted ${
                  collapsed ? 'justify-center p-2' : 'gap-2.5 px-2.5 py-2'
                }`}
                title={`@${igAccount.username}`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-semibold text-white">
                  {igAccount.username[0].toUpperCase()}
                </div>
                {!collapsed && (
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-semibold text-foreground">
                      @{igAccount.username}
                    </p>
                    <ConnectedBadge />
                  </div>
                )}
              </Link>
            ) : (
              <Link
                href="/settings/instagram"
                title="Conectar Instagram"
                className={`flex cursor-pointer items-center rounded-xl border border-dashed border-zinc-300 bg-zinc-100 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-700 ${
                  collapsed ? 'justify-center p-2.5' : 'gap-2 px-2.5 py-2'
                }`}
              >
                <Instagram className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <span className="text-xs font-semibold">Conectar Instagram</span>
                )}
              </Link>
            )}

            <div
              className={`flex items-center rounded-xl ${
                collapsed ? 'justify-center p-1' : 'gap-2.5 px-2.5 py-2'
              }`}
              title={username}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-sm font-bold text-zinc-700">
                {(username || 'U')[0].toUpperCase()}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight text-foreground">
                    {username}
                  </p>
                  {email && (
                    <p className="mt-0.5 truncate text-[11px] leading-tight text-muted-foreground">
                      {email}
                    </p>
                  )}
                </div>
              )}
            </div>

            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                title="Sair"
                className={`flex w-full cursor-pointer items-center rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${
                  collapsed ? 'justify-center p-2.5' : 'gap-2 px-2.5 py-2'
                }`}
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {!collapsed && <span>Sair</span>}
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <MobileTopBar username={username} />
        <main
          className={`min-h-0 flex-1 overflow-auto bg-background ${
            immersive ? '' : 'fc-app-main'
          }`}
        >
          {children}
        </main>
        <MobileBottomNav />
      </div>
    </div>
  );
}
