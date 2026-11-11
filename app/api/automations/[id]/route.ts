import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

type RouteContext = { params: Promise<{ id: string }> };

async function getOwnedAutomation(userId: string, id: string) {
  return prisma.automation.findFirst({
    where: { id, userId },
    include: {
      igAccount: {
        select: {
          id: true,
          igUsername: true,
        },
      },
    },
  });
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;

    const automation = await getOwnedAutomation(session.userId, id);

    if (!automation) {
      return NextResponse.json({ error: 'Automação não encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      automation: {
        ...automation,
        triggerConfig: JSON.parse(automation.triggerConfig),
        actionsConfig: JSON.parse(automation.actionsConfig),
      },
    });
  } catch (error) {
    console.error('Error fetching automation:', error);
    return NextResponse.json({ error: 'Erro ao buscar automação' }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;
    const body = await request.json();
    const { name, igAccountId, triggerConfig, actionsConfig, isActive, triggerType } = body;

    if (!name || !igAccountId || !triggerConfig || !actionsConfig) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const existing = await getOwnedAutomation(session.userId, id);
    if (!existing) {
      return NextResponse.json({ error: 'Automação não encontrada' }, { status: 404 });
    }

    const igAccount = await prisma.instagramAccount.findFirst({
      where: {
        id: igAccountId,
        userId: session.userId,
      },
    });

    if (!igAccount) {
      return NextResponse.json({ error: 'Conta do Instagram não encontrada' }, { status: 404 });
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
        : existing.triggerType || 'comment';

    const automation = await prisma.automation.update({
      where: { id },
      data: {
        name,
        igAccountId,
        triggerType: resolvedTriggerType,
        triggerConfig: JSON.stringify(triggerConfig),
        actionsConfig: JSON.stringify(actionsConfig),
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
    });

    return NextResponse.json({ automation });
  } catch (error) {
    console.error('Error updating automation:', error);
    return NextResponse.json({ error: 'Erro ao atualizar automação' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;
    const body = await request.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive é obrigatório' }, { status: 400 });
    }

    const existing = await getOwnedAutomation(session.userId, id);
    if (!existing) {
      return NextResponse.json({ error: 'Automação não encontrada' }, { status: 404 });
    }

    const automation = await prisma.automation.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json({ automation });
  } catch (error) {
    console.error('Error patching automation:', error);
    return NextResponse.json({ error: 'Erro ao atualizar automação' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;

    const existing = await getOwnedAutomation(session.userId, id);
    if (!existing) {
      return NextResponse.json({ error: 'Automação não encontrada' }, { status: 404 });
    }

    await prisma.automation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting automation:', error);
    return NextResponse.json({ error: 'Erro ao excluir automação' }, { status: 500 });
  }
}
