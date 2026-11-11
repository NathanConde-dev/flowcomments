import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { decrypt } from '@/lib/crypto/encryption';
import { createInstagramClient } from '@/lib/instagram/client';
import { serializeMessage } from '@/lib/inbox/serialize';

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: session.userId },
      include: {
        contact: true,
        igAccount: true,
      },
    });
    if (!conversation) {
      return NextResponse.json({ error: 'Conversa não encontrada' }, { status: 404 });
    }
    if (!conversation.igAccount.igUserId || !conversation.igAccount.accessToken) {
      return NextResponse.json({ error: 'Conta Instagram sem token' }, { status: 400 });
    }

    const contentType = request.headers.get('content-type') || '';
    let text = '';
    let mediaType: 'image' | 'audio' | 'video' | 'file' | null = null;
    let mediaBuffer: Buffer | null = null;
    let filename = 'upload.bin';
    let mimeType = 'application/octet-stream';

    if (contentType.includes('multipart/form-data')) {
      const form = await request.formData();
      text = String(form.get('text') || '').trim();
      const file = form.get('file');
      if (file && typeof file !== 'string') {
        const blob = file as File;
        const arrayBuffer = await blob.arrayBuffer();
        mediaBuffer = Buffer.from(arrayBuffer);
        filename = blob.name || filename;
        mimeType = blob.type || mimeType;
        if (mimeType.startsWith('image/')) mediaType = 'image';
        else if (mimeType.startsWith('audio/')) mediaType = 'audio';
        else if (mimeType.startsWith('video/')) mediaType = 'video';
        else mediaType = 'file';
      }
    } else {
      const body = (await request.json()) as { text?: string };
      text = String(body.text || '').trim();
    }

    if (!text && !mediaBuffer) {
      return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 });
    }

    const accessToken = decrypt(conversation.igAccount.accessToken);
    const client = createInstagramClient(accessToken, conversation.igAccount.igUserId);
    const recipientId = conversation.contact.igUserId;

    let igMessageId = `manual:${conversation.id}:${Date.now()}`;
    let messageType = 'text';
    let attachments: string | null = null;

    if (mediaBuffer && mediaType) {
      const uploaded = await client.uploadMessageAttachment({
        type: mediaType,
        buffer: mediaBuffer,
        filename,
        mimeType,
      });
      const sent = await client.sendMediaAttachment(recipientId, mediaType, uploaded.attachment_id);
      igMessageId = sent.id || igMessageId;
      messageType = mediaType;
      attachments = JSON.stringify({
        type: mediaType,
        attachmentId: uploaded.attachment_id,
        filename,
        mimeType,
      });
      if (text) {
        const textSent = await client.sendMessage(recipientId, text);
        // Keep caption as companion text message below
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            igMessageId: textSent.id || `manual-text:${conversation.id}:${Date.now()}`,
            fromIgUserId: conversation.igAccount.igUserId,
            toIgUserId: recipientId,
            messageType: 'text',
            text,
            isFromPage: true,
            isNote: false,
            sentAt: new Date(),
          },
        });
      }
    } else {
      const sent = await client.sendMessage(recipientId, text);
      igMessageId = sent.id || igMessageId;
      messageType = 'text';
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        igMessageId,
        fromIgUserId: conversation.igAccount.igUserId,
        toIgUserId: recipientId,
        messageType,
        text: mediaBuffer ? text || `[${mediaType}]` : text,
        attachments,
        isFromPage: true,
        isNote: false,
        sentAt: new Date(),
      },
    });

    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        status: 'open',
        unreadCount: 0,
      },
    });

    await prisma.dmLog.create({
      data: {
        userId: session.userId,
        igAccountId: conversation.igAccountId,
        contactId: conversation.contactId,
        status: 'sent',
        messageType: `inbox_${messageType}`,
        payload: JSON.stringify({ text, attachments }),
        sentAt: new Date(),
      },
    });

    return NextResponse.json({ message: serializeMessage(message) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao enviar' },
      { status: 500 }
    );
  }
}
