import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  // Only proxy /api routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    const targetUrl = new URL(request.nextUrl.pathname + request.nextUrl.search, backendUrl);
    
    // Create new headers
    const headers = new Headers(request.headers);
    
    // Inject the Bearer token from cookies if present
    const token = request.cookies.get('shiftsync_token')?.value;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return NextResponse.rewrite(targetUrl, {
      request: {
        headers,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
