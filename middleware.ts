import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Paths that don't require authentication
// Use exact match for root-level paths, prefix match only for actual prefixes
const publicPathsExact = [
  '/',
  '/login',
  '/setup',
  '/licenca',
];

const publicPathsPrefixes = [
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/ping',
  '/api/setup/', // Individual routes check auth after setup
  '/api/health',
  '/api/webhook',
  '/api/instagram/callback', // Meta OAuth callback
  '/api/mcp', // Uses Bearer token auth, not session
  '/_next/',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check exact matches
  if (publicPathsExact.includes(pathname)) {
    return NextResponse.next();
  }

  // Allow static files (anything with a file extension)
  if (/\.[a-z0-9]+$/i.test(pathname)) {
    return NextResponse.next();
  }

  // Check prefix matches
  if (publicPathsPrefixes.some(prefix => pathname.startsWith(prefix))) {
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
    '/((?!_next/static|_next/image).*)',
  ],
};
