import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { SidebarClient } from './sidebar-client';

export async function Sidebar() {
  const session = await readSession();
  
  if (!session.isLoggedIn) {
    return null;
  }

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
      username={session.username}
      igAccount={igAccount ? {
        username: igAccount.igUsername,
        userId: igAccount.igUserId,
      } : null}
    />
  );
}
