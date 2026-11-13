import { prisma } from '@/lib/db/client';

export async function getSystemConfig(key: string): Promise<string | null> {
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSystemConfig(key: string, value: string): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key },
    create: { key, value, encrypted: false },
    update: { value, encrypted: false },
  });
}
