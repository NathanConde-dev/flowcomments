import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { decrypt } from '@/lib/crypto/encryption';
import { createInstagramClient } from '@/lib/instagram/client';

export async function GET() {
  try {
    const session = await requireAuth();

    const accounts = await prisma.instagramAccount.findMany({
      where: {
        userId: session.userId,
        isActive: true,
      },
      select: {
        id: true,
        igUsername: true,
        igUserId: true,
        profilePictureUrl: true,
        accessToken: true,
        isActive: true,
        tokenExpiresAt: true,
        lastSyncAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = await Promise.all(
      accounts.map(async (account) => {
        let profilePictureUrl = account.profilePictureUrl;

        if (!profilePictureUrl) {
          try {
            const client = createInstagramClient(decrypt(account.accessToken));
            const profile = await client.getProfile(account.igUserId);
            profilePictureUrl = profile.profile_picture_url || null;
            if (profilePictureUrl) {
              await prisma.instagramAccount.update({
                where: { id: account.id },
                data: { profilePictureUrl },
              });
            }
          } catch (err) {
            console.warn('Failed to refresh IG profile picture:', err);
          }
        }

        return {
          id: account.id,
          igUsername: account.igUsername,
          igUserId: account.igUserId,
          profilePictureUrl,
          isActive: account.isActive,
          tokenExpiresAt: account.tokenExpiresAt,
          lastSyncAt: account.lastSyncAt,
          createdAt: account.createdAt,
        };
      })
    );

    return NextResponse.json({ accounts: enriched });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar contas' },
      { status: 500 }
    );
  }
}
