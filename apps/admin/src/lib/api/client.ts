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
  BidListItem,
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
  CorridorAnalytics,
  OperationalReportData,
  SupportTicketItem,
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

  // Vendors & Users
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

  getUsers: (status?: string) => {
    const query = status && status !== 'ALL' ? `?verificationStatus=${status}` : '';
    return apiClient<VendorListItem[]>(`/admin/vendors${query}`);
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

  // Requirements & Dispatch
  getRequirements: (status?: string) => {
    const query = status && status !== 'ALL' ? `?status=${status}` : '';
    return apiClient<RequirementListItem[]>(`/requirements${query}`);
  },

  // Assignments & Match Orchestration
  getAssignments: (params?: { status?: string; search?: string; limit?: number; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.limit) searchParams.append('limit', String(params.limit));
    if (params?.page) searchParams.append('page', String(params.page));
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiClient<AssignmentItem[]>(`/assignments${query}`);
  },

  // Trips & Live Telemetry
  getTrips: (status?: string) => {
    const query = status && status !== 'ALL' ? `?status=${status}` : '';
    return apiClient<TripListItem[]>(`/trips${query}`);
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

  // Dynamic Pricing Engine
  getPricingTiers: () => apiClient<RateCard[]>('/pricing/tiers'),

  updatePricingTier: (vehicleType: string, data: Partial<RateCard>) =>
    apiClient<RateCard>(`/pricing/admin/${vehicleType}`, {
      method: 'PATCH',
      body: data,
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

  // Bids & Reverse Auction
  getRequirementBids: (requirementId: string) =>
    apiClient<BidListItem[]>(`/bids/requirement/${requirementId}`),

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
};
