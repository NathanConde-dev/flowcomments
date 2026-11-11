import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import {
  DEFAULT_ACCOUNT_TIMEZONE,
  isAccountTimezone,
} from '@/lib/settings/timezones';

type UserGeneralRow = { timezone: string | null; username: string };

export async function GET() {
  try {
    const session = await requireAuth();
    const rows = await prisma.$queryRaw<UserGeneralRow[]>`
      SELECT "timezone", "username"
      FROM "User"
      WHERE "id" = ${session.userId}
      LIMIT 1
    `;
    const user = rows[0];
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      timezone: user.timezone || DEFAULT_ACCOUNT_TIMEZONE,
      username: user.username,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await requireAuth();
    const body = (await request.json()) as { timezone?: string };

    if (!body.timezone || !isAccountTimezone(body.timezone)) {
      return NextResponse.json({ error: 'Fuso horário inválido' }, { status: 400 });
    }

    await prisma.$executeRaw`
      UPDATE "User"
      SET "timezone" = ${body.timezone}, "updatedAt" = NOW()
      WHERE "id" = ${session.userId}
    `;

    return NextResponse.json({ timezone: body.timezone });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro' },
      { status: 500 }
    );
  }
}
