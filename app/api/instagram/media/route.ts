import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { decrypt } from '@/lib/crypto/encryption';
import { createInstagramClient } from '@/lib/instagram/client';

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const limit = Math.min(Number(searchParams.get('limit') || 24), 50);

    if (!accountId) {
      return NextResponse.json({ error: 'accountId é obrigatório' }, { status: 400 });
    }

    const account = await prisma.instagramAccount.findFirst({
      where: {
        id: accountId,
        userId: session.userId,
        isActive: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    const accessToken = decrypt(account.accessToken);
    const client = createInstagramClient(accessToken, account.igUserId);
    const result = await client.getMedia(account.igUserId, limit);

    const posts = (result.data || []).map((post) => ({
      id: post.id,
      caption: post.caption || '',
      mediaType: post.media_type,
      mediaUrl: post.media_url || post.thumbnail_url || null,
      thumbnailUrl: post.thumbnail_url || post.media_url || null,
      permalink: post.permalink,
      timestamp: post.timestamp,
      isReel: post.media_type === 'VIDEO' || post.media_type === 'REELS',
    }));

    return NextResponse.json({ posts });
  } catch (error) {
    console.error('Error fetching Instagram media:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar publicações' },
      { status: 500 }
    );
  }
}
