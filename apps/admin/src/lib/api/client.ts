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
  DisputeListItem,
  CouponListItem,
  CouponRedemptionItem,
  CouponMetrics,
  CreateCouponPayload,
  UpdateCouponPayload,
  BlogPostItem,
  CreateBlogPostInput,
  UpdateBlogPostInput,
  BlogMetrics,
  AssignmentItem,
  AdminPaymentItem,
  AdminPaymentMetrics,
  RateCard,
  CreateRateCardPayload,
  SystemPolicyConfig,
  CorridorAnalytics,
  OperationalReportData,
  SupportTicketItem,
  NotificationCampaignItem,
  NotificationMetrics,
  AudienceFilter,
  BroadcastPushPayload,
  TestPushPayload,
  InAppNotificationItem,
  AudienceEstimateResult,
  ZonalRateCardResponse,
  ZonalLocality,
  ZonalRateCardVersion,
  UpdateZonalLocalityRequest,
  ZonalQuoteRequest,
  ZonalQuoteResponse,
  CorporatePayoutBatch,
  CorporatePayoutBatchListItem,
  CorporatePayoutReconciliation,
  CorporateClientRateCard,
  CorporateDriverRateCard,
  CreateCorporateClientRateCardInput,
  CreateCorporateDriverRateCardInput,
  CorporateInvoiceDispute,
  CorporateCreditNote,
  CorporateSupportTicket,
  CorporateTicketStatus,
  CorporateTicketPriority,
  CorporateSosAlert,
  CorporateSosStatus,
} from './types';

export function getApiBaseUrl(): string {
  // Use explicit environment variable if set
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    const port = window.location.port;

    // In production domain behind reverse proxy (admin.adhocx.com), use relative /api/v1
    if (host.includes('adhocx.com')) {
      return '/api/v1';
    }

    // Direct port 7002 access, localhost, or direct IP access -> route to backend API on port 7001
    if (port === '7002' || host === 'localhost' || host === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
      const protocol = window.location.protocol;
      return `${protocol}//${host}:7001/api/v1`;
    }

    return `${window.location.origin}/api/v1`;
  }

  return 'https://api.adhocx.com/api/v1';
}

export { resolveDocumentUrl, handleDocumentImageError } from './resolveDocumentUrl';

export function getStoredAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('adhocx_admin_token');
}

export function getStoredAdminUser(): any | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('adhocx_admin_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getStoredAdminRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('adhocx_admin_refresh_token');
}

export function updateAdminTokens(token: string, refreshToken?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('adhocx_admin_token', token);
  if (refreshToken) localStorage.setItem('adhocx_admin_refresh_token', refreshToken);
  document.cookie = `adhocx_admin_token=${encodeURIComponent(token)}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
}

export function setAdminSession(token: string, user: any, refreshToken?: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('adhocx_admin_token', token);
  if (refreshToken) localStorage.setItem('adhocx_admin_refresh_token', refreshToken);
  localStorage.setItem('adhocx_admin_user', JSON.stringify(user));
  // Synchronize cookie for Next.js server-side middleware (7 days)
  document.cookie = `adhocx_admin_token=${encodeURIComponent(token)}; path=/; max-age=${7 * 24 * 3600}; SameSite=Lax`;
}

export function clearAdminSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('adhocx_admin_token');
  localStorage.removeItem('adhocx_admin_refresh_token');
  localStorage.removeItem('adhocx_admin_user');
  document.cookie = 'adhocx_admin_token=; path=/; max-age=0; SameSite=Lax';
}

let isAdminRefreshing = false;
let adminRefreshSubscribers: ((token: string | null) => void)[] = [];

function subscribeAdminRefresh(cb: (token: string | null) => void) {
  adminRefreshSubscribers.push(cb);
}

function onAdminRefreshed(token: string | null) {
  adminRefreshSubscribers.forEach((cb) => cb(token));
  adminRefreshSubscribers = [];
}

async function refreshAdminAccessToken(): Promise<string | null> {
  const refreshToken = getStoredAdminRefreshToken();
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
      updateAdminTokens(data.accessToken, data.refreshToken || refreshToken);
      return data.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  token?: string;
  /**
   * When true, a 403 is thrown as an ApiError (so the screen can show its "not authorised" state or a
   * maker-checker refusal) instead of clearing the session. A 401 still signs the admin out.
   */
  allowForbidden?: boolean;
  _retry?: boolean;
};

/**
 * API client for communicating with the AdhocX backend.
 * Handles auth headers, JSON serialization, and error mapping.
 */
export async function apiClient<T = unknown>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = 'GET', body, headers = {}, token, allowForbidden = false } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  const activeToken =
    token ||
    (typeof window !== 'undefined'
      ? localStorage.getItem('adhocx_admin_token')
      : null);
  if (activeToken) {
    requestHeaders['Authorization'] = `Bearer ${activeToken}`;
  }

  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${endpoint}`, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    // Attempt silent refresh token rotation on 401 before signing out
    if (response.status === 401 && !endpoint.includes('/auth/') && !options._retry) {
      if (!isAdminRefreshing) {
        isAdminRefreshing = true;
        const newToken = await refreshAdminAccessToken();
        isAdminRefreshing = false;

        if (newToken) {
          onAdminRefreshed(newToken);
          return apiClient<T>(endpoint, { ...options, token: newToken, _retry: true });
        } else {
          onAdminRefreshed(null);
        }
      } else {
        const queuedToken = await new Promise<string | null>((resolve) => subscribeAdminRefresh(resolve));
        if (queuedToken) {
          return apiClient<T>(endpoint, { ...options, token: queuedToken, _retry: true });
        }
      }
    }

    if (typeof window !== 'undefined' && (response.status === 401 || (response.status === 403 && !allowForbidden))) {
      // Do not trigger global redirect if user is attempting login
      if (!endpoint.includes('/auth/admin/login')) {
        clearAdminSession();
        if (!window.location.pathname.startsWith('/login')) {
          const redirect = encodeURIComponent(window.location.pathname);
          window.location.href = `/login?redirect=${redirect}`;
        }
      }
    }
    const errorBody = await response.json().catch(() => ({}));
    const message =
      (Array.isArray(errorBody.error?.details) ? errorBody.error.details.join(', ') : null) ||
      errorBody.error?.message ||
      (Array.isArray(errorBody.message) ? errorBody.message.join(', ') : errorBody.message) ||
      `Request failed with status ${response.status}`;
    throw new ApiError(
      response.status,
      message,
      errorBody,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const json = await response.json();
  if (json && typeof json === 'object' && 'data' in json && 'success' in json && (json as any).success === true) {
    return (json as any).data as T;
  }

  return json as T;
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
 * Convenience methods for common admin operations.
 */
export const adminApi = {
  // Operational Metrics
  getMetrics: () => apiClient<AdminMetrics>('/admin/metrics'),

  // Drivers & KYC
  getDrivers: (status?: string) => {
    const query = status && status !== 'ALL' ? `?verificationStatus=${status}` : '';
    return apiClient<any>(`/admin/drivers${query}`).then((res) => {
      if (Array.isArray(res)) return res as DriverListItem[];
      if (res && Array.isArray(res.items)) return res.items as DriverListItem[];
      return [] as DriverListItem[];
    });
  },

  getDriverDetails: (id: string) => apiClient<DriverDetail>(`/admin/drivers/${id}`),

  updateDriver: (id: string, data: { fullName?: string; phone?: string; vehiclePlate?: string; vehicleModel?: string; vehicleType?: string }) =>
    apiClient(`/admin/drivers/${id}`, {
      method: 'PATCH',
      body: data,
    }),

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

  clearDriverCooldown: (id: string) =>
    apiClient(`/admin/drivers/${id}/clear-cooldown`, {
      method: 'POST',
    }),

  // Vendors & Users
  getVendors: (status?: string) => {
    const query = status && status !== 'ALL' ? `?verificationStatus=${status}` : '';
    return apiClient<any>(`/admin/vendors${query}`).then((res) => {
      if (Array.isArray(res)) return res as VendorListItem[];
      if (res && Array.isArray(res.items)) return res.items as VendorListItem[];
      return [] as VendorListItem[];
    });
  },

  updateVendor: (id: string, data: { organizationName?: string; fullName?: string; phone?: string; gstNumber?: string; address?: string }) =>
    apiClient(`/admin/vendors/${id}`, {
      method: 'PATCH',
      body: data,
    }),

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

  deleteVendor: (id: string) =>
    apiClient(`/admin/vendors/${id}`, {
      method: 'DELETE',
    }),

  getUsers: (status?: string) => {
    const query = status && status !== 'ALL' ? `?verificationStatus=${status}` : '';
    return apiClient<any>(`/admin/vendors${query}`).then((res) => {
      if (Array.isArray(res)) return res as VendorListItem[];
      if (res && Array.isArray(res.items)) return res.items as VendorListItem[];
      return [] as VendorListItem[];
    });
  },

  verifyUser: (id: string, notes?: string) =>
    apiClient(`/admin/vendors/${id}/verify`, {
      method: 'POST',
      body: { notes: notes || 'Verified by Admin' },
    }),

  rejectUser: (id: string, reason: string) =>
    apiClient(`/admin/vendors/${id}/reject`, {
      method: 'POST',
      body: { reason },
    }),

  deleteUser: (id: string) =>
    apiClient(`/admin/users/${id}`, {
      method: 'DELETE',
    }),

  // Requirements & Dispatch
  getRequirements: (status?: string) => {
    const query = status && status !== 'ALL' ? `?status=${status}` : '';
    return apiClient<any>(`/requirements${query}`).then((res) => {
      const raw = Array.isArray(res) ? res : (res?.items || []);
      return raw.map((r: any) => ({
        id: r.id,
        vendorName: r.vendorName || r.vendor?.organizationName || 'Corporate Client',
        fulfillmentMode: r.fulfillmentMode,
        vehicleType: r.vehicleType,
        quantity: r.quantity,
        assignedQuantity: r.assignedQuantity ?? 0,
        pickupAddress: r.pickupAddress || r.pickupLocation?.address || 'Pickup Location',
        dropAddress: r.dropAddress || r.dropLocation?.address || 'Drop Location',
        reportingTime: r.reportingTime,
        status: r.status,
        vendorRate: r.ratePerVehicle ?? r.vendorRate ?? r.suggestedBudget ?? 0,
        ratePerVehicle: r.ratePerVehicle ?? r.vendorRate ?? r.suggestedBudget ?? 0,
        suggestedBudget: r.suggestedBudget,
        zonalQuote: r.zonalQuote ?? undefined,
        createdAt: r.createdAt,
      })) as RequirementListItem[];
    });
  },

  // Assignments & Match Orchestration
  getAssignments: (params?: { status?: string; search?: string; limit?: number; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.limit) searchParams.append('limit', String(params.limit));
    if (params?.page) searchParams.append('page', String(params.page));
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiClient<any>(`/assignments${query}`).then((res) => {
      if (Array.isArray(res)) return res as AssignmentItem[];
      if (res && Array.isArray(res.items)) return res.items as AssignmentItem[];
      return [] as AssignmentItem[];
    });
  },

  // Trips & Live Telemetry
  getTrips: (status?: string) => {
    const query = status && status !== 'ALL' ? `?status=${status}` : '';
    return apiClient<any>(`/trips${query}`).then((res) => {
      if (Array.isArray(res)) return res as TripListItem[];
      if (res && Array.isArray(res.items)) return res.items as TripListItem[];
      return [] as TripListItem[];
    });
  },

  getTripEvents: (tripId: string) => apiClient<TripEvent[]>(`/trips/${tripId}/events`),

  // Payments, Escrow Ledger & Metrics
  getAdminPayments: (params?: { status?: string; type?: string; vendorId?: string; limit?: number; offset?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params?.type && params.type !== 'ALL') searchParams.append('type', params.type);
    if (params?.vendorId) searchParams.append('vendorId', params.vendorId);
    if (params?.limit) searchParams.append('limit', String(params.limit));
    if (params?.offset) searchParams.append('offset', String(params.offset));
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiClient<{ items: AdminPaymentItem[]; total: number }>(`/payments/admin/all${query}`);
  },

  getAdminPaymentMetrics: () => apiClient<AdminPaymentMetrics>('/payments/admin/metrics'),

  // Dynamic Pricing Engine & System Policy Configuration
  getPricingTiers: () => apiClient<RateCard[]>('/pricing/tiers'),

  createPricingTier: (data: CreateRateCardPayload) =>
    apiClient<RateCard>('/pricing/admin/tiers', {
      method: 'POST',
      body: data,
    }),

  updatePricingTier: (vehicleType: string, data: Partial<RateCard>) =>
    apiClient<RateCard>(`/pricing/admin/${vehicleType}`, {
      method: 'PATCH',
      body: data,
    }),

  deletePricingTier: (vehicleType: string) =>
    apiClient<{ success: boolean; message: string }>(`/pricing/admin/tiers/${vehicleType}`, {
      method: 'DELETE',
    }),

  getPolicyConfig: () => apiClient<SystemPolicyConfig>('/pricing/policy-config'),

  updatePolicyConfig: (data: Partial<SystemPolicyConfig>) =>
    apiClient<SystemPolicyConfig>('/pricing/admin/policy-config', {
      method: 'PATCH',
      body: data,
    }),

  // Corporate zonal rate card (Hyderabad): active cards, quote simulator, versions and locality review
  getZonalVendorRateCard: () => apiClient<ZonalRateCardResponse>('/pricing/zonal/vendor-card'),

  getZonalDriverRateCard: () => apiClient<ZonalRateCardResponse>('/pricing/zonal/driver-card'),

  calculateZonalQuote: (payload: ZonalQuoteRequest) =>
    apiClient<ZonalQuoteResponse>('/pricing/zonal/quote', {
      method: 'POST',
      body: payload,
    }),

  getZonalLocalities: () => apiClient<ZonalLocality[]>('/pricing/zonal/localities'),

  listZonalRateVersions: () => apiClient<ZonalRateCardVersion[]>('/pricing/zonal/admin/versions'),

  publishZonalRateVersion: (id: string, reason: string) =>
    apiClient<{ id: string; version: string; status: string; previousVersion: string | null }>(
      `/pricing/zonal/admin/versions/${id}/publish`,
      { method: 'POST', body: { reason } },
    ),

  updateZonalLocality: (localityId: string, payload: UpdateZonalLocalityRequest) =>
    apiClient<ZonalLocality>(`/pricing/zonal/admin/localities/${encodeURIComponent(localityId)}`, {
      method: 'PATCH',
      body: payload,
    }),

  // Operational Reports & Corridor Intelligence
  getCorridorAnalytics: () => apiClient<CorridorAnalytics[]>('/admin/reports/corridors'),

  getOperationalReports: () => apiClient<OperationalReportData>('/admin/reports/analytics'),

  // Unified Helpdesk & Support Tickets
  getSupportTickets: (params?: { status?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiClient<SupportTicketItem[]>(`/admin/support/tickets${query}`);
  },

  resolveSupportTicket: (id: string, data: { status: 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED'; notes?: string }) =>
    apiClient<SupportTicketItem>(`/admin/support/tickets/${id}/resolve`, {
      method: 'POST',
      body: data,
    }),

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

  // Disputes & Support Resolution
  getDisputes: (status?: string) => {
    const query = status && status !== 'ALL' ? `?status=${status}` : '';
    return apiClient<DisputeListItem[]>(`/disputes${query}`);
  },

  resolveDispute: (id: string, data: { status: 'RESOLVED' | 'REJECTED'; resolutionText: string }) =>
    apiClient<DisputeListItem>(`/disputes/${id}/resolve`, {
      method: 'PATCH',
      body: data,
    }),

  // Platform Audit Logs
  getAuditLogs: (limit = 50) => apiClient<AuditLogItem[]>(`/admin/audit-logs?limit=${limit}`),

  // Promotional Coupons & Discounts
  getCouponMetrics: () => apiClient<CouponMetrics>('/admin/coupons/metrics'),

  getCoupons: (status?: string, search?: string, applicableTo?: string) => {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    if (search && search.trim().length > 0) params.append('search', search.trim());
    if (applicableTo && applicableTo !== 'ALL') params.append('applicableTo', applicableTo);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient<CouponListItem[]>(`/admin/coupons${query}`);
  },

  getCouponById: (id: string) => apiClient<CouponListItem>(`/admin/coupons/${id}`),

  createCoupon: (payload: CreateCouponPayload) =>
    apiClient<CouponListItem>('/admin/coupons', {
      method: 'POST',
      body: payload,
    }),

  updateCoupon: (id: string, payload: UpdateCouponPayload) =>
    apiClient<CouponListItem>(`/admin/coupons/${id}`, {
      method: 'PATCH',
      body: payload,
    }),

  deleteCoupon: (id: string) =>
    apiClient<{ success: boolean; message: string }>(`/admin/coupons/${id}`, {
      method: 'DELETE',
    }),

  getCouponRedemptions: (id: string) =>
    apiClient<CouponRedemptionItem[]>(`/admin/coupons/${id}/redemptions`),

  // Blog & SEO Content Hub Management
  getBlogs: (params?: { status?: string; category?: string; search?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params?.category && params.category !== 'ALL') searchParams.append('category', params.category);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.limit) searchParams.append('limit', String(params.limit));
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiClient<{ items: BlogPostItem[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
      `/admin/blogs${query}`,
    );
  },

  getBlogMetrics: () => apiClient<BlogMetrics>('/admin/blogs/metrics'),

  getBlog: (id: string) => apiClient<BlogPostItem>(`/admin/blogs/${id}`),

  createBlog: (data: CreateBlogPostInput) =>
    apiClient<BlogPostItem>('/admin/blogs', {
      method: 'POST',
      body: data,
    }),

  updateBlog: (id: string, data: UpdateBlogPostInput) =>
    apiClient<BlogPostItem>(`/admin/blogs/${id}`, {
      method: 'PATCH',
      body: data,
    }),

  deleteBlog: (id: string) =>
    apiClient<{ success: boolean; message: string }>(`/admin/blogs/${id}`, {
      method: 'DELETE',
    }),

  // ── Push Notifications & Campaign Operations ──
  getNotificationMetrics: () =>
    apiClient<NotificationMetrics>('/notifications/admin/metrics'),

  getNotificationCampaigns: (page = 1, limit = 20) =>
    apiClient<{ campaigns: NotificationCampaignItem[]; total: number }>(
      `/notifications/admin/campaigns?page=${page}&limit=${limit}`,
    ),

  broadcastPushNotification: (data: BroadcastPushPayload) =>
    apiClient<{ campaignId: string; totalTargetedUsers: number; totalTargetedDevices: number; successCount: number; failureCount: number; status: string }>(
      '/notifications/admin/broadcast',
      {
        method: 'POST',
        body: data,
      },
    ),

  estimateNotificationAudience: (filter: AudienceFilter) =>
    apiClient<AudienceEstimateResult>('/notifications/admin/audience-estimate', {
      method: 'POST',
      body: filter,
    }),

  sendTestPushNotification: (data: TestPushPayload) =>
    apiClient<{ success: boolean; totalTokens: number; successCount: number; failureCount: number }>(
      '/notifications/admin/test-push',
      {
        method: 'POST',
        body: data,
      },
    ),

  getInAppNotifications: (query?: { page?: number; limit?: number; unreadOnly?: boolean }) => {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', String(query.page));
    if (query?.limit) params.append('limit', String(query.limit));
    if (query?.unreadOnly) params.append('unreadOnly', String(query.unreadOnly));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return apiClient<{ notifications: InAppNotificationItem[]; unreadCount: number; total: number }>(
      `/notifications/in-app${qs}`,
    );
  },

  markInAppNotificationRead: (id: string) =>
    apiClient<{ success: boolean }>(`/notifications/in-app/${id}/read`, {
      method: 'PATCH',
    }),

  markAllInAppNotificationsRead: () =>
    apiClient<{ success: boolean }>('/notifications/in-app/read-all', {
      method: 'PATCH',
    }),

  // ── Administrative Authentication & Session ──
  loginAdmin: (credentials: { identifier: string; password: string }) =>
    apiClient<{
      accessToken?: string;
      refreshToken?: string;
      user?: any;
      requiresMfa?: boolean;
      mfaType?: string;
      mfaSessionToken?: string;
      maskedDestination?: string;
      expiresInSeconds?: number;
      message?: string;
    }>('/auth/admin/login', {
      method: 'POST',
      body: credentials,
    }),

  verifyAdminMfa: (dto: { mfaSessionToken: string; mfaCode: string }) =>
    apiClient<{ accessToken: string; refreshToken: string; user: any }>('/auth/admin/mfa-verify', {
      method: 'POST',
      body: dto,
    }),

  verifyAdminSession: () =>
    apiClient<{ valid: boolean; user: any }>('/auth/admin/verify'),

  // Corporate ETS
  getCorporateTenants: (params: { search?: string; page?: number; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    q.set('page', String(params.page ?? 1));
    q.set('limit', String(params.limit ?? 100));
    return apiClient<{
      items: { id: string; code: string; name: string; status: string }[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/corporate/tenants?${q.toString()}`);
  },

  getCorporateRoutes: (params: {
    tenantId: string;
    shiftDate?: string;
    shiftTime?: string;
    direction?: 'LOGIN' | 'LOGOUT';
    limit?: number;
    offset?: number;
  }) => {
    const q = new URLSearchParams({ tenantId: params.tenantId });
    if (params.shiftDate) q.set('shiftDate', params.shiftDate);
    if (params.shiftTime) q.set('shiftTime', params.shiftTime);
    if (params.direction) q.set('direction', params.direction);
    if (params.limit) q.set('limit', String(params.limit));
    if (params.offset) q.set('offset', String(params.offset));
    return apiClient<any[]>(`/corporate/routes?${q.toString()}`);
  },

  getCorporateRoute: (routeId: string) => apiClient<any>(`/corporate/routes/${routeId}`),

  /** Manual "Start": dispatch now. Returns the dispatch outcome (OFFERED, NO_DRIVERS_FOUND, ...). */
  startCorporateRouteDispatch: (routeId: string) =>
    apiClient<{
      routeId: string;
      status: 'OFFERED' | 'NO_DRIVERS_FOUND' | 'ALL_DRIVERS_BUSY' | 'ALREADY_ASSIGNED';
      offeredDriverName?: string;
      searchRadiusKm?: number;
    }>(`/corporate/dispatch/routes/${routeId}/start-now`, { method: 'POST', body: {} }),

  // ── Corporate ETS: driver payout batches (maker -> checker -> provider) ──
  // `allowForbidden`: a 403 here is a maker-checker refusal or a missing role, shown in place;
  // it must not sign the admin out.
  listCorporatePayoutBatches: (params: { status?: string; page?: number; limit?: number } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    q.set('page', String(params.page ?? 1));
    q.set('limit', String(params.limit ?? 20));
    return apiClient<{
      items: CorporatePayoutBatchListItem[];
      pagination: { total: number; page: number; limit: number; totalPages: number };
    }>(`/corporate/billing/payouts/batches?${q.toString()}`, { allowForbidden: true });
  },

  getCorporatePayoutBatch: (id: string) =>
    apiClient<CorporatePayoutBatch>(`/corporate/billing/payouts/batches/${id}`, { allowForbidden: true }),

  /** Maker step. `idempotencyKey` makes a double click return the same batch. */
  createCorporatePayoutBatch: (dto: { driverIds?: string[]; cutoffDate?: string; idempotencyKey: string }) =>
    apiClient<CorporatePayoutBatch>('/corporate/billing/payouts/batches', {
      method: 'POST',
      body: dto,
      allowForbidden: true,
    }),

  /** Checker step: the API refuses (403) when the approver created the batch. */
  approveCorporatePayoutBatch: (id: string) =>
    apiClient<CorporatePayoutBatch>(`/corporate/billing/payouts/batches/${id}/approve`, {
      method: 'POST',
      body: {},
      allowForbidden: true,
    }),

  /** Sends an APPROVED batch (or retries its FAILED payouts). Never marks anything PAID. */
  submitCorporatePayoutBatch: (id: string) =>
    apiClient<
      CorporatePayoutBatch & { submitted: { payoutId: string; driverId: string; idempotencyKey: string; result: string }[] }
    >(`/corporate/billing/payouts/batches/${id}/submit`, { method: 'POST', body: {}, allowForbidden: true }),

  getCorporatePayoutReconciliation: (from: string, to: string) =>
    apiClient<CorporatePayoutReconciliation>(
      `/corporate/billing/reconciliations?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { allowForbidden: true },
    ),

  // ── Corporate ETS: versioned rate cards (no edit: a change is a new version) ──
  listCorporateClientRateCards: (params: { tenantId?: string; vehicleCategory?: string; includeRetired?: boolean } = {}) => {
    const q = new URLSearchParams();
    if (params.tenantId) q.set('tenantId', params.tenantId);
    if (params.vehicleCategory) q.set('vehicleCategory', params.vehicleCategory);
    if (params.includeRetired) q.set('includeRetired', 'true');
    return apiClient<CorporateClientRateCard[]>(`/corporate/billing/rate-cards/corporate?${q.toString()}`, {
      allowForbidden: true,
    });
  },

  createCorporateClientRateCard: (dto: CreateCorporateClientRateCardInput) =>
    apiClient<CorporateClientRateCard>('/corporate/billing/rate-cards/corporate', {
      method: 'POST',
      body: dto,
      allowForbidden: true,
    }),

  retireCorporateClientRateCard: (id: string, effectiveTo?: string) =>
    apiClient<CorporateClientRateCard>(`/corporate/billing/rate-cards/corporate/${id}/retire`, {
      method: 'POST',
      body: effectiveTo ? { effectiveTo } : {},
      allowForbidden: true,
    }),

  listCorporateDriverRateCards: (params: { vehicleCategory?: string; includeRetired?: boolean } = {}) => {
    const q = new URLSearchParams();
    if (params.vehicleCategory) q.set('vehicleCategory', params.vehicleCategory);
    if (params.includeRetired) q.set('includeRetired', 'true');
    return apiClient<CorporateDriverRateCard[]>(`/corporate/billing/rate-cards/driver?${q.toString()}`, {
      allowForbidden: true,
    });
  },

  createCorporateDriverRateCard: (dto: CreateCorporateDriverRateCardInput) =>
    apiClient<CorporateDriverRateCard>('/corporate/billing/rate-cards/driver', {
      method: 'POST',
      body: dto,
      allowForbidden: true,
    }),

  retireCorporateDriverRateCard: (id: string, effectiveTo?: string) =>
    apiClient<CorporateDriverRateCard>(`/corporate/billing/rate-cards/driver/${id}/retire`, {
      method: 'POST',
      body: effectiveTo ? { effectiveTo } : {},
      allowForbidden: true,
    }),

  // ── Corporate ETS: invoice disputes and credit notes ──
  listCorporateInvoiceDisputes: (params: { tenantId?: string; status?: string; invoiceId?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.tenantId) q.set('tenantId', params.tenantId);
    if (params.status) q.set('status', params.status);
    if (params.invoiceId) q.set('invoiceId', params.invoiceId);
    return apiClient<CorporateInvoiceDispute[]>(`/corporate/billing/disputes?${q.toString()}`, { allowForbidden: true });
  },

  /** Accept issues an immutable credit note; `approvedAmountPaise` defaults to the claimed amount. */
  acceptCorporateInvoiceDispute: (id: string, dto: { approvedAmountPaise?: string; note?: string }) =>
    apiClient<unknown>(`/corporate/billing/disputes/${id}/accept`, { method: 'POST', body: dto, allowForbidden: true }),

  rejectCorporateInvoiceDispute: (id: string, note: string) =>
    apiClient<CorporateInvoiceDispute>(`/corporate/billing/disputes/${id}/reject`, {
      method: 'POST',
      body: { note },
      allowForbidden: true,
    }),

  listCorporateCreditNotes: (params: { tenantId?: string; invoiceId?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.tenantId) q.set('tenantId', params.tenantId);
    if (params.invoiceId) q.set('invoiceId', params.invoiceId);
    return apiClient<CorporateCreditNote[]>(`/corporate/billing/credit-notes?${q.toString()}`, { allowForbidden: true });
  },

  // ── Corporate ETS: support desk (all tenants for ADMIN) ──
  listCorporateSupportTickets: (
    params: {
      tenantId?: string;
      status?: CorporateTicketStatus;
      priority?: CorporateTicketPriority;
      limit?: number;
      offset?: number;
    } = {},
  ) => {
    const q = new URLSearchParams();
    if (params.tenantId) q.set('tenantId', params.tenantId);
    if (params.status) q.set('status', params.status);
    if (params.priority) q.set('priority', params.priority);
    q.set('limit', String(params.limit ?? 100));
    if (params.offset) q.set('offset', String(params.offset));
    return apiClient<CorporateSupportTicket[]>(`/corporate/support/tickets?${q.toString()}`, { allowForbidden: true });
  },

  /** Only the next status is legal (OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED); anything else is 409. */
  updateCorporateSupportTicketStatus: (id: string, status: CorporateTicketStatus, notes?: string) =>
    apiClient<CorporateSupportTicket>(`/corporate/support/tickets/${id}/status`, {
      method: 'PATCH',
      body: notes ? { status, notes } : { status },
      allowForbidden: true,
    }),

  // ── Corporate ETS: SOS command centre lifecycle ──
  listCorporateSosAlerts: (params: { status?: CorporateSosStatus; tenantId?: string; routeId?: string } = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set('status', params.status);
    if (params.tenantId) q.set('tenantId', params.tenantId);
    if (params.routeId) q.set('routeId', params.routeId);
    return apiClient<CorporateSosAlert[]>(`/corporate/safety/alerts?${q.toString()}`, { allowForbidden: true });
  },

  acknowledgeCorporateSosAlert: (id: string, notes?: string, adminName?: string) =>
    apiClient<CorporateSosAlert>(`/corporate/safety/alerts/${id}/acknowledge`, {
      method: 'POST',
      body: { ...(notes ? { notes } : {}), ...(adminName ? { adminName } : {}) },
      allowForbidden: true,
    }),

  investigateCorporateSosAlert: (id: string, notes?: string) =>
    apiClient<CorporateSosAlert>(`/corporate/safety/alerts/${id}/investigate`, {
      method: 'POST',
      body: notes ? { notes } : {},
      allowForbidden: true,
    }),

  /** notes are required by the API. */
  escalateCorporateSosAlert: (id: string, notes: string) =>
    apiClient<CorporateSosAlert>(`/corporate/safety/alerts/${id}/escalate`, {
      method: 'POST',
      body: { notes },
      allowForbidden: true,
    }),

  /** notes are required by the API; outcome RESOLVED (default) or FALSE_ALARM. */
  closeCorporateSosAlert: (id: string, notes: string, outcome: 'RESOLVED' | 'FALSE_ALARM' = 'RESOLVED') =>
    apiClient<CorporateSosAlert>(`/corporate/safety/alerts/${id}/close`, {
      method: 'POST',
      body: { notes, outcome },
      allowForbidden: true,
    }),

  logoutAdmin: async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' });
    } catch (_) {}
    clearAdminSession();
  },
};

