import { NextRequest, NextResponse } from 'next/server';
import { isAppLocale, localeCookieName } from '@/i18n/config';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const locale = body?.locale;
    if (!isAppLocale(locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }

    const response = NextResponse.json({ ok: true, locale });
    response.cookies.set(localeCookieName, locale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }
}
