import { NextResponse } from 'next/server';
import { AuthError, requireAdmin, requireAuth } from '@/lib/auth/session';
import { encrypt, decrypt } from '@/lib/crypto/encryption';
import { prisma } from '@/lib/db/client';

async function readMaskedConfig() {
  const [
    metaAppId,
    metaAppSecret,
    metaConfigId,
    igAppId,
    igAppSecret,
    webhookVerifyToken,
  ] = await Promise.all([
    prisma.systemConfig.findUnique({ where: { key: 'META_APP_ID' } }),
    prisma.systemConfig.findUnique({ where: { key: 'META_APP_SECRET' } }),
    prisma.systemConfig.findUnique({ where: { key: 'META_CONFIG_ID' } }),
    prisma.systemConfig.findUnique({ where: { key: 'IG_APP_ID' } }),
    prisma.systemConfig.findUnique({ where: { key: 'IG_APP_SECRET' } }),
    prisma.systemConfig.findUnique({ where: { key: 'WEBHOOK_VERIFY_TOKEN' } }),
  ]);

  const mask = (value?: string | null, encrypted?: boolean) => {
    if (!value) return '';
    const plain = encrypted ? decrypt(value) : value;
    if (plain.length <= 8) return '••••••••';
    return `${plain.slice(0, 4)}••••${plain.slice(-4)}`;
  };

  return {
    metaAppId: metaAppId?.value || '',
    metaAppSecret: metaAppSecret ? mask(metaAppSecret.value, metaAppSecret.encrypted) : '',
    metaConfigId: metaConfigId?.value || '',
    igAppId: igAppId?.value || '',
    igAppSecret: igAppSecret ? mask(igAppSecret.value, igAppSecret.encrypted) : '',
    webhookVerifyToken: webhookVerifyToken
      ? mask(webhookVerifyToken.value, webhookVerifyToken.encrypted)
      : '',
    hasMetaAppSecret: Boolean(metaAppSecret?.value),
    hasWebhookVerifyToken: Boolean(webhookVerifyToken?.value),
  };
}

export async function GET() {
  try {
    await requireAuth();
    const config = await readMaskedConfig();
    return NextResponse.json({ config });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error fetching Meta settings:', error);
    return NextResponse.json({ error: 'Erro ao buscar configuração' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Prefer admin; allow authenticated owner during single-tenant self-host
    try {
      await requireAdmin();
    } catch (adminError) {
      if (!(adminError instanceof AuthError) || adminError.statusCode !== 403) {
        throw adminError;
      }
      await requireAuth();
    }
    const body = await request.json();

    const metaAppId = String(body.metaAppId || '').trim();
    const metaAppSecret = String(body.metaAppSecret || '').trim();
    const metaConfigId = String(body.metaConfigId || '').trim();
    const igAppId = String(body.igAppId || '').trim();
    const igAppSecret = String(body.igAppSecret || '').trim();
    const webhookVerifyToken = String(body.webhookVerifyToken || '').trim();

    if (!metaAppId) {
      return NextResponse.json({ error: 'Meta App ID é obrigatório' }, { status: 400 });
    }

    const existingSecret = await prisma.systemConfig.findUnique({
      where: { key: 'META_APP_SECRET' },
    });
    const existingWebhook = await prisma.systemConfig.findUnique({
      where: { key: 'WEBHOOK_VERIFY_TOKEN' },
    });

    const secretLooksMasked = metaAppSecret.includes('••••');
    const webhookLooksMasked = webhookVerifyToken.includes('••••');

    if (!secretLooksMasked && !metaAppSecret && !existingSecret) {
      return NextResponse.json({ error: 'Meta App Secret é obrigatório' }, { status: 400 });
    }
    if (!webhookLooksMasked && !webhookVerifyToken && !existingWebhook) {
      return NextResponse.json(
        { error: 'Webhook Verify Token é obrigatório' },
        { status: 400 }
      );
    }

    await prisma.systemConfig.upsert({
      where: { key: 'META_APP_ID' },
      create: { key: 'META_APP_ID', value: metaAppId, encrypted: false },
      update: { value: metaAppId },
    });

    if (metaAppSecret && !secretLooksMasked) {
      await prisma.systemConfig.upsert({
        where: { key: 'META_APP_SECRET' },
        create: { key: 'META_APP_SECRET', value: encrypt(metaAppSecret), encrypted: true },
        update: { value: encrypt(metaAppSecret), encrypted: true },
      });
    }

    if (metaConfigId) {
      await prisma.systemConfig.upsert({
        where: { key: 'META_CONFIG_ID' },
        create: { key: 'META_CONFIG_ID', value: metaConfigId, encrypted: false },
        update: { value: metaConfigId },
      });
    }

    if (igAppId) {
      await prisma.systemConfig.upsert({
        where: { key: 'IG_APP_ID' },
        create: { key: 'IG_APP_ID', value: igAppId, encrypted: false },
        update: { value: igAppId },
      });
    }

    if (igAppSecret && !igAppSecret.includes('••••')) {
      await prisma.systemConfig.upsert({
        where: { key: 'IG_APP_SECRET' },
        create: { key: 'IG_APP_SECRET', value: encrypt(igAppSecret), encrypted: true },
        update: { value: encrypt(igAppSecret), encrypted: true },
      });
    }

    if (webhookVerifyToken && !webhookLooksMasked) {
      await prisma.systemConfig.upsert({
        where: { key: 'WEBHOOK_VERIFY_TOKEN' },
        create: {
          key: 'WEBHOOK_VERIFY_TOKEN',
          value: encrypt(webhookVerifyToken),
          encrypted: true,
        },
        update: { value: encrypt(webhookVerifyToken), encrypted: true },
      });
    }

    return NextResponse.json({ success: true, config: await readMaskedConfig() });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error saving Meta settings:', error);
    return NextResponse.json({ error: 'Erro ao salvar configuração' }, { status: 500 });
  }
}
