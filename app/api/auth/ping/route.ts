import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';

// Lightweight ping endpoint to refresh session lastSeen
export async function POST() {
  try {
    const session = await getSession();
    
    if (!session.isLoggedIn) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const now = Date.now();
    
    // Check expiry
    const IDLE_TIMEOUT = 30 * 60 * 1000;
    const ABSOLUTE_TIMEOUT = 12 * 60 * 60 * 1000;
    
    if (
      (session.lastSeen && now - session.lastSeen > IDLE_TIMEOUT) ||
      (session.loginAt && now - session.loginAt > ABSOLUTE_TIMEOUT)
    ) {
      await session.destroy();
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    // Refresh lastSeen
    session.lastSeen = now;
    await session.save();

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Ping error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
