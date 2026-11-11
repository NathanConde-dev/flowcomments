import { readSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { decrypt } from '@/lib/crypto/encryption';
import { createInstagramClient } from '@/lib/instagram/client';
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

  const igAccounts = await prisma.instagramAccount.findMany({
    where: { userId: session.userId, isActive: true },
    select: {
      id: true,
      igUsername: true,
      igUserId: true,
      profilePictureUrl: true,
      accessToken: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const enriched = await Promise.all(
    igAccounts.map(async (account) => {
      if (account.profilePictureUrl) {
        return {
          id: account.id,
          username: account.igUsername,
          userId: account.igUserId,
          profilePictureUrl: account.profilePictureUrl,
        };
      }

      try {
        const client = createInstagramClient(
          decrypt(account.accessToken),
          account.igUserId
        );
        const profile = await client.getProfile(account.igUserId);
        if (profile.profile_picture_url) {
          await prisma.instagramAccount.update({
            where: { id: account.id },
            data: { profilePictureUrl: profile.profile_picture_url },
          });
          return {
            id: account.id,
            username: account.igUsername,
            userId: account.igUserId,
            profilePictureUrl: profile.profile_picture_url,
          };
        }
      } catch (err) {
        console.warn('Failed to load IG profile picture for sidebar:', err);
      }

      return {
        id: account.id,
        username: account.igUsername,
        userId: account.igUserId,
        profilePictureUrl: null,
      };
    })
  );

  return (
    <AppShell
      username={user?.username || session.username}
      email={user?.email || ''}
      igAccounts={enriched}
    >
      {children}
    </AppShell>
  );
}

/** @deprecated use AppShellServer */
export async function Sidebar() {
  return null;
}
