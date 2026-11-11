'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronRight,
  Instagram,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ConnectedBadge } from '@/components/ui/status-badge';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { UpdateBadge } from '@/components/settings/UpdateBadge';
import { APP_NAV, isImmersiveAppRoute } from './nav';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileTopBar } from './MobileTopBar';

type IgAccountSummary = {
  username: string;
  userId: string;
  profilePictureUrl?: string | null;
};

interface AppShellProps {
  username: string;
  email: string;
  igAccounts: IgAccountSummary[];
  children: React.ReactNode;
}

const STORAGE_KEY = 'fc-sidebar-collapsed';

function IgAvatar({
  account,
  size = 'md',
  className = '',
}: {
  account: IgAccountSummary;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const dim = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  return (
    <div
      className={`rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] p-[2px] shadow-sm ${className}`}
    >
      <div className={`flex ${dim} items-center justify-center overflow-hidden rounded-full bg-white p-[1.5px]`}>
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-zinc-800 text-[11px] font-semibold text-white">
          {account.profilePictureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={account.profilePictureUrl}
              alt={`@${account.username}`}
              className="h-full w-full object-cover"
            />
          ) : (
            account.username[0].toUpperCase()
          )}
        </div>
      </div>
    </div>
  );
}

export function AppShell({ username, email, igAccounts, children }: AppShellProps) {
  const pathname = usePathname();
  const tNav = useTranslations('nav');
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
              const label = tNav(item.labelKey);

              return (
                <Link
                  key={item.labelKey}
                  href={item.href}
                  title={label}
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
                    {label}
                  </span>
                  {!collapsed && item.badge === 'updates' ? <UpdateBadge /> : null}
                </Link>
              );
            })}
          </nav>

          <div
            className={`space-y-2 border-t border-border ${collapsed ? 'px-2 py-3' : 'px-3 py-3'}`}
          >
            {igAccounts.length > 0 ? (
              <Link
                href="/settings/instagram"
                title={
                  igAccounts.length === 1
                    ? `@${igAccounts[0].username}`
                    : `${igAccounts.length} contas conectadas`
                }
                className={`group flex cursor-pointer items-center overflow-hidden rounded-xl border border-border/70 bg-white transition-colors duration-200 hover:bg-muted ${
                  collapsed ? 'justify-center p-1.5' : 'gap-2 px-2 py-1.5'
                }`}
              >
                {igAccounts.length === 1 ? (
                  <IgAvatar account={igAccounts[0]} size="sm" />
                ) : (
                  <div className="flex shrink-0 items-center">
                    {igAccounts.slice(0, 3).map((account, index) => (
                      <IgAvatar
                        key={account.userId}
                        account={account}
                        size="sm"
                        className={index === 0 ? '' : '-ml-2'}
                      />
                    ))}
                    {igAccounts.length > 3 && (
                      <span className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-zinc-900 text-[10px] font-bold text-white">
                        +{igAccounts.length - 3}
                      </span>
                    )}
                  </div>
                )}
                {!collapsed && (
                  <>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="truncate text-xs font-semibold tracking-tight text-foreground">
                        {igAccounts.length === 1
                          ? `@${igAccounts[0].username}`
                          : `${igAccounts.length} contas`}
                      </p>
                      <ConnectedBadge className="px-1.5 py-0 text-[10px] leading-4" />
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors duration-200 group-hover:text-foreground" />
                  </>
                )}
              </Link>
            ) : (
              <Link
                href="/settings/instagram"
                title="Conectar Instagram"
                className={`flex cursor-pointer items-center rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 text-zinc-500 transition-colors hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 ${
                  collapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3 py-2.5'
                }`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#f9ce34]/20 via-[#ee2a7b]/20 to-[#6228d7]/20">
                  <Instagram className="h-4 w-4" />
                </span>
                {!collapsed && (
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block text-xs font-semibold text-foreground">
                      Conectar Instagram
                    </span>
                    <span className="mt-0.5 block text-[11px] text-muted-foreground">
                      Vincular conta para automações
                    </span>
                  </span>
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
