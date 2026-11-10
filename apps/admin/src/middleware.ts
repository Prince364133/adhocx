import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Bypass static resources, Next.js internal chunks, icons, and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico' ||
    pathname === '/favicon.svg' ||
    pathname === '/favicon.png' ||
    pathname === '/adhocx_icon.png'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('adhocx_admin_token')?.value;
  const hasValidToken = Boolean(
    token &&
    token !== 'null' &&
    token !== 'undefined' &&
    token.trim().length > 10
  );

  // If user is accessing the login page
  if (pathname === '/login') {
    // If user was directed to login via redirect param or auth error, DO NOT redirect back to dashboard
    if (request.nextUrl.searchParams.has('redirect') || request.nextUrl.searchParams.has('error')) {
      const response = NextResponse.next();
      response.cookies.delete('adhocx_admin_token');
      return response;
    }

    // If authenticated with active session and no redirect query, navigate to dashboard
    if (hasValidToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  // For root path '/', if no token redirect to '/login', if token redirect to '/dashboard'
  if (pathname === '/') {
    if (hasValidToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // All other routes are protected administrative routes
  if (!hasValidToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete('adhocx_admin_token');
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
