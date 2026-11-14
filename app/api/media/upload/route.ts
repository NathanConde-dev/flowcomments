import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/session';
import { prisma } from '@/lib/db/client';
import { decrypt } from '@/lib/crypto/encryption';
import { createInstagramClient } from '@/lib/instagram/client';
import {
  mediaKindFromMime,
  publicMediaUrl,
  saveMediaFile,
} from '@/lib/media/storage';

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const form = await request.formData();
    const file = form.get('file');
    const accountId = String(form.get('accountId') || '').trim();

    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Arquivo obrigatório' }, { status: 400 });
    }
    if (!accountId) {
      return NextResponse.json({ error: 'accountId obrigatório' }, { status: 400 });
    }

    const account = await prisma.instagramAccount.findFirst({
      where: { id: accountId, userId: session.userId },
      select: { id: true, accessToken: true, igUserId: true },
    });
    if (!account?.accessToken || !account.igUserId) {
      return NextResponse.json({ error: 'Conta Instagram inválida' }, { status: 404 });
    }

    const blob = file as File;
    const mimeType = blob.type || 'application/octet-stream';
    const kind = mediaKindFromMime(mimeType);
    if (kind !== 'image' && kind !== 'audio') {
      return NextResponse.json(
        { error: 'Envie apenas imagem ou áudio' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await blob.arrayBuffer());
    const max = kind === 'image' ? MAX_IMAGE_BYTES : MAX_AUDIO_BYTES;
    if (buffer.length > max) {
      return NextResponse.json(
        {
          error:
            kind === 'image'
              ? 'Imagem deve ter no máximo 8 MB'
              : 'Áudio deve ter no máximo 25 MB',
        },
        { status: 400 }
      );
    }

    const meta = await saveMediaFile({
      userId: session.userId,
      buffer,
      filename: blob.name || `${kind}-${Date.now()}`,
      mimeType,
    });

    const origin = new URL(request.url).origin;
    const url = publicMediaUrl(meta.id, origin);

    let attachmentId: string | null = null;
    try {
      const client = createInstagramClient(decrypt(account.accessToken), account.igUserId);
      const uploaded = await client.uploadMessageAttachment({
        type: kind,
        buffer,
        filename: meta.filename,
        mimeType: meta.mimeType,
      });
      attachmentId = uploaded.attachment_id;
    } catch (error) {
      console.warn('[media/upload] Meta attachment failed; keeping URL only', error);
    }

    return NextResponse.json({
      id: meta.id,
      url,
      attachmentId,
      type: kind,
      mimeType: meta.mimeType,
      filename: meta.filename,
      size: meta.size,
    });
  } catch (error) {
    console.error('media upload error', error);
    return NextResponse.json({ error: 'Falha no upload' }, { status: 500 });
  }
}
