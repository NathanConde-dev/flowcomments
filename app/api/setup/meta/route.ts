import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { encrypt } from '@/lib/crypto/encryption';
import { requireAdmin, requireAuth } from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { appId, appSecret, configId, webhookVerifyToken } = body;

    if (!appId || !appSecret || !webhookVerifyToken) {
      return NextResponse.json(
        { error: 'App ID, App Secret e Webhook Verify Token são obrigatórios' },
        { status: 400 }
      );
    }

    // Require admin once setup has an admin; first-run remains open for bootstrap
    const adminCount = await prisma.user.count({
      where: { isAdmin: true },
    });

    if (adminCount > 0) {
      try {
        await requireAdmin();
      } catch {
        // Fall back: authenticated non-admin must not rewrite global Meta secrets
        try {
          await requireAuth();
          return NextResponse.json(
            { error: 'Admin access required' },
            { status: 403 }
          );
        } catch {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 403 }
          );
        }
      }
    }

    await prisma.systemConfig.upsert({
      where: { key: 'META_APP_ID' },
      create: {
        key: 'META_APP_ID',
        value: appId,
        encrypted: false,
      },
      update: {
        value: appId,
      },
    });

    await prisma.systemConfig.upsert({
      where: { key: 'META_APP_SECRET' },
      create: {
        key: 'META_APP_SECRET',
        value: encrypt(appSecret),
        encrypted: true,
      },
      update: {
        value: encrypt(appSecret),
      },
    });

    if (configId) {
      await prisma.systemConfig.upsert({
        where: { key: 'META_CONFIG_ID' },
        create: {
          key: 'META_CONFIG_ID',
          value: configId,
          encrypted: false,
        },
        update: {
          value: configId,
        },
      });
    }

    await prisma.systemConfig.upsert({
      where: { key: 'WEBHOOK_VERIFY_TOKEN' },
      create: {
        key: 'WEBHOOK_VERIFY_TOKEN',
        value: encrypt(webhookVerifyToken),
        encrypted: true,
      },
      update: {
        value: encrypt(webhookVerifyToken),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving Meta config:', error);
    return NextResponse.json(
      { error: 'Erro ao salvar configuração' },
      { status: 500 }
    );
  }
}
