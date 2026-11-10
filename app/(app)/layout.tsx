import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth/session';
import { SessionKeepalive } from '@/components/providers/session-keepalive';
import { AppShellServer } from '@/components/layout/sidebar-server';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await readSession();

  if (!session.isLoggedIn) {
    redirect('/login');
  }

  return (
    <AppShellServer>
      <SessionKeepalive />
      {children}
    </AppShellServer>
  );
}
