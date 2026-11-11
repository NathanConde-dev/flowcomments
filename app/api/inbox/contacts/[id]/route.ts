import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { appendInboxSystemEvent } from '@/lib/inbox/events';
import { parseCustomData, parseTags } from '@/lib/inbox/serialize';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const contact = await prisma.contact.findFirst({
      where: { id, userId: session.userId },
      include: {
        igAccount: { select: { igUserId: true } },
      },
    });
    if (!contact) {
      return NextResponse.json({ error: 'Contato não encontrado' }, { status: 404 });
    }

    const body = (await request.json()) as {
      tags?: string[];
      automationPaused?: boolean;
      addTag?: string;
      removeTag?: string;
      conversationId?: string;
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

    if (
      typeof body.automationPaused === 'boolean' &&
      body.automationPaused !== contact.automationPaused
    ) {
      let conversationId = body.conversationId || null;
      if (!conversationId) {
        const latest = await prisma.conversation.findFirst({
          where: { contactId: contact.id, userId: session.userId },
          orderBy: { lastMessageAt: 'desc' },
          select: { id: true },
        });
        conversationId = latest?.id || null;
      }
      if (conversationId) {
        await appendInboxSystemEvent({
          conversationId,
          businessIgUserId: contact.igAccount.igUserId || 'page',
          contactIgUserId: contact.igUserId,
          kind: body.automationPaused ? 'automation_paused' : 'automation_resumed',
        });
      }
    }

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
