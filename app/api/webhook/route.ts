import { NextResponse } from 'next/server';
import {
  verifyWebhook,
  handleWebhookEvent,
  getWebhookAppSecret,
  type WebhookPayload,
} from '@/lib/instagram/webhook';
import { verifyMetaSignature } from '@/lib/crypto/security';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (!mode || !token || !challenge) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  const verifiedChallenge = await verifyWebhook(mode, token, challenge);

  if (verifiedChallenge) {
    return new NextResponse(verifiedChallenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get('x-hub-signature-256');
    const appSecret = await getWebhookAppSecret();

    if (!appSecret) {
      console.error('Webhook rejected: Meta App Secret not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 });
    }

    if (!verifyMetaSignature(rawBody, signature, appSecret)) {
      console.warn('Webhook rejected: invalid X-Hub-Signature-256');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody) as WebhookPayload;
    await handleWebhookEvent(payload);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    // Return 200 to avoid Meta retry storms on our internal errors after auth passed
    return NextResponse.json({ success: true });
  }
}
