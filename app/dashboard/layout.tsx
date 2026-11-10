import { requireAuth } from '@/lib/auth/session';
import { Sidebar } from '@/components/layout/sidebar';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAuth();
  } catch {
    redirect('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
