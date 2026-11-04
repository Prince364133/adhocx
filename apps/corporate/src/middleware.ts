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

  if (pathname === '/login') {
    return token ? NextResponse.redirect(new URL('/dashboard', request.url)) : NextResponse.next();
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL(token ? '/dashboard' : '/login', request.url));
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
