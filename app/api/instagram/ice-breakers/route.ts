import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { decrypt } from '@/lib/crypto/encryption';
import { createInstagramClient } from '@/lib/instagram/client';
import { iceBreakersConfigKey, icePayload, type IceBreakerItem } from '@/lib/automation/types';

async function readStored(igAccountId: string): Promise<IceBreakerItem[]> {
  const row = await prisma.systemConfig.findUnique({
    where: { key: iceBreakersConfigKey(igAccountId) },
  });
  if (!row?.value) return [];
  try {
    const parsed = JSON.parse(row.value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const accountId = new URL(request.url).searchParams.get('accountId');
    if (!accountId) {
      return NextResponse.json({ error: 'accountId é obrigatório' }, { status: 400 });
    }

    const account = await prisma.instagramAccount.findFirst({
      where: { id: accountId, userId: session.userId },
    });
    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    const items = await readStored(accountId);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error loading ice breakers:', error);
    return NextResponse.json({ error: 'Erro ao carregar ice breakers' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const accountId = body.accountId as string;
    const items = (body.items || []) as IceBreakerItem[];

    if (!accountId) {
      return NextResponse.json({ error: 'accountId é obrigatório' }, { status: 400 });
    }

    const account = await prisma.instagramAccount.findFirst({
      where: { id: accountId, userId: session.userId },
    });
    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    const cleaned = items
      .filter((item) => item.question?.trim() && item.automationId?.trim())
      .slice(0, 4)
      .map((item) => ({
        question: item.question.trim().slice(0, 80),
        automationId: item.automationId.trim(),
      }));

    const client = createInstagramClient(decrypt(account.accessToken), account.igUserId);

    if (cleaned.length === 0) {
      await client.clearIceBreakers();
    } else {
      await client.setIceBreakers(
        cleaned.map((item) => ({
          question: item.question,
          payload: icePayload(item.automationId),
        }))
      );
    }

    await prisma.systemConfig.upsert({
      where: { key: iceBreakersConfigKey(accountId) },
      create: {
        key: iceBreakersConfigKey(accountId),
        value: JSON.stringify(cleaned),
        encrypted: false,
      },
      update: {
        value: JSON.stringify(cleaned),
        encrypted: false,
      },
    });

    return NextResponse.json({ items: cleaned });
  } catch (error) {
    console.error('Error saving ice breakers:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar ice breakers' },
      { status: 500 }
    );
  }
}
