import { Home, Settings, Users, Zap, type LucideIcon } from 'lucide-react';
import { InstagramDirectIcon } from '@/components/icons/InstagramDirectIcon';
import type { ComponentType, SVGProps } from 'react';

type NavIcon = LucideIcon | ComponentType<SVGProps<SVGSVGElement>>;

export type AppNavItem = {
  /** i18n key under `nav.*` */
  labelKey: 'dashboard' | 'contacts' | 'automations' | 'inbox' | 'settings';
  shortKey: 'dashboardShort' | 'contactsShort' | 'automationsShort' | 'inboxShort' | 'settingsShort';
  href: string;
  icon: NavIcon;
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
    labelKey: 'settings',
    shortKey: 'settingsShort',
    href: '/settings/instagram',
    icon: Settings,
    match: (pathname) => pathname.startsWith('/settings'),
  },
];

/** Mobile bottom tabs — settings lives on the top avatar instead */
export const MOBILE_TAB_NAV = APP_NAV.filter((item) => item.href !== '/settings/instagram');

/** Full-screen flows: hide mobile chrome (top/bottom bars) */
export function isImmersiveAppRoute(pathname: string | null) {
  if (!pathname) return false;
  return (
    pathname.startsWith('/automations/new') || pathname.startsWith('/settings/choose-account')
  );
}
