import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import {
  actionsRequireFollowCheck,
  checkAccountFollowReady,
  followCheckBlockedResponse,
} from '@/lib/instagram/follow-ready';

export async function GET() {
  try {
    const session = await requireAuth();

    const automations = await prisma.automation.findMany({
      where: { userId: session.userId },
      include: {
        igAccount: {
          select: {
            igUsername: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ automations });
  } catch (error) {
    console.error('Error fetching automations:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar automações' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { name, igAccountId, triggerConfig, actionsConfig, triggerType } = body;

    if (!name || !igAccountId || !triggerConfig || !actionsConfig) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }

    const allowedTriggers = new Set([
      'comment',
      'dm_keyword',
      'default_reply',
      'story_reply',
      'story_mention',
      'live_comment',
    ]);
    const resolvedTriggerType =
      typeof triggerType === 'string' && allowedTriggers.has(triggerType)
        ? triggerType
        : 'comment';

    const igAccount = await prisma.instagramAccount.findFirst({
      where: {
        id: igAccountId,
        userId: session.userId,
      },
      select: {
        id: true,
        igUserId: true,
        facebookPageId: true,
        accessToken: true,
      },
    });

    if (!igAccount) {
      return NextResponse.json(
        { error: 'Conta do Instagram não encontrada' },
        { status: 404 }
      );
    }

    let isActive = true;
    let followWarning: ReturnType<typeof followCheckBlockedResponse> | null = null;
    if (actionsRequireFollowCheck(actionsConfig)) {
      const status = await checkAccountFollowReady(igAccount);
      if (!status.ready) {
        isActive = false;
        followWarning = followCheckBlockedResponse({
          hint: 'Automação salva pausada. Configure o Meta e ative depois.',
        });
      } else if (status.pageId && status.pageId !== igAccount.facebookPageId) {
        await prisma.instagramAccount.update({
          where: { id: igAccount.id },
          data: { facebookPageId: status.pageId },
        });
      }
    }

    const automation = await prisma.automation.create({
      data: {
        userId: session.userId,
        igAccountId,
        name,
        triggerType: resolvedTriggerType,
        triggerConfig: JSON.stringify(triggerConfig),
        actionsConfig: JSON.stringify(actionsConfig),
        isActive,
      },
    });

    return NextResponse.json({
      automation,
      ...(followWarning
        ? {
            warning: followWarning.error,
            code: followWarning.code,
            docsUrl: followWarning.docsUrl,
            hint: followWarning.hint,
          }
        : {}),
    });
  } catch (error) {
    console.error('Error creating automation:', error);
    return NextResponse.json(
      { error: 'Erro ao criar automação' },
      { status: 500 }
    );
  }
}
