import { Home, Settings, Users, Zap, type LucideIcon } from 'lucide-react';
import { InstagramDirectIcon } from '@/components/icons/InstagramDirectIcon';
import type { ComponentType, SVGProps } from 'react';

type NavIcon = LucideIcon | ComponentType<SVGProps<SVGSVGElement>>;

export type AppNavItem = {
  name: string;
  shortName: string;
  href: string;
  icon: NavIcon;
  match: (pathname: string) => boolean;
};

export const APP_NAV: AppNavItem[] = [
  {
    name: 'Dashboard',
    shortName: 'Início',
    href: '/dashboard',
    icon: Home,
    match: (pathname) => pathname === '/dashboard' || pathname.startsWith('/dashboard/'),
  },
  {
    name: 'Contatos',
    shortName: 'Contatos',
    href: '/contacts',
    icon: Users,
    match: (pathname) => pathname.startsWith('/contacts'),
  },
  {
    name: 'Automações',
    shortName: 'Autos',
    href: '/automations',
    icon: Zap,
    match: (pathname) => pathname.startsWith('/automations'),
  },
  {
    name: 'Inbox',
    shortName: 'Inbox',
    href: '/inbox',
    icon: InstagramDirectIcon,
    match: (pathname) => pathname.startsWith('/inbox'),
  },
  {
    name: 'Configurações',
    shortName: 'Ajustes',
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
