import {
  AdminMetrics,
  DriverListItem,
  DriverDetail,
  VendorListItem,
  UserListItem,
  CorporateVendorDetail,
  UserProfileDetail,
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
  VehicleCategory,
  CreateVehicleCategoryPayload,
  UpdateVehicleCategoryPayload,
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
  DistancePricingPlan,
  CreateDistancePricingPlanPayload,
  CreatePricingSlabInput,
  PricingAuditItem,
  DistanceSimulationResult,
  FinanceDashboardData,
  FinanceTransactionItem,
  DriverFinancialHistoryDetail,
} from './types';

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    const port = window.location.port;

    // Direct port 7002 access, localhost, or direct loopback access -> route to local backend API on port 7001
    if (port === '7002' || host === 'localhost' || host === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
      const protocol = window.location.protocol;
      return `${protocol}//${host}:7001/api/v1`;
    }

    // In production domain behind reverse proxy (admin.adhocx.com), use relative /api/v1
    if (host.includes('adhocx.com')) {
      return '/api/v1';
    }

    // Use explicit environment variable if set on custom domain
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL;
    }

    return `${window.location.origin}/api/v1`;
  }

  // Use explicit environment variable if set
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  return 'http://localhost:7001/api/v1';
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
  document.cookie = 'adhocx_admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; max-age=0; SameSite=Lax';
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
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (netErr: any) {
    if (netErr.name === 'AbortError') {
      throw new ApiError(504, 'Connection timed out while communicating with AdhocX API server (http://localhost:7001).');
    }
    throw new ApiError(503, 'Unable to connect to AdhocX API server (http://localhost:7001). Please verify the backend service is running.');
  } finally {
    clearTimeout(timeoutId);
  }

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
      // Do not trigger global redirect if user is attempting login or verifying session in AdminShell
      if (!endpoint.includes('/auth/admin/login')) {
        clearAdminSession();
        if (!window.location.pathname.startsWith('/login') && !endpoint.includes('/auth/admin/verify')) {
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

  // Corporate Vendors & Platform Users
  getVendors: (status?: string, search?: string) => {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('verificationStatus', status);
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient<any>(`/admin/vendors${query}`).then((res) => {
      if (Array.isArray(res)) return res as VendorListItem[];
      if (res && Array.isArray(res.items)) return res.items as VendorListItem[];
      return [] as VendorListItem[];
    });
  },

  getVendorDetails: async (id: string): Promise<CorporateVendorDetail> => {
    try {
      const res = await apiClient<any>(`/admin/vendors/${id}`);
      if (res && res.performanceAnalytics && Array.isArray(res.orders)) {
        return res as CorporateVendorDetail;
      }

      // If backend returned basic vendor data, synthesize enriched dossier
      const rawVendor = res || {};
      const allReqs = await apiClient<any>('/requirements').catch(() => []);
      const reqList: any[] = Array.isArray(allReqs) ? allReqs : (allReqs?.items || []);
      const vendorReqs = reqList.filter((r: any) => r.vendorId === id || r.vendor?.id === id);

      let completedOrders = 0;
      let pendingOrders = 0;
      let cancelledOrders = 0;
      let totalRevenue = 0;

      const orders = vendorReqs.map((req: any) => {
        const amount = Number(req.totalAmount || req.ratePerVehicle || 0);
        if (req.status === 'COMPLETED' || req.status === 'FULFILLED') {
          completedOrders++;
          totalRevenue += amount;
        } else if (req.status === 'POSTED' || req.status === 'DISPATCHING' || req.status === 'PARTIALLY_FULFILLED' || req.status === 'ASSIGNED') {
          pendingOrders++;
        } else if (req.status === 'CANCELLED' || req.status === 'NO_DRIVER_AVAILABLE') {
          cancelledOrders++;
        }

        const assignedDriver =
          req.trips?.[0]?.driver?.fullName ||
          req.assignments?.[0]?.driver?.fullName ||
          'Not Assigned';
        const driverPhone =
          req.trips?.[0]?.driver?.phone ||
          req.assignments?.[0]?.driver?.phone ||
          null;

        return {
          id: req.id,
          orderId: `ORD-${req.id.slice(0, 8).toUpperCase()}`,
          orderDate: req.createdAt,
          customerName: rawVendor.organizationName || rawVendor.fullName || 'Corporate Client',
          customerContact: rawVendor.phone || rawVendor.email || 'Not Available',
          serviceRequirement: `${req.vehicleType || 'Standard'} (${req.quantity || 1} Vehicle)`,
          vehicleType: req.vehicleType,
          pickupLocation: req.pickupAddress || 'Not Available',
          deliveryLocation: req.dropAddress || 'Not Available',
          assignedDriver,
          driverPhone,
          orderAmount: amount,
          paymentStatus: req.status === 'COMPLETED' ? 'CAPTURED' : 'PENDING',
          orderStatus: req.status || 'POSTED',
        };
      });

      // Compute month-by-month analytics
      const now = new Date();
      const monthsMap: Record<string, { month: string; monthKey: string; revenue: number; completedOrders: number; totalOrders: number; activeDays: Set<string> }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const name = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        monthsMap[key] = {
          month: name,
          monthKey: key,
          revenue: 0,
          completedOrders: 0,
          totalOrders: 0,
          activeDays: new Set<string>(),
        };
      }

      vendorReqs.forEach((r: any) => {
        const d = new Date(r.createdAt || Date.now());
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const dayKey = `${key}-${String(d.getDate()).padStart(2, '0')}`;
        if (monthsMap[key]) {
          monthsMap[key].totalOrders++;
          monthsMap[key].activeDays.add(dayKey);
          if (r.status === 'COMPLETED' || r.status === 'FULFILLED') {
            monthsMap[key].completedOrders++;
            monthsMap[key].revenue += Number(r.totalAmount || r.ratePerVehicle || 0);
          }
        }
      });

      const performanceAnalytics = Object.values(monthsMap).map((m) => ({
        month: m.month,
        monthKey: m.monthKey,
        revenue: m.revenue,
        completedOrders: m.completedOrders,
        totalOrders: m.totalOrders,
        activeDays: m.activeDays.size,
        fulfillmentRate: m.totalOrders > 0 ? Math.round((m.completedOrders / m.totalOrders) * 100) : 100,
      }));

      // Parse city & state from address
      let city = 'Not Available';
      let state = 'Not Available';
      if (rawVendor.address) {
        const parts = rawVendor.address.split(',').map((s: string) => s.trim());
        if (parts.length >= 2) {
          city = parts[parts.length - 2] || parts[0];
          state = parts[parts.length - 1];
        } else if (parts.length === 1) {
          city = parts[0];
        }
      }

      return {
        id: rawVendor.id,
        userId: rawVendor.userId || rawVendor.id,
        companyName: rawVendor.organizationName || rawVendor.companyName || 'Corporate Partner',
        organizationName: rawVendor.organizationName || rawVendor.companyName || 'Corporate Partner',
        companyLogoUrl: null,
        contactPerson: rawVendor.fullName || rawVendor.contactPerson || 'Not Available',
        fullName: rawVendor.fullName || rawVendor.contactPerson || 'Not Available',
        phone: rawVendor.phone || 'Not Available',
        email: rawVendor.email || 'Not Available',
        companyAddress: rawVendor.address || 'Not Available',
        city,
        state,
        gstNumber: rawVendor.gstNumber || null,
        businessType: 'Logistics & Passenger Fleet',
        verificationStatus: rawVendor.verificationStatus || 'PENDING',
        accountStatus: rawVendor.status || 'ACTIVE',
        escrowBalance: Number(rawVendor.escrowBalance || 0),
        createdAt: rawVendor.createdAt || new Date().toISOString(),
        updatedAt: rawVendor.updatedAt || new Date().toISOString(),
        totalOrdersReceived: vendorReqs.length,
        completedOrders,
        pendingOrders,
        cancelledOrders,
        totalRevenue,
        requirementsCount: vendorReqs.length,
        orders,
        performanceAnalytics,
        recentActivities: [],
      };
    } catch (err) {
      throw err;
    }
  },

  updateVendor: (id: string, data: { organizationName?: string; fullName?: string; phone?: string; gstNumber?: string; address?: string; email?: string }) =>
    apiClient(`/admin/vendors/${id}`, {
      method: 'PATCH',
      body: data,
    }),

  updateVendorStatus: (id: string, status: string, reason?: string) =>
    apiClient(`/admin/vendors/${id}/status`, {
      method: 'POST',
      body: { status, reason },
    }).catch(async () => {
      // Fallback to verify or reject endpoint if status endpoint is pending EC2 deploy
      if (status === 'VERIFIED') {
        return apiClient(`/admin/vendors/${id}/verify`, { method: 'POST', body: { notes: reason || 'Verified by Admin' } });
      } else if (status === 'REJECTED') {
        return apiClient(`/admin/vendors/${id}/reject`, { method: 'POST', body: { reason: reason || 'Application rejected' } });
      }
      return null;
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

  getUsers: async (params?: { status?: string; role?: string; search?: string; page?: number; limit?: number }): Promise<UserListItem[]> => {
    const queryParams = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') queryParams.append('status', params.status);
    if (params?.role && params.role !== 'ALL') queryParams.append('role', params.role);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', String(params.page));
    if (params?.limit) queryParams.append('limit', String(params.limit));

    const q = queryParams.toString() ? `?${queryParams.toString()}` : '';

    try {
      const res = await apiClient<any>(`/admin/users${q}`);
      if (Array.isArray(res)) return res as UserListItem[];
      if (res && Array.isArray(res.items)) return res.items as UserListItem[];
    } catch {
      // If /admin/users endpoint is not yet live on remote EC2, synthesize users list from vendors
    }

    // Fallback synthesis
    const vendors = await adminApi.getVendors().catch(() => [] as VendorListItem[]);
    return vendors.map((v) => ({
      id: v.userId || v.id,
      fullName: v.contactPerson || v.fullName || v.companyName || 'User Account',
      phone: v.phone || 'Not Available',
      email: v.email || 'Not Available',
      role: 'VENDOR',
      status: (v.accountStatus as any) || (v.verificationStatus === 'REJECTED' ? 'SUSPENDED' : 'ACTIVE'),
      companyName: v.companyName,
      address: v.address || 'Not Available',
      city: v.city || 'Not Available',
      state: v.state || 'Not Available',
      totalOrders: v.requirementsCount || 0,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    }));
  },

  getUserDetails: async (id: string): Promise<UserProfileDetail> => {
    try {
      const res = await apiClient<any>(`/admin/users/${id}`);
      if (res && res.orders && Array.isArray(res.orders)) {
        return res as UserProfileDetail;
      }
    } catch {
      // Fallback synthesis if remote endpoint pending EC2 deployment
    }

    // Synthesize user details from vendor/requirements
    const vendors = await adminApi.getVendors().catch(() => [] as VendorListItem[]);
    const matchedVendor = vendors.find((v) => v.id === id || (v as any).userId === id);
    const vendorDetail = matchedVendor ? await adminApi.getVendorDetails(matchedVendor.id).catch(() => null) : null;

    let totalOrders = 0;
    let completedOrders = 0;
    let pendingOrders = 0;
    let cancelledOrders = 0;
    let totalAmountSpent = 0;

    const orders = (vendorDetail?.orders || []).map((o) => {
      totalOrders++;
      if (o.orderStatus === 'COMPLETED' || o.orderStatus === 'FULFILLED') {
        completedOrders++;
        totalAmountSpent += o.orderAmount;
      } else if (o.orderStatus === 'CANCELLED' || o.orderStatus === 'NO_DRIVER_AVAILABLE') {
        cancelledOrders++;
      } else {
        pendingOrders++;
      }

      return {
        id: o.id,
        orderId: o.orderId,
        orderDate: o.orderDate,
        serviceDetails: o.serviceRequirement,
        vehicleType: o.vehicleType,
        assignedVendor: vendorDetail?.companyName || 'Corporate Partner',
        assignedDriver: o.assignedDriver,
        driverPhone: o.driverPhone,
        pickupLocation: o.pickupLocation,
        deliveryLocation: o.deliveryLocation,
        orderAmount: o.orderAmount,
        paymentStatus: o.paymentStatus,
        orderStatus: o.orderStatus,
      };
    });

    return {
      id: matchedVendor?.userId || matchedVendor?.id || id,
      fullName: matchedVendor?.contactPerson || matchedVendor?.fullName || 'User Account',
      email: matchedVendor?.email || 'Not Available',
      phone: matchedVendor?.phone || 'Not Available',
      role: 'VENDOR',
      status: (matchedVendor?.accountStatus as any) || 'ACTIVE',
      createdAt: matchedVendor?.createdAt || new Date().toISOString(),
      updatedAt: matchedVendor?.updatedAt,
      profilePhotoUrl: null,
      address: matchedVendor?.address || 'Not Available',
      city: vendorDetail?.city || 'Not Available',
      state: vendorDetail?.state || 'Not Available',
      latitude: null,
      longitude: null,
      corporateTenantName: matchedVendor?.companyName || null,
      corporateOfficeName: null,
      totalOrders,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      totalAmountSpent,
      orders,
      activityLogs: [
        {
          id: 'log-1',
          action: 'User Session Active',
          entityName: 'SECURITY',
          details: 'Account in good administrative standing',
          timestamp: new Date().toISOString(),
        },
      ],
    };
  },

  updateUser: (id: string, data: { fullName?: string; phone?: string; email?: string; status?: string; address?: string }) =>
    apiClient(`/admin/users/${id}`, {
      method: 'PATCH',
      body: data,
    }).catch(async () => {
      // Fallback to vendor update if user is linked to vendor
      return adminApi.updateVendor(id, {
        fullName: data.fullName,
        phone: data.phone,
        address: data.address,
      });
    }),

  updateUserStatus: (id: string, status: string, reason?: string) =>
    apiClient(`/admin/users/${id}/status`, {
      method: 'POST',
      body: { status, reason },
    }).catch(() => null),

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
        pricing: r.pricing ?? undefined,
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

  // Vehicle category catalogue (no prices) & platform policy
  getPricingTiers: () => apiClient<VehicleCategory[]>('/pricing/tiers'),

  createPricingTier: (data: CreateVehicleCategoryPayload) =>
    apiClient<VehicleCategory>('/pricing/admin/tiers', {
      method: 'POST',
      body: data,
    }),

  updatePricingTier: (vehicleType: string, data: UpdateVehicleCategoryPayload) =>
    apiClient<VehicleCategory>(`/pricing/admin/${vehicleType}`, {
      method: 'PATCH',
      body: data,
    }),

  /** Deactivates the category (history is kept). Refused while trips in that category are running. */
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

  // ── Dynamic Distance-Based Pricing Engine (PRD v1.0) ──────────────────────
  getDistancePricingPlans: (params?: { vehicleCategory?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.vehicleCategory) q.set('vehicleCategory', params.vehicleCategory);
    if (params?.status) q.set('status', params.status);
    const qs = q.toString();
    return apiClient<DistancePricingPlan[]>(`/admin/pricing/plans${qs ? `?${qs}` : ''}`);
  },

  getDistancePricingPlan: (id: string) =>
    apiClient<DistancePricingPlan>(`/admin/pricing/plans/${id}`),

  createDistancePricingPlan: (data: CreateDistancePricingPlanPayload) =>
    apiClient<DistancePricingPlan>('/admin/pricing/plans', {
      method: 'POST',
      body: data,
    }),

  updateDistancePricingSlabs: (id: string, slabs: CreatePricingSlabInput[], reason?: string) =>
    apiClient<DistancePricingPlan>(`/admin/pricing/plans/${id}/slabs`, {
      method: 'PUT',
      body: { slabs, reason },
    }),

  retireDistancePricingPlan: (id: string, reason: string) =>
    apiClient<DistancePricingPlan>(`/admin/pricing/plans/${id}/retire`, {
      method: 'POST',
      body: { reason },
    }),

  publishDistancePricingPlan: (id: string, reason: string, effectiveFrom?: string) =>
    apiClient<DistancePricingPlan>(`/admin/pricing/plans/${id}/publish`, {
      method: 'POST',
      body: { reason, effectiveFrom },
    }),

  getDistancePricingAudit: (planId?: string) =>
    apiClient<PricingAuditItem[]>(`/admin/pricing/audit${planId ? `?planId=${planId}` : ''}`),

  simulateDistancePricing: (data: {
    distanceKm?: number;
    distanceMeters?: number;
    pickup?: { lat: number; lng: number; address?: string };
    drop?: { lat: number; lng: number; address?: string };
    vehicleCategory?: string;
  }) =>
    apiClient<DistanceSimulationResult>('/admin/pricing/simulate', {
      method: 'POST',
      body: data,
    }),

  // Operational Reports & Corridor Intelligence
  getCorridorAnalytics: () => apiClient<CorridorAnalytics[]>('/admin/reports/corridors'),

  getOperationalReports: () => apiClient<OperationalReportData>('/admin/reports/analytics'),

  // Platform Finance, Revenue & Payout Operations
  getFinanceDashboard: (params?: { range?: string; startDate?: string; endDate?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.range) searchParams.append('range', params.range);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiClient<FinanceDashboardData>(`/admin/finance/dashboard${query}`);
  },

  getFinanceTransactions: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    range?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.limit) searchParams.append('limit', String(params.limit));
    if (params?.status && params.status !== 'ALL') searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.range) searchParams.append('range', params.range);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
    return apiClient<{ items: FinanceTransactionItem[]; total: number; page: number; limit: number }>(
      `/admin/finance/transactions${query}`,
    );
  },

  getDriverFinancialHistory: (driverId: string) =>
    apiClient<DriverFinancialHistoryDetail>(`/admin/finance/driver/${driverId}`),

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
    return apiClient<any>(`/disputes${query}`).then((res) => {
      if (Array.isArray(res)) return res as DisputeListItem[];
      if (res && Array.isArray(res.items)) return res.items as DisputeListItem[];
      return [] as DisputeListItem[];
    });
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

