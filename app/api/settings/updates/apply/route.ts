import { NextResponse } from 'next/server';
import { AuthError, requireAdmin } from '@/lib/auth/session';
import { startSelfUpdate } from '@/lib/updates/apply';
import { checkForUpdates } from '@/lib/updates/check';
import { getUpdateStatus } from '@/lib/updates/status';

export async function POST() {
  try {
    await requireAdmin();

    const result = startSelfUpdate();
    if (!result.ok) {
      const updates = await checkForUpdates();
      return NextResponse.json(
        {
          error: result.error,
          selfUpdateEnabled: false,
          installHints: updates.installHints,
          applyStatus: getUpdateStatus(),
        },
        { status: result.statusCode }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Atualização iniciada em background',
      applyStatus: getUpdateStatus(),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('Error applying update:', error);
    return NextResponse.json({ error: 'Erro ao iniciar atualização' }, { status: 500 });
  }
}
