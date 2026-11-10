import { NextResponse } from 'next/server';
import { verifyWebhook, handleWebhookEvent, type WebhookPayload } from '@/lib/instagram/webhook';

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
    const payload: WebhookPayload = await request.json();

    await handleWebhookEvent(payload);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ success: true });
  }
}
