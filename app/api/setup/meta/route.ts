import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/client';
import { encrypt } from '@/lib/crypto/encryption';

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
