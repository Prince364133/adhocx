/**
 * Corporate portal API client with Silent Refresh Token Rotation.
 *
 * 401 => Attempt silent refresh via /api/v1/auth/refresh-token.
 *        If refresh succeeds, replay original request seamlessly.
 *        If refresh fails or token is revoked, redirect to /login.
 * 403 => Role/Scope lacked permission: surfaced as ApiError(403).
 */
import { clearSession, getStoredToken, getStoredRefreshToken, updateTokens } from '../auth/session';

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    const port = window.location.port;

    if (host.includes('adhocx.com')) {
      return '/api/v1';
    }

    if (port === '7005' || port === '7006' || host === 'localhost' || host === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
      return `${window.location.protocol}//${host}:7001/api/v1`;
    }

    return `${window.location.origin}/api/v1`;
  }

  return 'https://api.adhocx.com/api/v1';
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isUnauthorized(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403;
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  /** multipart upload; sent as-is without a JSON content type */
  formData?: FormData;
  /** Skip the 401 redirect (login calls). */
  anonymous?: boolean;
  /** Internal flag preventing infinite retry loops */
  _retry?: boolean;
};

function errorMessage(status: number, body: any): string {
  const details = body?.error?.details;
  if (Array.isArray(details) && details.length > 0) return details.join(', ');
  if (typeof body?.error?.message === 'string') return body.error.message;
  if (Array.isArray(body?.message)) return body.message.join(', ');
  if (typeof body?.message === 'string') return body.message;
  if (status === 0) return 'Network error: the AdhocX API could not be reached.';
  return `Request failed with status ${status}`;
}

function handleAuthFailure(status: number, anonymous?: boolean) {
  if (status !== 401 || anonymous || typeof window === 'undefined') return;
  clearSession();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string | null) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string | null) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const data = json.data || json;
    if (data?.accessToken) {
      updateTokens(data.accessToken, data.refreshToken || refreshToken);
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

async function rawFetch(endpoint: string, options: RequestOptions, accept?: string): Promise<Response> {
  const headers: Record<string, string> = {};
  if (!options.formData) headers['Content-Type'] = 'application/json';
  if (accept) headers['Accept'] = accept;
  const token = getStoredToken();
  if (token && !options.anonymous) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.formData ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
    });
  } catch {
    throw new ApiError(0, errorMessage(0, null));
  }

  // Handle 401 with Silent Refresh Token Rotation
  if (response.status === 401 && !options.anonymous && !options._retry) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;

      if (newToken) {
        onRefreshed(newToken);
        return rawFetch(endpoint, { ...options, _retry: true }, accept);
      } else {
        onRefreshed(null);
        handleAuthFailure(401, options.anonymous);
      }
    } else {
      // Queue concurrent requests while token is refreshing
      const queuedToken = await new Promise<string | null>((resolve) => subscribeTokenRefresh(resolve));
      if (queuedToken) {
        return rawFetch(endpoint, { ...options, _retry: true }, accept);
      }
    }
  }

  if (!response.ok) {
    handleAuthFailure(response.status, options.anonymous);
    const body = await response.json().catch(() => ({}));
    throw new ApiError(response.status, errorMessage(response.status, body), body);
  }
  return response;
}

export async function apiRequest<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const response = await rawFetch(endpoint, options);
  if (response.status === 204) return undefined as T;
  const json = await response.json();
  if (json && typeof json === 'object' && 'success' in json && 'data' in json && (json as any).success === true) {
    return (json as any).data as T;
  }
  return json as T;
}

/** Downloads a binary/CSV endpoint and saves it with the given filename. */
export async function apiDownload(endpoint: string, filename: string): Promise<void> {
  const response = await rawFetch(endpoint, {}, '*/*');
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === '') continue;
    q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}
