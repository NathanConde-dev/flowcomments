import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { AppShell } from './AppShell';

export async function AppShellServer({ children }: { children: React.ReactNode }) {
  const session = await readSession();

  if (!session.isLoggedIn) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      username: true,
      email: true,
    },
  });

  const igAccount = await prisma.instagramAccount.findFirst({
    where: { userId: session.userId, isActive: true },
    select: {
      igUsername: true,
      igUserId: true,
    },
  });

  return (
    <AppShell
      username={user?.username || session.username}
      email={user?.email || ''}
      igAccount={
        igAccount
          ? {
              username: igAccount.igUsername,
              userId: igAccount.igUserId,
            }
          : null
      }
    >
      {children}
    </AppShell>
  );
}

/** @deprecated use AppShellServer */
export async function Sidebar() {
  return null;
}
