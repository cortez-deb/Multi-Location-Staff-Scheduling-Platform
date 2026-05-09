import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('shiftsync_session')?.value;

  // 1. Proxy /api/* to the Express backend, injecting the Bearer token
  if (pathname.startsWith('/api/')) {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const targetUrl = new URL(pathname + request.nextUrl.search, backendUrl);

    const headers = new Headers(request.headers);

    if (sessionCookie) {
      try {
        const session = JSON.parse(decodeURIComponent(sessionCookie));
        if (session?.accessToken) {
          headers.set('Authorization', `Bearer ${session.accessToken}`);
        }
      } catch {
        // ignore malformed cookie
      }
    }

    return NextResponse.rewrite(targetUrl, { request: { headers } });
  }

  // 2. Route protection
  const hasSession = !!sessionCookie;

  const protectedPrefixes = [
    '/dashboard', '/schedule', '/shifts', '/staff',
    '/swaps', '/analytics', '/settings', '/notifications',
  ];

  const isProtected = protectedPrefixes.some(p => pathname.startsWith(p));
  const isAuthPage  = pathname === '/login' || pathname === '/register';
  const isRoot      = pathname === '/';

  if (hasSession) {
    // Logged-in user hitting login page or root → send to dashboard
    if (isAuthPage || isRoot) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  } else {
    // Guest hitting a protected route or root → send to login
    if (isProtected || isRoot) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
