'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils/cn';
import {
  LayoutDashboard,
  Zap,
  Users,
  MessageSquare,
  Settings,
  LogOut,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Automações', href: '/automations', icon: Zap },
  { name: 'Contatos', href: '/contacts', icon: Users },
  { name: 'Inbox', href: '/inbox', icon: MessageSquare },
  { name: 'Configurações', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  };

  return (
    <div className="flex h-screen w-64 flex-col bg-white border-r border-gray-200">
      <div className="flex h-16 items-center gap-2 border-b border-gray-200 px-6">
        <div className="h-8 w-8 rounded bg-primary-600"></div>
        <span className="text-lg font-bold text-gray-900">Flowcomments</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-200 p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          <LogOut className="h-5 w-5" />
          Sair
        </button>
        <div className="mt-4 px-3 text-xs text-gray-500">
          <a 
            href="https://flowcomments.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-primary-600"
          >
            Powered by Flowcomments
          </a>
          <br />
          © 2026 Nathan Condé
        </div>
      </div>
    </div>
  );
}
