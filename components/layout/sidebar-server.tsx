import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { SidebarClient } from './sidebar-client';

export async function Sidebar() {
  const session = await readSession();
  
  if (!session.isLoggedIn) {
    return null;
  }

  // Get user details
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      username: true,
      email: true,
    },
  });

  // Get connected IG account
  const igAccount = await prisma.instagramAccount.findFirst({
    where: { userId: session.userId, isActive: true },
    select: {
      igUsername: true,
      igUserId: true,
    },
  });

  return (
    <SidebarClient
      username={user?.username || session.username}
      email={user?.email || ''}
      igAccount={igAccount ? {
        username: igAccount.igUsername,
        userId: igAccount.igUserId,
      } : null}
    />
  );
}
