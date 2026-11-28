import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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

  const token = request.cookies.get('adhocx_fleet_token')?.value;
  const hasToken = Boolean(token && token !== 'null' && token !== 'undefined' && token.trim().length > 10);

  if (pathname === '/login') {
    if (request.nextUrl.searchParams.has('redirect') || request.nextUrl.searchParams.has('error')) {
      const response = NextResponse.next();
      response.cookies.delete('adhocx_fleet_token');
      return response;
    }
    if (hasToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL(hasToken ? '/dashboard' : '/login', request.url));
  }

  if (!hasToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('adhocx_fleet_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
