import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Same gate as apps/admin/src/middleware.ts, with the corporate session cookie. */
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

  const token = request.cookies.get('adhocx_corporate_token')?.value;
  const hasValidToken = Boolean(
    token &&
    token !== 'null' &&
    token !== 'undefined' &&
    token.trim().length > 10
  );

  if (pathname === '/login') {
    if (request.nextUrl.searchParams.has('redirect') || request.nextUrl.searchParams.has('error')) {
      const response = NextResponse.next();
      response.cookies.delete('adhocx_corporate_token');
      return response;
    }
    return hasValidToken ? NextResponse.redirect(new URL('/dashboard', request.url)) : NextResponse.next();
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL(hasValidToken ? '/dashboard' : '/login', request.url));
  }

  if (!hasValidToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('adhocx_corporate_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
