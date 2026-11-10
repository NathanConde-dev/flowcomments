'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const settingsTabs = [
  { name: 'Geral', href: '/settings' },
  { name: 'Instagram', href: '/settings/instagram' },
  { name: 'Meta App', href: '/settings/meta' },
  { name: 'MCP / IA', href: '/settings/mcp' },
  { name: 'Conta', href: '/settings/account' },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="h-full">
      <div className="border-b border-zinc-200 bg-white">
        <div className="px-8 pt-8 pb-0">
          <h1 className="text-2xl font-bold text-zinc-900 mb-4">Configurações</h1>
          <nav className="flex gap-6 -mb-px">
            {settingsTabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`border-b-2 px-1 pb-4 text-sm font-medium transition-colors ${
                    isActive
                      ? 'border-zinc-900 text-zinc-900'
                      : 'border-transparent text-zinc-600 hover:text-zinc-900 hover:border-zinc-300'
                  }`}
                >
                  {tab.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
      <div className="p-8">
        {children}
      </div>
    </div>
  );
}
