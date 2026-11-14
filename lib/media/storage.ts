import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'node:crypto';

export type StoredMediaMeta = {
  id: string;
  userId: string;
  filename: string;
  mimeType: string;
  ext: string;
  size: number;
  createdAt: string;
};

const UPLOAD_ROOT = path.join(process.cwd(), 'data', 'uploads');

function extFromNameOrMime(filename: string, mimeType: string): string {
  const fromName = path.extname(filename || '').toLowerCase();
  if (fromName && fromName.length <= 8) return fromName;
  if (mimeType.startsWith('image/jpeg')) return '.jpg';
  if (mimeType.startsWith('image/png')) return '.png';
  if (mimeType.startsWith('image/webp')) return '.webp';
  if (mimeType.startsWith('image/gif')) return '.gif';
  if (mimeType.startsWith('audio/mpeg') || mimeType === 'audio/mp3') return '.mp3';
  if (mimeType.startsWith('audio/mp4') || mimeType === 'audio/m4a') return '.m4a';
  if (mimeType.startsWith('audio/wav')) return '.wav';
  if (mimeType.startsWith('audio/ogg')) return '.ogg';
  if (mimeType.startsWith('audio/webm')) return '.webm';
  return '.bin';
}

export function mediaKindFromMime(
  mimeType: string
): 'image' | 'audio' | 'video' | 'file' {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.startsWith('video/')) return 'video';
  return 'file';
}

export async function saveMediaFile(params: {
  userId: string;
  buffer: Buffer;
  filename: string;
  mimeType: string;
}): Promise<StoredMediaMeta> {
  const id = randomUUID();
  const ext = extFromNameOrMime(params.filename, params.mimeType);
  await mkdir(UPLOAD_ROOT, { recursive: true });

  const meta: StoredMediaMeta = {
    id,
    userId: params.userId,
    filename: params.filename || `upload${ext}`,
    mimeType: params.mimeType || 'application/octet-stream',
    ext,
    size: params.buffer.length,
    createdAt: new Date().toISOString(),
  };

  await writeFile(path.join(UPLOAD_ROOT, `${id}${ext}`), params.buffer);
  await writeFile(path.join(UPLOAD_ROOT, `${id}.json`), JSON.stringify(meta));
  return meta;
}

export async function readMediaMeta(id: string): Promise<StoredMediaMeta | null> {
  try {
    const raw = await readFile(path.join(UPLOAD_ROOT, `${id}.json`), 'utf8');
    return JSON.parse(raw) as StoredMediaMeta;
  } catch {
    return null;
  }
}

export async function readMediaBuffer(
  meta: StoredMediaMeta
): Promise<Buffer | null> {
  try {
    return await readFile(path.join(UPLOAD_ROOT, `${meta.id}${meta.ext}`));
  } catch {
    return null;
  }
}

export function publicMediaUrl(id: string, requestOrigin?: string): string {
  const base =
    process.env.NEXT_PUBLIC_URL?.replace(/\/$/, '') ||
    requestOrigin?.replace(/\/$/, '') ||
    '';
  return `${base}/api/media/${id}`;
}
