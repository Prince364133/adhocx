/**
 * Corporate portal session. Same storage pattern as apps/admin (localStorage + a cookie that the
 * Next.js middleware reads), with portal-specific keys so an admin and a corporate session never
 * collide in one browser.
 *
 * The tenant, corporate role and office scope come from the access token claims that
 * AuthService.buildCorporateClaims signs (corporateTenantId / corporateRole / corporateOfficeIds).
 * They are decoded here ONLY to drive the UI; the API enforces every one of them.
 */

const TOKEN_KEY = 'adhocx_corporate_token';
const REFRESH_KEY = 'adhocx_corporate_refresh';
const USER_KEY = 'adhocx_corporate_user';
export const SESSION_COOKIE = 'adhocx_corporate_token';

export interface SessionUser {
  id: string;
  role: string;
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface TokenClaims {
  id: string;
  role: string;
  corporateTenantId?: string;
  corporateRole?: string;
  corporateOfficeIds?: string[];
  exp?: number;
}

export function decodeToken(token: string | null): TokenClaims | null {
  if (!token) return null;
  const part = token.split('.')[1];
  if (!part) return null;
  try {
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    const claims = JSON.parse(json);
    return claims && typeof claims === 'object' ? (claims as TokenClaims) : null;
  } catch {
    return null;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

export function updateTokens(accessToken: string, refreshToken?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  const claims = decodeToken(accessToken);
  const maxAge = claims?.exp ? Math.max(0, claims.exp - Math.floor(Date.now() / 1000)) : 7 * 24 * 3600;
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(accessToken)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function getStoredUser(): SessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function setSession(accessToken: string, refreshToken: string | undefined, user: SessionUser): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  const claims = decodeToken(accessToken);
  const maxAge = claims?.exp ? Math.max(0, claims.exp - Math.floor(Date.now() / 1000)) : 7 * 24 * 3600;
  document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(accessToken)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

export function clearSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // storage unavailable: the cookie removal below still ends the session for the middleware
  }
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

/** Roles allowed to use the corporate portal (the tenant must come from the token). */
export const PORTAL_USER_ROLES = ['CORPORATE_ADMIN', 'CORPORATE_MANAGER'] as const;

export function isPortalRole(role: string | undefined | null): boolean {
  return !!role && (PORTAL_USER_ROLES as readonly string[]).includes(role.toUpperCase());
}

export function getSessionClaims(): TokenClaims | null {
  return decodeToken(getStoredToken());
}
