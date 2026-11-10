'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Users,
  Zap,
  MessageSquare,
  Settings,
  Menu,
  X,
  LogOut,
  Instagram,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Início', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Contatos', href: '/contacts', icon: Users },
  { name: 'Automações', href: '/automations', icon: Zap },
  { name: 'Caixa de Entrada', href: '/inbox', icon: MessageSquare },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export default function AppLayout({ children }: LayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [connectedAccount, setConnectedAccount] = useState<{
    username: string;
    avatarUrl?: string;
  } | null>(null);

  useEffect(() => {
    // TODO: Fetch user info from session
    setUser({ username: 'nathanconde' });
    
    // TODO: Fetch connected Instagram account
    // setConnectedAccount({ username: 'flowcomments', avatarUrl: '...' });
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-neutral-200 bg-white transition-all duration-200 lg:relative lg:translate-x-0',
          collapsed ? 'w-20' : 'w-64',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b border-neutral-200 px-4">
          {!collapsed && (
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 rounded bg-neutral-900" />
              <span className="text-lg font-semibold text-neutral-900">Flowcomments</span>
            </div>
          )}
          {collapsed && <div className="mx-auto h-8 w-8 rounded bg-neutral-900" />}
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-neutral-900 text-white'
                    : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900',
                  collapsed && 'justify-center'
                )}
                title={collapsed ? item.name : undefined}
              >
                <Icon className={cn('h-5 w-5 flex-shrink-0', !collapsed && 'mr-3')} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer: Connected Account + User + Logout */}
        <div className="border-t border-neutral-200 p-4">
          {/* Connected Instagram Account */}
          {!collapsed && connectedAccount && (
            <div className="mb-3 flex items-center space-x-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2">
              <div className="relative">
                {connectedAccount.avatarUrl ? (
                  <img
                    src={connectedAccount.avatarUrl}
                    alt={connectedAccount.username}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-300">
                    <Instagram className="h-4 w-4 text-neutral-600" />
                  </div>
                )}
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white bg-green-500" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-neutral-900">
                  @{connectedAccount.username}
                </p>
                <p className="text-xs text-neutral-500">Conectado</p>
              </div>
            </div>
          )}

          {!collapsed && !connectedAccount && (
            <button className="mb-3 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">
              <Instagram className="mr-2 inline-block h-4 w-4" />
              Conectar Instagram
            </button>
          )}

          {/* Logged-in User */}
          {!collapsed && user && (
            <div className="mb-2 flex items-center space-x-2 px-2 py-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-300 text-xs font-medium text-neutral-700">
                {user.username[0].toUpperCase()}
              </div>
              <span className="truncate text-xs text-neutral-600">{user.username}</span>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={cn(
              'flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900',
              collapsed && 'justify-center'
            )}
            title={collapsed ? 'Sair' : undefined}
          >
            <LogOut className={cn('h-5 w-5', !collapsed && 'mr-3')} />
            {!collapsed && <span>Sair</span>}
          </button>

          {/* Collapse Toggle (Desktop Only) */}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="mt-2 hidden w-full items-center justify-center rounded-lg border border-neutral-200 py-1.5 text-neutral-600 hover:bg-neutral-50 lg:flex"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 lg:hidden">
          <button onClick={() => setMobileMenuOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded bg-neutral-900" />
            <span className="text-lg font-semibold">Flowcomments</span>
          </div>
          <div className="w-6" />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-neutral-200 bg-white px-6 py-3 text-center text-xs text-neutral-500">
          Powered by Flowcomments © 2026 Nathan Condé
        </footer>
      </div>
    </div>
  );
}
