import { randomBytes } from 'crypto';
import { prisma } from '@/lib/db/client';

export async function ensureEncryptionKey(): Promise<string> {
  if (process.env.ENCRYPTION_KEY) {
    return process.env.ENCRYPTION_KEY;
  }

  try {
    const existing = await prisma.systemConfig.findUnique({
      where: { key: 'ENCRYPTION_KEY_GENERATED' },
    });

    if (existing) {
      return existing.value;
    }

    const key = randomBytes(32).toString('hex');
    
    await prisma.systemConfig.create({
      data: {
        key: 'ENCRYPTION_KEY_GENERATED',
        value: key,
        encrypted: false,
      },
    });

    return key;
  } catch (error) {
    console.error('Error ensuring encryption key:', error);
    return randomBytes(32).toString('hex');
  }
}
