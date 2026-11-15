import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import {
  FOLLOW_CHECK_DOCS_URL,
  FOLLOW_CHECK_SETUP_ERROR,
  checkAccountFollowReady,
} from '@/lib/instagram/follow-ready';

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const accountId = new URL(request.url).searchParams.get('accountId');
    if (!accountId) {
      return NextResponse.json({ error: 'accountId é obrigatório' }, { status: 400 });
    }

    const account = await prisma.instagramAccount.findFirst({
      where: { id: accountId, userId: session.userId, isActive: true },
      select: {
        id: true,
        igUserId: true,
        igUsername: true,
        facebookPageId: true,
        accessToken: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    const status = await checkAccountFollowReady(account);
    if (status.pageId && status.pageId !== account.facebookPageId) {
      await prisma.instagramAccount.update({
        where: { id: account.id },
        data: { facebookPageId: status.pageId },
      });
    }

    return NextResponse.json({
      accountId: account.id,
      igUsername: account.igUsername,
      ready: status.ready,
      pageId: status.pageId,
      pageTokenResolved: status.pageTokenResolved,
      message: status.ready ? null : FOLLOW_CHECK_SETUP_ERROR,
      docsUrl: FOLLOW_CHECK_DOCS_URL,
    });
  } catch (error) {
    console.error('follow-ready failed', error);
    return NextResponse.json({ error: 'Falha ao verificar follow' }, { status: 500 });
  }
}
