import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = [
  '/',
  '/login',
  '/setup',
  '/licenca',
  '/setup-com-ia.md',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/setup/admin',
  '/api/setup/meta',
  '/api/health',
  '/api/webhook',
  '/_next',
  '/favicon.ico',
];

const protectedPaths = [
  '/dashboard',
  '/automations',
  '/contacts',
  '/inbox',
  '/settings',
  '/api/instagram',
  '/api/automations',
  '/api/settings',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check if path needs protection
  const needsAuth = protectedPaths.some(path => pathname.startsWith(path));
  
  if (needsAuth) {
    const sessionCookie = request.cookies.get('flowcomments_session');
    
    if (!sessionCookie) {
      // No session cookie - redirect to login
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      return NextResponse.redirect(url);
    }

    // Add no-cache headers for authenticated pages
    const response = NextResponse.next();
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
