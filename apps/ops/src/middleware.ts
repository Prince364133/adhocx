import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Operations Room SSR Edge Authentication Guard.
 * Protects Operations views using the secure adhocx_ops_token cookie.
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
  const hasValidToken = Boolean(
    token &&
    token !== 'null' &&
    token !== 'undefined' &&
    token.trim().length > 10
  );

  if (pathname === '/login') {
    if (request.nextUrl.searchParams.has('redirect') || request.nextUrl.searchParams.has('error')) {
      const response = NextResponse.next();
      response.cookies.delete('adhocx_ops_token');
      return response;
    }
    return hasValidToken ? NextResponse.redirect(new URL('/', request.url)) : NextResponse.next();
  }

  if (!hasValidToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('adhocx_ops_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
