import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/session';
import { testCredentials, getErrorHintPtBR } from '@/lib/instagram/oauth';

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { appId, appSecret } = await request.json();

    if (!appId || !appSecret) {
      return NextResponse.json(
        { error: 'App ID e App Secret são obrigatórios' },
        { status: 400 }
      );
    }

    const result = await testCredentials(appId, appSecret);

    if (!result.valid) {
      return NextResponse.json({
        valid: false,
        error: result.error,
        hint: getErrorHintPtBR(result.error || '', result.errorCode),
      });
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error('Error testing credentials:', error);
    return NextResponse.json(
      { error: 'Erro ao testar credenciais' },
      { status: 500 }
    );
  }
}
