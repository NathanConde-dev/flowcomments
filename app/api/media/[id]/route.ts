import { NextResponse } from 'next/server';
import { readMediaBuffer, readMediaMeta } from '@/lib/media/storage';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { id } = await params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const meta = await readMediaMeta(id);
  if (!meta) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const buffer = await readMediaBuffer(meta);
  if (!buffer) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': meta.mimeType,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Disposition': `inline; filename="${meta.filename.replace(/"/g, '')}"`,
    },
  });
}
