import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Public paths that don't require authentication
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
  '/api/webhook', // Meta webhooks are unauthenticated
  '/api/instagram/oauth/callback',
  '/api/mcp', // Uses Bearer token auth, not session
  '/_next',
  '/favicon.ico',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check if session cookie exists (basic check only)
  // Real session validation happens server-side in layout/requireAuth
  const sessionCookie = request.cookies.get('flowcomments_session');
  
  if (!sessionCookie) {
    // No session cookie at all - redirect to login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
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

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
