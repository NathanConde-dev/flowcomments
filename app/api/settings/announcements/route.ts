import { NextResponse } from 'next/server';
import { AuthError, requireAuth } from '@/lib/auth/session';
import { fetchControlPlaneAnnouncements } from '@/lib/control-plane/announcements';
import { getControlPlaneUrl } from '@/lib/control-plane/config';

export async function GET() {
  try {
    await requireAuth();
    const payload = await fetchControlPlaneAnnouncements({
      audience: 'selfhosted',
      bypassCache: false,
    });

    return NextResponse.json({
      ...payload,
      controlPlaneUrl: getControlPlaneUrl(),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode });
    }
    console.error('announcements proxy', error);
    return NextResponse.json({ error: 'Erro ao buscar comunicados' }, { status: 500 });
  }
}
