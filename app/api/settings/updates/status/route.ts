import { NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth/session';
import { getUpdateStatus } from '@/lib/updates/status';

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(getUpdateStatus());
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error reading update status:', error);
    return NextResponse.json({ error: 'Erro ao ler status da atualização' }, { status: 500 });
  }
}
