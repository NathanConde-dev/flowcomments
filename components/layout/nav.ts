import { ArrowUpCircle, Home, Settings, Users, Zap, type LucideIcon } from 'lucide-react';
import { InstagramDirectIcon } from '@/components/icons/InstagramDirectIcon';
import type { ComponentType, SVGProps } from 'react';

type NavIcon = LucideIcon | ComponentType<SVGProps<SVGSVGElement>>;

export type AppNavItem = {
  /** i18n key under `nav.*` */
  labelKey: 'dashboard' | 'contacts' | 'automations' | 'inbox' | 'whatsNew' | 'settings';
  shortKey:
    | 'dashboardShort'
    | 'contactsShort'
    | 'automationsShort'
    | 'inboxShort'
    | 'whatsNewShort'
    | 'settingsShort';
  href: string;
  icon: NavIcon;
  badge?: 'updates';
  /** Hide from mobile bottom tabs when true */
  desktopOnly?: boolean;
  match: (pathname: string) => boolean;
};

export const APP_NAV: AppNavItem[] = [
  {
    labelKey: 'dashboard',
    shortKey: 'dashboardShort',
    href: '/dashboard',
    icon: Home,
    match: (pathname) => pathname === '/dashboard' || pathname.startsWith('/dashboard/'),
  },
  {
    labelKey: 'contacts',
    shortKey: 'contactsShort',
    href: '/contacts',
    icon: Users,
    match: (pathname) => pathname.startsWith('/contacts'),
  },
  {
    labelKey: 'automations',
    shortKey: 'automationsShort',
    href: '/automations',
    icon: Zap,
    match: (pathname) => pathname.startsWith('/automations'),
  },
  {
    labelKey: 'inbox',
    shortKey: 'inboxShort',
    href: '/inbox',
    icon: InstagramDirectIcon,
    match: (pathname) => pathname.startsWith('/inbox'),
  },
  {
    labelKey: 'whatsNew',
    shortKey: 'whatsNewShort',
    href: '/whats-new',
    icon: ArrowUpCircle,
    badge: 'updates',
    desktopOnly: true,
    match: (pathname) => pathname.startsWith('/whats-new') || pathname.startsWith('/settings/updates'),
  },
  {
    labelKey: 'settings',
    shortKey: 'settingsShort',
    href: '/settings/instagram',
    icon: Settings,
    match: (pathname) => pathname.startsWith('/settings'),
  },
];

/** Mobile bottom tabs — settings on top avatar; what's-new is desktop sidebar */
export const MOBILE_TAB_NAV = APP_NAV.filter(
  (item) => item.href !== '/settings/instagram' && !item.desktopOnly
);

/** Full-screen flows: hide mobile chrome (top/bottom bars) */
export function isImmersiveAppRoute(pathname: string | null) {
  if (!pathname) return false;
  return (
    pathname.startsWith('/automations/new') || pathname.startsWith('/settings/choose-account')
  );
}
