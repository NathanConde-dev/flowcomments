import { redirect } from 'next/navigation';
import { readSession } from '@/lib/auth/session';

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionData = await readSession();
  
  if (!sessionData.isLoggedIn) {
    redirect('/login');
  }

  return <>{children}</>;
}
