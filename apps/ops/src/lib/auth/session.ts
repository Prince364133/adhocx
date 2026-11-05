export const OPS_TOKEN_KEY = 'adhocx_ops_token';
export const OPS_REFRESH_TOKEN_KEY = 'adhocx_ops_refresh_token';
export const OPS_USER_KEY = 'adhocx_ops_user';
export const OPS_SESSION_COOKIE = 'adhocx_ops_token';

export interface OpsUser {
  id: string;
  role: string;
  fullName: string;
  email: string;
  phone?: string;
}

export interface TokenClaims {
  id: string;
  role: string;
  phone?: string;
  email?: string;
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

export function getStoredOpsToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(OPS_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function getStoredOpsRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(OPS_REFRESH_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function updateOpsTokens(accessToken: string, refreshToken?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OPS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(OPS_REFRESH_TOKEN_KEY, refreshToken);
    }
    document.cookie = `${OPS_SESSION_COOKIE}=${encodeURIComponent(accessToken)}; path=/; max-age=${7 * 86400}; SameSite=Lax`;
  } catch (err) {
    console.error('Failed to update ops tokens in storage:', err);
  }
}

export function getStoredOpsUser(): OpsUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(OPS_USER_KEY);
    return raw ? (JSON.parse(raw) as OpsUser) : null;
  } catch {
    return null;
  }
}

export function setOpsSession(accessToken: string, refreshToken: string | undefined, user: OpsUser): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OPS_TOKEN_KEY, accessToken);
    if (refreshToken) {
      localStorage.setItem(OPS_REFRESH_TOKEN_KEY, refreshToken);
    }
    localStorage.setItem(OPS_USER_KEY, JSON.stringify(user));
    document.cookie = `${OPS_SESSION_COOKIE}=${encodeURIComponent(accessToken)}; path=/; max-age=${7 * 86400}; SameSite=Lax`;
  } catch (err) {
    console.error('Failed to set ops session in storage:', err);
  }
}

export function clearOpsSession(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(OPS_TOKEN_KEY);
    localStorage.removeItem(OPS_REFRESH_TOKEN_KEY);
    localStorage.removeItem(OPS_USER_KEY);
    document.cookie = `${OPS_SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  } catch (err) {
    console.error('Failed to clear ops session:', err);
  }
}

