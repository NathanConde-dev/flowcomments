import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { parseCustomData, parseTags } from '@/lib/inbox/serialize';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const contact = await prisma.contact.findFirst({
      where: { id, userId: session.userId },
    });
    if (!contact) {
      return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 });
    }

    const body = (await request.json()) as {
      tags?: string[];
      automationPaused?: boolean;
      addTag?: string;
      removeTag?: string;
    };

    let tags = parseTags(contact.tags);
    if (Array.isArray(body.tags)) {
      tags = body.tags.map((t) => String(t).trim()).filter(Boolean);
    }
    if (body.addTag?.trim()) {
      const tag = body.addTag.trim();
      if (!tags.includes(tag)) tags.push(tag);
    }
    if (body.removeTag?.trim()) {
      tags = tags.filter((t) => t !== body.removeTag!.trim());
    }

    const updated = await prisma.contact.update({
      where: { id: contact.id },
      data: {
        tags: JSON.stringify(tags),
        ...(typeof body.automationPaused === 'boolean'
          ? { automationPaused: body.automationPaused }
          : {}),
      },
    });

    return NextResponse.json({
      contact: {
        id: updated.id,
        tags: parseTags(updated.tags),
        customData: parseCustomData(updated.customData),
        automationPaused: updated.automationPaused,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro' },
      { status: 500 }
    );
  }
}
