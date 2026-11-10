import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

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
    const { name, igAccountId, triggerConfig, actionsConfig } = body;

    if (!name || !igAccountId || !triggerConfig || !actionsConfig) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }

    const igAccount = await prisma.instagramAccount.findFirst({
      where: {
        id: igAccountId,
        userId: session.userId,
      },
    });

    if (!igAccount) {
      return NextResponse.json(
        { error: 'Conta do Instagram não encontrada' },
        { status: 404 }
      );
    }

    const automation = await prisma.automation.create({
      data: {
        userId: session.userId,
        igAccountId,
        name,
        triggerType: 'comment',
        triggerConfig: JSON.stringify(triggerConfig),
        actionsConfig: JSON.stringify(actionsConfig),
        isActive: true,
      },
    });

    return NextResponse.json({ automation });
  } catch (error) {
    console.error('Error creating automation:', error);
    return NextResponse.json(
      { error: 'Erro ao criar automação' },
      { status: 500 }
    );
  }
}
