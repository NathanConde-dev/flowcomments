'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpCircle, Bell, Instagram, KeyRound, Sparkles, UserRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AnnouncementBadge } from '@/components/settings/AnnouncementBadge';
import { UpdateBadge } from '@/components/settings/UpdateBadge';

type SettingsTab = {
  key: 'instagram' | 'metaApp' | 'mcp' | 'announcements' | 'updates' | 'account';
  href: string;
  icon: LucideIcon;
  badge?: 'updates' | 'announcements';
};

const settingsTabs: SettingsTab[] = [
  { key: 'instagram', href: '/settings/instagram', icon: Instagram },
  { key: 'metaApp', href: '/settings/meta', icon: KeyRound },
  { key: 'mcp', href: '/settings/mcp', icon: Sparkles },
  { key: 'announcements', href: '/settings/announcements', icon: Bell, badge: 'announcements' },
  { key: 'updates', href: '/settings/updates', icon: ArrowUpCircle, badge: 'updates' },
  { key: 'account', href: '/settings/account', icon: UserRound },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const t = useTranslations('settings');

  return (
    <div className="h-full fc-fade-in">
      <div className="border-b border-border bg-card">
        <div className="px-4 pt-5 sm:px-6 md:px-8 md:pt-8">
          <h1 className="mb-4 text-2xl font-bold tracking-tight text-foreground">{t('title')}</h1>
          <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-px [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-6 sm:px-6 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
            {settingsTabs.map((tab) => {
              const isActive = pathname === tab.href;
              const Icon = tab.icon;

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-t-xl border-b-2 px-3 pb-3.5 pt-1 text-sm font-medium transition-all duration-200 cursor-pointer ${
                    isActive
                      ? 'border-foreground text-foreground'
                      : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 transition-transform duration-200 ${
                      isActive ? 'scale-105 text-foreground' : 'text-muted-foreground'
                    }`}
                  />
                  {t(tab.key)}
                  {tab.badge === 'updates' ? <UpdateBadge /> : null}
                  {tab.badge === 'announcements' ? <AnnouncementBadge /> : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <div className="p-4 fc-animate-in sm:p-6 md:p-8">{children}</div>
    </div>
  );
}
