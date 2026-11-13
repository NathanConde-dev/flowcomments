import { NextRequest, NextResponse } from 'next/server';
import { AuthError, requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

function startOfDayUtc(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addDaysUtc(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseDateParam(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = request.nextUrl;
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'accountId é obrigatório' }, { status: 400 });
    }

    const account = await prisma.instagramAccount.findFirst({
      where: {
        id: accountId,
        userId: session.userId,
        isActive: true,
      },
      select: {
        id: true,
        igUsername: true,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 });
    }

    const now = new Date();
    const defaultTo = startOfDayUtc(now);
    const defaultFrom = addDaysUtc(defaultTo, -14);

    const from = startOfDayUtc(parseDateParam(searchParams.get('from'), defaultFrom));
    const to = startOfDayUtc(parseDateParam(searchParams.get('to'), defaultTo));

    if (from > to) {
      return NextResponse.json({ error: 'Intervalo de datas inválido' }, { status: 400 });
    }

    const rangeEndExclusive = addDaysUtc(to, 1);

    const { automationSourcedContactFilter } = await import('@/lib/contacts/filters');
    const sourced = automationSourcedContactFilter();

    const [total, active, contacts] = await Promise.all([
      prisma.contact.count({
        where: { userId: session.userId, igAccountId: account.id, AND: [sourced] },
      }),
      prisma.contact.count({
        where: {
          userId: session.userId,
          igAccountId: account.id,
          AND: [sourced],
          lastSeenAt: {
            gte: from,
            lt: rangeEndExclusive,
          },
        },
      }),
      prisma.contact.findMany({
        where: {
          userId: session.userId,
          igAccountId: account.id,
          AND: [sourced],
          createdAt: { lt: rangeEndExclusive },
        },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const baseline = contacts.filter((contact) => contact.createdAt < from).length;
    const createdByDay = new Map<string, number>();
    for (const contact of contacts) {
      if (contact.createdAt < from) continue;
      const key = toDateKey(startOfDayUtc(contact.createdAt));
      createdByDay.set(key, (createdByDay.get(key) || 0) + 1);
    }

    const series: Array<{ date: string; value: number }> = [];
    let running = baseline;
    for (
      let cursor = new Date(from);
      cursor <= to;
      cursor = addDaysUtc(cursor, 1)
    ) {
      const key = toDateKey(cursor);
      running += createdByDay.get(key) || 0;
      series.push({ date: key, value: running });
    }

    return NextResponse.json({
      account: {
        id: account.id,
        igUsername: account.igUsername,
      },
      from: toDateKey(from),
      to: toDateKey(to),
      summary: {
        active,
        inactive: Math.max(0, total - active),
        total,
      },
      series,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error fetching growth insights:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar insights de crescimento' },
      { status: 500 }
    );
  }
}
