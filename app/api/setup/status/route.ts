import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';

/** Public bootstrap status for the /setup wizard (no auth). */
export async function GET() {
  try {
    const [adminCount, metaAppId] = await Promise.all([
      prisma.user.count({ where: { isAdmin: true } }),
      prisma.systemConfig.findUnique({ where: { key: 'META_APP_ID' } }),
    ]);

    return NextResponse.json({
      adminCreated: adminCount > 0,
      metaConfigured: Boolean(metaAppId?.value),
    });
  } catch (error) {
    console.error('Error fetching setup bootstrap status:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar status do setup' },
      { status: 500 }
    );
  }
}
