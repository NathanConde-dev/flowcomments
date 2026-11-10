import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth/session';
import { SessionKeepalive } from '@/components/providers/session-keepalive';
import { Sidebar } from '@/components/layout/sidebar';

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
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <SessionKeepalive />
        {children}
      </main>
    </div>
  );
}
