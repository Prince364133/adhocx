import type { LiveVehicleTelemetryPayload, OnboardCorporateCompanyDto } from '@adhocx/contracts';
import {
  CorporateTenantOption,
  OnboardCorporateCompanyResponse,
  CorporateRouteItem,
  OpsBoardResponse,
  RouteWaypointsResponse,
  SosAlertItem,
  RoutePlanningResult,
  RouteDirectionsResult,
  RequirementListItem,
  AssignmentItem,
  TripListItem,
  TripEvent,
} from './opsTypes';
import {
  getStoredOpsToken,
  getStoredOpsRefreshToken,
  updateOpsTokens,
  clearOpsSession,
  setOpsSession,
  getStoredOpsUser,
  OpsUser,
} from '../auth/session';

export {
  getStoredOpsToken,
  getStoredOpsRefreshToken,
  updateOpsTokens,
  clearOpsSession,
  setOpsSession,
  getStoredOpsUser,
};
export type { OpsUser };

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    const port = window.location.port;

    // Local app development must use the local API, even when the root .env
    // contains the production URL for deployed applications.
    if (host === 'localhost' || host === '127.0.0.1' || ['7002', '7003', '7004', '7005', '7006'].includes(port)) {
      return `${window.location.protocol}//${host}:7001/api/v1`;
    }

    if (host.includes('adhocx.com')) {
      return '/api/v1';
    }

    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }

    return `${window.location.origin}/api/v1`;
  }

  return process.env.NEXT_PUBLIC_API_URL || 'https://api.adhocx.com/api/v1';
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
  const refreshToken = getStoredOpsRefreshToken();
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
      updateOpsTokens(data.accessToken, data.refreshToken || refreshToken);
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

function handleAuthFailure(status: number, anonymous?: boolean) {
  if (status !== 401 || anonymous || typeof window === 'undefined') return;
  clearOpsSession();
  if (!window.location.pathname.startsWith('/login')) {
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
  }
}

type RequestOptions = RequestInit & {
  anonymous?: boolean;
  _retry?: boolean;
  responseType?: 'blob';
};

type ApiList<T> = T[] | { items?: T[] };

type RequirementApiItem = {
  id: string;
  vendorName?: string;
  vendor?: { organizationName?: string };
  fulfillmentMode?: 'DIRECT_DISPATCH';
  vehicleType: string;
  quantity: number;
  assignedQuantity?: number;
  pickupAddress?: string;
  pickupLocation?: { address?: string };
  dropAddress?: string;
  dropLocation?: { address?: string };
  reportingTime: string;
  status: string;
  ratePerVehicle?: number;
  vendorRate?: number;
  suggestedBudget?: number;
  zonalQuote?: RequirementListItem['zonalQuote'];
  createdAt: string;
};

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const token = getStoredOpsToken();
  const { responseType, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    ...(fetchOptions.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (token && !options.anonymous) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    });
  } catch (err: any) {
    throw new Error(`Network failure: ${err?.message || 'Could not connect to the API at ' + baseUrl}`, { cause: err });
  }

  // Silent refresh token rotation on 401
  if (response.status === 401 && !options.anonymous && !options._retry) {
    if (!isRefreshing) {
      isRefreshing = true;
      const newToken = await refreshAccessToken();
      isRefreshing = false;

      if (newToken) {
        onRefreshed(newToken);
        return request<T>(endpoint, { ...options, _retry: true });
      } else {
        onRefreshed(null);
        handleAuthFailure(401, options.anonymous);
      }
    } else {
      const queuedToken = await new Promise<string | null>((resolve) => subscribeTokenRefresh(resolve));
      if (queuedToken) {
        return request<T>(endpoint, { ...options, _retry: true });
      }
    }
  }

  if (!response.ok) {
    handleAuthFailure(response.status, options.anonymous);
    let errorDetail = response.statusText;
    try {
      const errJson = await response.json();
      errorDetail = errJson.message || errJson.error?.message || errJson.error || JSON.stringify(errJson);
    } catch {
      // ignore
    }
    throw new Error(`API Error [${response.status}]: ${errorDetail}`);
  }

  if (response.status === 204) return undefined as T;
  if (options.responseType === 'blob') {
    return response.blob() as Promise<T>;
  }

  const json = await response.json();
  if (json && typeof json === 'object' && json.success === true && 'data' in json) {
    return json.data as T;
  }

  return json as T;
}

export interface CorporateTenantRealtimeEvent {
  channel: string;
  event: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

export async function streamCorporateTenantEvents(
  tenantId: string,
  signal: AbortSignal,
  onEvent: (event: CorporateTenantRealtimeEvent) => void,
  onOpen: () => void,
): Promise<void> {
  const url = `${getApiBaseUrl()}/notifications/events?channel=${encodeURIComponent(`corporate:${tenantId}`)}`;
  let token = getStoredOpsToken();
  if (!token) throw new Error('Operations session is unavailable.');

  const open = (accessToken: string) => fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'text/event-stream' },
    cache: 'no-store',
    signal,
  });
  let response = await open(token);
  if (response.status === 401) {
    await request<unknown>('/corporate/tenants?page=1&limit=1');
    token = getStoredOpsToken();
    if (!token) throw new Error('Operations session expired.');
    response = await open(token);
  }
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Realtime stream failed [${response.status}]: ${detail || response.statusText}`);
  }
  if (!response.body) throw new Error('Realtime stream did not provide a response body.');

  onOpen();
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const dispatchFrame = (frame: string) => {
    const data = frame.split(/\r?\n/)
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
      .join('\n');
    if (!data) return;
    let event: CorporateTenantRealtimeEvent;
    try {
      event = JSON.parse(data) as CorporateTenantRealtimeEvent;
    } catch (error) {
      throw new Error('Realtime stream returned an invalid event payload.', { cause: error });
    }
    if (event && typeof event.event === 'string') onEvent(event);
  };

  try {
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = buffer.search(/\r?\n\r?\n/);
      while (boundary >= 0) {
        const frame = buffer.slice(0, boundary);
        const separator = buffer.match(/\r?\n\r?\n/);
        const separatorLength = separator?.[0].length ?? 2;
        buffer = buffer.slice(boundary + separatorLength);
        dispatchFrame(frame);
        boundary = buffer.search(/\r?\n\r?\n/);
      }
    }
    buffer += decoder.decode();
    if (buffer.trim()) dispatchFrame(buffer);
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

export const opsApi = {
  /** Latest known position of every active cab in scope (only cabs that have reported GPS). */
  getFleetSnapshot: (tenantId?: string) =>
    request<LiveVehicleTelemetryPayload[]>(
      `/corporate/trips/routes/fleet/live${tenantId ? `?tenantId=${encodeURIComponent(tenantId)}` : ''}`,
    ),
  /** Single-use 30 s ticket for opening a live-stream EventSource (the access token never goes in a URL). */
  createStreamTicket: () =>
    request<{ ticket: string; expiresAt: string }>('/corporate/trips/live-stream-tickets', { method: 'POST', body: '{}' }),

  // ── Authentication ──
  login: async (identifier: string, password: string): Promise<any> => {
    return request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, role: 'OPS' }),
      anonymous: true,
    });
  },

  logout: async (): Promise<void> => {
    try {
      await request('/auth/logout', { method: 'POST', body: JSON.stringify({}) });
    } catch {}
    clearOpsSession();
  },

  // ── Operations Board & Command Cockpit ──
  getOpsBoard: async (params: {
    date?: string;
    tenantId?: string;
    officeId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<OpsBoardResponse> => {
    const q = new URLSearchParams();
    if (params.date) q.set('date', params.date);
    if (params.tenantId) q.set('tenantId', params.tenantId);
    if (params.officeId) q.set('officeId', params.officeId);
    if (params.page) q.set('page', String(params.page));
    if (params.pageSize) q.set('pageSize', String(params.pageSize));

    return request<OpsBoardResponse>(`/corporate/ops/board?${q.toString()}`);
  },

  getRouteDetail: async (routeId: string): Promise<CorporateRouteItem> => {
    const detail = await request<{
      route: CorporateRouteItem;
      livePosition: NonNullable<CorporateRouteItem['gps']>;
    }>(`/corporate/ops/routes/${routeId}/detail`);
    return { ...detail.route, gps: detail.livePosition };
  },

  getRouteWaypoints: async (routeId: string): Promise<RouteWaypointsResponse> => {
    return request<RouteWaypointsResponse>(`/corporate/trips/routes/${routeId}/waypoints`);
  },

  getRequirements: async (status?: string): Promise<RequirementListItem[]> => {
    const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    const response = await request<ApiList<RequirementApiItem>>(`/requirements${query}`);
    const items = Array.isArray(response) ? response : response?.items;
    if (!Array.isArray(items)) return [];

    return items.map((requirement) => ({
      id: requirement.id,
      vendorName: requirement.vendorName || requirement.vendor?.organizationName || 'Corporate Client',
      fulfillmentMode: requirement.fulfillmentMode,
      vehicleType: requirement.vehicleType,
      quantity: requirement.quantity,
      assignedQuantity: requirement.assignedQuantity ?? 0,
      pickupAddress: requirement.pickupAddress || requirement.pickupLocation?.address || 'Pickup Location',
      dropAddress: requirement.dropAddress || requirement.dropLocation?.address || 'Drop Location',
      reportingTime: requirement.reportingTime,
      status: requirement.status,
      vendorRate: requirement.ratePerVehicle ?? requirement.vendorRate ?? requirement.suggestedBudget ?? 0,
      ratePerVehicle: requirement.ratePerVehicle ?? requirement.vendorRate ?? requirement.suggestedBudget ?? 0,
      suggestedBudget: requirement.suggestedBudget,
      zonalQuote: requirement.zonalQuote,
      createdAt: requirement.createdAt,
    }));
  },

  getAssignments: async (params: { status?: string; search?: string; limit?: number; page?: number } = {}): Promise<AssignmentItem[]> => {
    const query = new URLSearchParams();
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    if (params.limit) query.set('limit', String(params.limit));
    if (params.page) query.set('page', String(params.page));
    const queryString = query.toString();
    const response = await request<ApiList<AssignmentItem>>(`/assignments${queryString ? `?${queryString}` : ''}`);
    if (Array.isArray(response)) return response;
    return Array.isArray(response?.items) ? response.items : [];
  },

  getTrips: async (status?: string): Promise<TripListItem[]> => {
    const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    const response = await request<ApiList<TripListItem>>(`/trips${query}`);
    if (Array.isArray(response)) return response;
    return Array.isArray(response?.items) ? response.items : [];
  },

  getTripEvents: (tripId: string): Promise<TripEvent[]> =>
    request<TripEvent[]>(`/trips/${encodeURIComponent(tripId)}/events`),

  // ── Companies / Tenants ──
  getTenants: async (params: { search?: string; page?: number; limit?: number } = {}): Promise<{
    items: CorporateTenantOption[];
    pagination: { total: number; page: number; limit: number; totalPages: number };
  }> => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    q.set('page', String(params.page ?? 1));
    q.set('limit', String(params.limit ?? 100));
    return request<{
      items: CorporateTenantOption[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/corporate/tenants?${q.toString()}`);
  },

  getTenant: (tenantId: string): Promise<CorporateTenantOption> =>
    request<CorporateTenantOption>(`/corporate/tenants/${encodeURIComponent(tenantId)}`),

  onboardCompany: (payload: OnboardCorporateCompanyDto): Promise<OnboardCorporateCompanyResponse> =>
    request<OnboardCorporateCompanyResponse>('/corporate/tenants/onboard', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  createOffice: (
    tenantId: string,
    payload: { code: string; name: string; addressText: string; latitude: number; longitude: number },
  ) =>
    request(`/corporate/tenants/${encodeURIComponent(tenantId)}/offices`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // ── Routes & Filtering ──
  getRoutes: async (params: {
    tenantId?: string;
    shiftDate?: string;
    shiftTime?: string;
    direction?: 'LOGIN' | 'LOGOUT';
    status?: string;
    dispatchStatus?: string;
    search?: string;
    limit?: number;
    offset?: number;
    includeStops?: boolean;
    includeAnalytics?: boolean;
  }): Promise<CorporateRouteItem[]> => {
    const q = new URLSearchParams();
    if (params.tenantId && params.tenantId !== 'ALL') q.set('tenantId', params.tenantId);
    if (params.shiftDate) q.set('shiftDate', params.shiftDate);
    if (params.shiftTime) q.set('shiftTime', params.shiftTime);
    if (params.direction) q.set('direction', params.direction);
    if (params.status) q.set('status', params.status);
    if (params.dispatchStatus) q.set('dispatchStatus', params.dispatchStatus);
    if (params.search?.trim()) q.set('search', params.search.trim());
    if (params.limit) q.set('limit', String(params.limit));
    if (params.offset) q.set('offset', String(params.offset));
    if (params.includeStops) q.set('includeStops', 'true');
    if (params.includeAnalytics) q.set('includeAnalytics', 'true');

    const query = q.toString();
    return request<CorporateRouteItem[]>(`/corporate/routes${query ? `?${query}` : ''}`);
  },

  getRouteById: async (routeId: string, includeDirections = true): Promise<CorporateRouteItem> => {
    return request<CorporateRouteItem>(
      `/corporate/routes/${encodeURIComponent(routeId)}${includeDirections ? '?includeDirections=true' : ''}`,
    );
  },

  getRouteDirections: async (routeId: string, refresh = false): Promise<RouteDirectionsResult> => {
    return request<RouteDirectionsResult>(
      `/corporate/routes/${encodeURIComponent(routeId)}/directions${refresh ? '?refresh=true' : ''}`,
    );
  },

  // ── Manual Operations Interventions (§ 55) ──
  forceDispatchRoute: async (routeId: string): Promise<{
    routeId: string;
    status: 'OFFERED' | 'NO_DRIVERS_FOUND' | 'ALL_DRIVERS_BUSY' | 'ALREADY_ASSIGNED';
    offeredDriverName?: string;
    searchRadiusKm?: number;
  }> => {
    return request<{
      routeId: string;
      status: 'OFFERED' | 'NO_DRIVERS_FOUND' | 'ALL_DRIVERS_BUSY' | 'ALREADY_ASSIGNED';
      offeredDriverName?: string;
      searchRadiusKm?: number;
    }>(`/corporate/dispatch/routes/${routeId}/start-now`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  reassignDriver: async (
    routeId: string,
    payload: { newDriverId?: string; reason: string },
  ): Promise<{ success: boolean; routeId: string; message: string }> => {
    return request<{ success: boolean; routeId: string; message: string }>(`/corporate/ops/routes/${routeId}/reassign`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  cancelRoute: async (
    routeId: string,
    payload: { reason: string },
  ): Promise<{ success: boolean; routeId: string; message: string }> => {
    return request<{ success: boolean; routeId: string; message: string }>(`/corporate/trips/routes/${routeId}/cancel`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  verifyStopOtp: async (
    routeId: string,
    stopId: string,
    otpCode: string,
  ): Promise<{ success: boolean; stopId: string; status: string }> => {
    return request(`/corporate/trips/routes/${routeId}/stops/${stopId}/verify-otp`, {
      method: 'POST',
      body: JSON.stringify({ otpCode }),
    });
  },

  markStopNoShow: async (
    routeId: string,
    stopId: string,
    reason?: string,
  ): Promise<{ success: boolean; stopId: string; status: string }> => {
    return request(`/corporate/trips/routes/${routeId}/stops/${stopId}/no-show`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason || 'Passenger not at pickup point within 5-min dwell buffer' }),
    });
  },

  // ── CVRPTW Route Optimization Engine ──
  optimizeShiftRoutes: async (payload: {
    tenantId: string;
    officeId: string;
    shiftDate: string;
    shiftTime: string;
    direction: 'LOGIN' | 'LOGOUT';
    vehicleCategory?: string;
    maxCapacity?: number;
    officeBufferMinutes?: number;
    maxRideTimeMinutes?: number;
  }): Promise<{ createdRoutesCount: number; assignedPassengers: number; unassignedCount: number }> => {
    return request(`/corporate/routes/optimize`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  planRoutesFromFile: async (formData: FormData): Promise<RoutePlanningResult> => {
    return request<RoutePlanningResult>(`/corporate/routes/plan-from-file`, {
      method: 'POST',
      body: formData,
    });
  },

  planRoutesStream: async (
    formData: FormData,
    onProgress: (evt: { stage: string; percent: number; message: string; plan?: RoutePlanningResult }) => void,
  ): Promise<RoutePlanningResult> => {
    const baseUrl = getApiBaseUrl();
    const token = getStoredOpsToken();
    const controller = new AbortController();
    const deadline = Date.now() + 30 * 60 * 1000;
    const awaitWithTimeout = async <T>(promise: Promise<T>, idleMs: number, idleMessage: string): Promise<T> => {
      const remainingMs = deadline - Date.now();
      if (remainingMs <= 0) {
        controller.abort();
        throw new Error('Route planning exceeded 30 minutes. Please retry with a smaller roster or contact support.');
      }

      let timeout: ReturnType<typeof setTimeout>;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          const timeoutError =
            remainingMs <= idleMs
              ? new Error('Route planning exceeded 30 minutes. Please retry with a smaller roster or contact support.')
              : new Error(idleMessage);
          reject(timeoutError);
          controller.abort();
        }, Math.min(idleMs, remainingMs));
      });

      try {
        return await Promise.race([promise, timeoutPromise]);
      } finally {
        clearTimeout(timeout!);
      }
    };
    const fetchRequest = fetch(`${baseUrl}/corporate/routes/plan-stream`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
      signal: controller.signal,
    }).catch((error: unknown) => {
      if (controller.signal.aborted) throw error;
      throw new Error(`Could not connect to the route-planning API at ${baseUrl}. Check that the API service is running.`, {
        cause: error,
      });
    });
    const res = await awaitWithTimeout(
      fetchRequest,
      2 * 60 * 1000,
      'No response received from the route-planning service for 2 minutes. Check the API connection and retry.',
    );

    if (!res.ok) {
      const errText = await res.text();
      let msg = res.statusText;
      try {
        const j = JSON.parse(errText);
        msg = j.message || msg;
      } catch {
        msg = errText || msg;
      }
      throw new Error(msg);
    }

    if (!res.body) {
      throw new Error('ReadableStream not supported on response body');
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let finalPlan: RoutePlanningResult | null = null;

    while (true) {
      const { done, value } = await awaitWithTimeout(
        reader.read(),
        90 * 1000,
        'Route-planning progress stopped for 90 seconds. The API may be unavailable; retry the calculation.',
      );
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n\r?\n/);
      buffer = lines.pop() || '';

      for (const block of lines) {
        if (!block.trim()) continue;
        const eventMatch = block.match(/event:\s*([^\n]+)/);
        const dataMatch = block.match(/data:\s*([^\n]+)/);
        const eventType = eventMatch ? eventMatch[1].trim() : 'message';
        if (dataMatch) {
          try {
            const data = JSON.parse(dataMatch[1].trim());
            onProgress(data);
            if (data.plan) {
              finalPlan = data.plan;
            }
            if (eventType === 'error') {
              throw new Error(data.message || 'Stream processing error');
            }
          } catch (e: any) {
            if (e.message && e.message !== 'Unexpected end of JSON input') {
              throw e;
            }
          }
        }
      }
    }

    if (!finalPlan) {
      throw new Error('Routing calculation completed without returning a valid route plan');
    }
    return finalPlan;
  },

  commitRoutePlan: async (payload: {
    tenantId: string;
    officeId: string;
    shiftDate: string;
    shiftTime: string;
    direction: 'LOGIN' | 'LOGOUT';
    vehicleCategory?: string;
    stopDwellMinutes?: number;
    plan: RoutePlanningResult;
  }): Promise<{ routesCreated: number; stopsCreated: number; routeIds?: string[]; employeesLinked?: number }> => {
    return request(`/corporate/routes/commit-plan`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  downloadSampleTemplate: (format: 'xlsx' | 'csv'): Promise<Blob> => {
    const query = new URLSearchParams({ format });
    return request<Blob>(`/corporate/routes/sample-template?${query.toString()}`, {
      responseType: 'blob',
    });
  },

  exportPlanExcel: async (plan: RoutePlanningResult): Promise<Blob> => {
    const baseUrl = getApiBaseUrl();
    const token = getStoredOpsToken();
    const res = await fetch(`${baseUrl}/corporate/routes/export-plan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(plan),
    });
    if (!res.ok) {
      throw new Error(`Export failed: ${res.statusText}`);
    }
    return res.blob();
  },

  // ── SOS Crisis Cockpit ──
  getSosAlerts: async (): Promise<SosAlertItem[]> => {
    return request<SosAlertItem[]>(`/corporate/safety/alerts`);
  },

  acknowledgeSosAlert: async (alertId: string): Promise<any> => {
    return request(`/corporate/safety/alerts/${alertId}/acknowledge`, { method: 'POST', body: JSON.stringify({}) });
  },

  investigateSosAlert: async (alertId: string): Promise<any> => {
    return request(`/corporate/safety/alerts/${alertId}/investigate`, { method: 'POST', body: JSON.stringify({}) });
  },

  resolveSosAlert: async (alertId: string, notes: string): Promise<any> => {
    return request(`/corporate/safety/alerts/${alertId}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ resolutionNotes: notes, status: 'RESOLVED' }),
    });
  },

  escalateSosAlert: async (alertId: string, notes = 'Escalated by OPS command centre'): Promise<any> => {
    return request(`/corporate/safety/alerts/${alertId}/escalate`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },
};
