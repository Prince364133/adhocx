import type { FleetAuthUserDto } from '@adhocx/contracts';

const TOKEN_KEY = 'adhocx_fleet_token';
const USER_KEY = 'adhocx_fleet_user';

export function getFleetToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredFleetUser(): FleetAuthUserDto | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as FleetAuthUserDto) : null;
  } catch {
    return null;
  }
}

export function setFleetSession(accessToken: string, user: FleetAuthUserDto): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  document.cookie = `${TOKEN_KEY}=${encodeURIComponent(accessToken)}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
}

export function clearFleetSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax`;
}
