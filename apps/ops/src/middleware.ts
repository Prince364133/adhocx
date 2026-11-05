import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Operations Room SSR Edge Authentication Guard.
 * Protects control room views (/board, /planner, /map, /safety, /deviations, /)
 * using the secure adhocx_ops_token cookie.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('adhocx_ops_token')?.value;

  if (pathname === '/login') {
    return token ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
