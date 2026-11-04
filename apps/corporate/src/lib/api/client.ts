/**
 * Corporate portal API client. Same base-URL resolution, bearer auth and `{ success, data }`
 * envelope unwrapping as apps/admin (lib/api/client.ts) and apps/ops (lib/api/opsClient.ts).
 *
 * 401 => session is gone: clear it and go to /login.
 * 403 => the role or office scope lacks access: surfaced to the screen as ApiError(403) so it can
 *        render its "unauthorized" state. The session is NOT cleared (unlike admin).
 */
import { clearSession, getStoredToken } from '../auth/session';

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

    if (port === '7005' || host === 'localhost' || host === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
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
