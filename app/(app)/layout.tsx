import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth/session';
import { SessionKeepalive } from '@/components/providers/session-keepalive';

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
    <>
      <SessionKeepalive />
      {children}
    </>
  );
}
