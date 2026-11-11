import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { detectLocale } from '@/i18n/detect';
import { localeCookieName } from '@/i18n/config';

const publicPathsExact = [
  '/',
  '/login',
  '/setup',
  '/licenca',
  '/setup-com-ia.md',
  '/favicon.ico',
  '/robots.txt',
];

const publicPathsPrefixes = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/setup/',
  '/api/health',
  '/api/webhook',
  '/api/instagram/callback',
  '/api/mcp',
  '/api/locale',
  '/_next/',
  '/public/',
];

function withLocale(request: NextRequest, response: NextResponse) {
  // Cookie is only an explicit user override (set via /api/locale).
  // Auto-detect stays request-scoped so Brazil bootstrap can still refine.
  const locale = detectLocale(request);
  response.headers.set('x-locale', locale);
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPathsExact.includes(pathname)) {
    return withLocale(request, NextResponse.next());
  }

  if (publicPathsPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return withLocale(request, NextResponse.next());
  }

  const sessionCookie = request.cookies.get('flowcomments_session');

  if (!sessionCookie) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return withLocale(request, NextResponse.redirect(url));
  }

  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return withLocale(request, response);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
