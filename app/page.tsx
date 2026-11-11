import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db/client';
import { readSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * Self-host entrypoint: platform only (no marketing landing).
 * Marketing lives on Flowcomments Cloud (private repo).
 */
async function checkSetupStatus() {
  try {
    const adminCount = await prisma.user.count({ where: { isAdmin: true } });
    return { needsSetup: adminCount === 0 };
  } catch {
    return { needsSetup: true };
  }
}

export default async function HomePage() {
  const { needsSetup } = await checkSetupStatus();
  if (needsSetup) redirect('/setup');

  const session = await readSession();
  if (session.isLoggedIn) redirect('/dashboard');

  redirect('/login');
}
