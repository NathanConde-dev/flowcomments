'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquare, Users, Zap, Settings, Menu, X, Instagram } from 'lucide-react';
import { useState } from 'react';

interface SidebarClientProps {
  username: string;
  igAccount: {
    username: string;
    userId: string;
  } | null;
}

export function SidebarClient({ username, igAccount }: SidebarClientProps) {
  return <SidebarInner username={username} igAccount={igAccount} />;
}

function SidebarInner({ username, igAccount }: SidebarClientProps) {

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Contatos', href: '/contacts', icon: Users },
  { name: 'Automações', href: '/automations', icon: Zap },
  { name: 'Inbox', href: '/inbox', icon: MessageSquare },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

function SidebarInner({ username, igAccount }: SidebarClientProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        type="button"
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white border border-zinc-200 shadow-sm"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? (
          <X className="h-6 w-6 text-zinc-900" />
        ) : (
          <Menu className="h-6 w-6 text-zinc-900" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-zinc-200
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0 lg:static
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 h-16 px-6 border-b border-zinc-200">
            <div className="w-8 h-8 rounded bg-zinc-900"></div>
            <span className="text-xl font-bold text-zinc-900">Flowcomments</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium
                    transition-colors
                    ${
                      isActive
                        ? 'bg-zinc-100 text-zinc-900'
                        : 'text-white bg-zinc-900 hover:bg-zinc-800zinc-50 hover:text-zinc-900'
                    }
                  `}
                >
                  <Icon className="h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="px-4 py-4 border-t border-zinc-200 space-y-3">
            {/* Connected IG Account */}
            {igAccount ? (
              <Link 
                href="/settings/instagram"
                className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-zinc-50 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-white text-sm font-medium">
                  {igAccount.username[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">@{igAccount.username}</p>
                  <p className="text-xs text-zinc-500">Conectado</p>
                </div>
              </Link>
            ) : (
              <Link
                href="/settings/instagram"
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
              >
                <Instagram className="h-4 w-4" />
                Conectar Instagram
              </Link>
            )}

            {/* User info */}
            <div className="px-3 py-2 text-xs text-zinc-500">
              {username}
            </div>

            {/* Logout */}
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full px-3 py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900 text-left rounded-md hover:bg-zinc-50 transition-colors"
              >
                Sair
              </button>
            </form>
            
            <p className="px-3 text-xs text-zinc-400">
              Powered by Flowcomments © 2026
            </p>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
