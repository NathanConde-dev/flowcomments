import { NextResponse } from 'next/server';
import { AuthError, requireAuth } from '@/lib/auth/session';
import { getMetaConfig } from '@/lib/instagram/oauth';
import { prisma } from '@/lib/db/client';

export async function GET() {
  try {
    const session = await requireAuth();
    const config = await getMetaConfig();

    const [igCount, automationCount] = await Promise.all([
      prisma.instagramAccount.count({
        where: { userId: session.userId, isActive: true },
      }),
      prisma.automation.count({
        where: { userId: session.userId },
      }),
    ]);

    return NextResponse.json({
      username: session.username,
      metaConfigured: Boolean(config?.appId && config?.appSecret && config?.webhookVerifyToken),
      igConnected: igCount > 0,
      hasAutomation: automationCount > 0,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error fetching setup status:', error);
    return NextResponse.json({ error: 'Erro ao buscar status do setup' }, { status: 500 });
  }
}
