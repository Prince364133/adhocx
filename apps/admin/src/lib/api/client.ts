import {
  AdminMetrics,
  DriverListItem,
  DriverDetail,
  VendorListItem,
  RequirementListItem,
  TripListItem,
  TripEvent,
  SettlementListItem,
  AuditLogItem,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7001/api/v1';


type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
};

/**
 * API client for communicating with the AdhocX backend.
 * Handles auth headers, JSON serialization, and error mapping.
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers = {}, token } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const activeToken = token || (typeof window !== 'undefined' ? localStorage.getItem('adhocx_admin_token') : undefined);
  if (activeToken) {
    requestHeaders['Authorization'] = `Bearer ${activeToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new ApiError(
      response.status,
      errorBody.message || `Request failed with status ${response.status}`,
      errorBody,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
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

/**
 * Typed Administrative API Services
 */
export const adminApi = {
  // Operational Metrics
  getMetrics: () => apiClient<AdminMetrics>('/admin/metrics'),

  // Drivers & KYC
  getDrivers: (status?: string) => {
    const query = status && status !== 'ALL' ? `?verificationStatus=${status}` : '';
    return apiClient<DriverListItem[]>(`/admin/drivers${query}`);
  },

  getDriverDetails: (id: string) => apiClient<DriverDetail>(`/admin/drivers/${id}`),

  verifyDriver: (id: string, notes?: string) =>
    apiClient(`/admin/drivers/${id}/verify`, {
      method: 'POST',
      body: { notes: notes || 'Verified by Admin' },
    }),

  rejectDriver: (id: string, reason: string) =>
    apiClient(`/admin/drivers/${id}/reject`, {
      method: 'POST',
      body: { reason },
    }),

  suspendDriver: (id: string, reason: string) =>
    apiClient(`/admin/drivers/${id}/suspend`, {
      method: 'POST',
      body: { reason },
    }),

  reactivateDriver: (id: string, notes?: string) =>
    apiClient(`/admin/drivers/${id}/reactivate`, {
      method: 'POST',
      body: { notes: notes || 'Reactivated by Admin' },
    }),

  // Vendors
  getVendors: (status?: string) => {
    const query = status && status !== 'ALL' ? `?verificationStatus=${status}` : '';
    return apiClient<VendorListItem[]>(`/admin/vendors${query}`);
  },

  verifyVendor: (id: string, notes?: string) =>
    apiClient(`/admin/vendors/${id}/verify`, {
      method: 'POST',
      body: { notes: notes || 'Verified by Admin' },
    }),

  rejectVendor: (id: string, reason: string) =>
    apiClient(`/admin/vendors/${id}/reject`, {
      method: 'POST',
      body: { reason },
    }),

  // Requirements & Dispatch
  getRequirements: (status?: string) => {
    const query = status && status !== 'ALL' ? `?status=${status}` : '';
    return apiClient<RequirementListItem[]>(`/requirements${query}`);
  },

  // Trips & Live Telemetry
  getTrips: (status?: string) => {
    const query = status && status !== 'ALL' ? `?status=${status}` : '';
    return apiClient<TripListItem[]>(`/trips${query}`);
  },

  getTripEvents: (tripId: string) => apiClient<TripEvent[]>(`/trips/${tripId}/events`),

  // Settlements & Payouts
  getSettlements: (status?: string) => {
    const query = status && status !== 'ALL' ? `?status=${status}` : '';
    return apiClient<SettlementListItem[]>(`/settlements${query}`);
  },

  processSettlement: (id: string, data: { status: 'SETTLED' | 'FAILED'; transactionRef?: string; failureReason?: string }) =>
    apiClient(`/settlements/${id}/process`, {
      method: 'POST',
      body: data,
    }),

  // Platform Audit Logs
  getAuditLogs: (limit = 50) => apiClient<AuditLogItem[]>(`/admin/audit-logs?limit=${limit}`),
};
