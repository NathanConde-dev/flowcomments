import { NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth/session';
import { checkForUpdates } from '@/lib/updates/check';
import { getUpdateStatus } from '@/lib/updates/status';

export async function GET() {
  try {
    await requireAdmin();
    const updates = await checkForUpdates();
    const status = getUpdateStatus();

    return NextResponse.json({
      ...updates,
      applyStatus: status,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error checking updates:', error);
    return NextResponse.json({ error: 'Erro ao verificar atualizações' }, { status: 500 });
  }
}
