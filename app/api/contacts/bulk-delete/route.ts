import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';

const bodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(200),
});

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Lista de contatos inválida' }, { status: 400 });
    }

    const ids = [...new Set(parsed.data.ids)];
    const result = await prisma.contact.deleteMany({
      where: {
        userId: session.userId,
        id: { in: ids },
      },
    });

    return NextResponse.json({ ok: true, deleted: result.count });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao remover contatos' },
      { status: 500 }
    );
  }
}
