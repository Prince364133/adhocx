/**
 * Every endpoint the corporate portal calls. Paths, query params and bodies are taken from the
 * controllers under apps/api/src/domains/corporate and apps/api/src/modules/auth. Nothing here is
 * ADMIN-only. Tenant-scoped endpoints receive the tenant id from the token; CorporateAccessGuard
 * forces it server side anyway and rejects any other value.
 */
import { apiDownload, apiRequest, qs } from './client';
import type {
  AttendancePage,
  AuthResponse,
  BookingQueueResponse,
  CorporateRateCard,
  CorporateUser,
  CreditNote,
  Dashboard,
  Direction,
  Employee,
  EmployeeLocation,
  EmployeeRequestsResponse,
  ExceptionsResponse,
  Holiday,
  Invoice,
  InvoiceDetail,
  InvoiceDispute,
  Office,
  OfficeGeofenceDetails,
  OtpRequestResponse,
  Paginated,
  Roster,
  RosterRequest,
  RosterUploadResult,
  RosterValidationResult,
  RouteDetail,
  RouteListItem,
  RouteTimeline,
  RouteTracking,
  ShiftTemplate,
  SosAlert,
  SupportTicket,
  Tenant,
  TenantIntegrations,
} from './types';

export interface AnalyticsParams {
  tenantId: string;
  from: string;
  to: string;
  officeId?: string;
  direction?: Direction | '';
  shiftTime?: string;
}

export type ReportType = 'trips' | 'no-shows' | 'attendance';

export const authApi = {
  /** Password login (POST /auth/login). */
  login: (identifier: string, password: string) =>
    apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: { identifier, password }, anonymous: true }),

  /**
   * OTP request for an EXISTING account only (isRegister: false), so the OTP verify step can never
   * create a new account from the corporate portal.
   */
  requestOtp: (identifier: { phone?: string; email?: string }) =>
    apiRequest<OtpRequestResponse>('/auth/otp/request', {
      method: 'POST',
      body: { ...identifier, isRegister: false },
      anonymous: true,
    }),

  verifyOtp: (body: { requestId?: string; phone?: string; email?: string; otp: string }) =>
    apiRequest<AuthResponse>('/auth/otp/verify', { method: 'POST', body: { ...body, isRegister: false }, anonymous: true }),

  logout: () => apiRequest<{ success: boolean }>('/auth/logout', { method: 'POST', body: {} }),
};

export const tenantApi = {
  get: (tenantId: string) => apiRequest<Tenant>(`/corporate/tenants/${tenantId}`),
  offices: (tenantId: string) => apiRequest<Office[]>(`/corporate/tenants/${tenantId}/offices`),
  geofences: (tenantId: string, officeId: string) =>
    apiRequest<OfficeGeofenceDetails>(`/corporate/tenants/${tenantId}/offices/${officeId}/geofences`),
  integrations: (tenantId: string) =>
    apiRequest<TenantIntegrations>(`/corporate/tenants/${tenantId}/integrations`),
};

export const analyticsApi = {
  dashboard: (p: AnalyticsParams) => apiRequest<Dashboard>(`/corporate/analytics/dashboard${qs({ ...p })}`),
  exceptions: (p: { tenantId?: string; officeId?: string; from?: string; to?: string }) =>
    apiRequest<ExceptionsResponse>(`/corporate/analytics/exceptions${qs(p)}`),
  attendance: (p: Omit<AnalyticsParams, 'direction' | 'shiftTime'> & { page?: number; pageSize?: number }) =>
    apiRequest<AttendancePage>(`/corporate/analytics/attendance${qs({ ...p })}`),
  downloadReport: (type: ReportType, p: AnalyticsParams) =>
    apiDownload(
      `/corporate/analytics/reports/${type}${qs({ ...p, format: 'csv' })}`,
      `adhocx-${type}-${p.from}_to_${p.to}.csv`,
    ),
};

export interface EmployeeInput {
  officeId: string;
  employeeCode: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  department?: string;
  costCenter?: string;
  homeAddress: string;
  landmark?: string;
  latitude: number;
  longitude: number;
}

export type EmployeeUpdate = Partial<
  Pick<Employee, 'fullName' | 'email' | 'phoneNumber' | 'gender' | 'officeId' | 'isActive'> & {
    department: string;
    costCenter: string;
  }
>;

export const employeeApi = {
  list: (
    tenantId: string,
    p: { search?: string; officeId?: string; isActive?: string; page?: number; limit?: number },
  ) => apiRequest<Paginated<Employee>>(`/corporate/tenants/${tenantId}/employees${qs(p)}`),
  get: (tenantId: string, employeeId: string) =>
    apiRequest<Employee>(`/corporate/tenants/${tenantId}/employees/${employeeId}`),
  requests: (tenantId: string, employeeId: string, limit = 30) =>
    apiRequest<EmployeeRequestsResponse>(`/corporate/tenants/${tenantId}/employees/${employeeId}/requests${qs({ limit })}`),
  create: (tenantId: string, body: EmployeeInput) =>
    apiRequest<Employee>(`/corporate/tenants/${tenantId}/employees`, { method: 'POST', body }),
  update: (tenantId: string, employeeId: string, body: EmployeeUpdate) =>
    apiRequest<Employee>(`/corporate/tenants/${tenantId}/employees/${employeeId}`, { method: 'PATCH', body }),
  addLocation: (
    tenantId: string,
    employeeId: string,
    body: { addressText: string; landmark?: string; latitude: number; longitude: number; isDefault?: boolean },
  ) =>
    apiRequest<EmployeeLocation>(`/corporate/tenants/${tenantId}/employees/${employeeId}/locations`, {
      method: 'POST',
      body,
    }),
};

export const employeesApi = employeeApi;

export const rosterApi = {
  downloadTemplate: () => apiDownload('/corporate/rosters/template', 'AdhocX_Corporate_Roster_Template.xlsx'),
  validate: (tenantId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('tenantId', tenantId);
    return apiRequest<RosterValidationResult>(`/corporate/rosters/validate${qs({ tenantId })}`, {
      method: 'POST',
      formData: fd,
    });
  },
  upload: (tenantId: string, file: File, mode: 'draft' | 'publish') => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('tenantId', tenantId);
    fd.append('mode', mode);
    return apiRequest<RosterUploadResult>(`/corporate/rosters/upload${qs({ tenantId, mode })}`, {
      method: 'POST',
      formData: fd,
    });
  },
  list: (tenantId: string, p: { rosterDate?: string; officeId?: string }) =>
    apiRequest<Roster[]>(`/corporate/rosters${qs({ tenantId, ...p })}`),
  get: (rosterId: string) => apiRequest<Roster & { requests: RosterRequest[] }>(`/corporate/rosters/${rosterId}`),
  requests: (rosterId: string, status?: string) =>
    apiRequest<RosterRequest[]>(`/corporate/rosters/${rosterId}/requests${qs({ status })}`),
  approve: (rosterId: string) => apiRequest<Roster>(`/corporate/rosters/${rosterId}/approve`, { method: 'POST', body: {} }),
  publish: (rosterId: string) => apiRequest<unknown>(`/corporate/rosters/${rosterId}/publish`, { method: 'POST', body: {} }),
};

export const schedulingApi = {
  shiftTemplates: (tenantId: string, officeId?: string) =>
    apiRequest<ShiftTemplate[]>(`/corporate/scheduling/shift-templates${qs({ tenantId, officeId })}`),
  createShiftTemplate: (
    tenantId: string,
    body: { officeId: string; name: string; loginTime: string; logoutTime: string; weekdays: number[] },
  ) =>
    apiRequest<ShiftTemplate>('/corporate/scheduling/shift-templates', { method: 'POST', body: { ...body, tenantId } }),
  holidays: (tenantId: string, from?: string, to?: string) =>
    apiRequest<Holiday[]>(`/corporate/scheduling/holidays${qs({ tenantId, from, to })}`),
  createHoliday: (tenantId: string, body: { officeId?: string | null; holidayDate: string; name: string }) =>
    apiRequest<Holiday>('/corporate/scheduling/holidays', { method: 'POST', body: { ...body, tenantId } }),
};

export const routesApi = {
  list: (
    tenantId: string,
    p: { shiftDate?: string; shiftTime?: string; direction?: Direction | ''; status?: string; limit?: number; offset?: number },
  ) => apiRequest<RouteListItem[]>(`/corporate/routes${qs({ tenantId, ...p })}`),
  get: (routeId: string) => apiRequest<RouteDetail>(`/corporate/routes/${routeId}`),
  tracking: (routeId: string) => apiRequest<RouteTracking>(`/corporate/trips/routes/${routeId}/tracking`),
  timeline: (routeId: string) => apiRequest<RouteTimeline>(`/corporate/trips/routes/${routeId}/timeline`),
};

export const tripsApi = {
  /**
   * Cancel / reschedule a transport request on behalf of an employee
   * (POST /corporate/trips/requests/:id/reschedule; CORPORATE_ADMIN). The API enforces the 9-hour
   * cutoff; the admin override endpoint is platform-ADMIN only and is never called from here.
   */
  rescheduleOrCancel: (
    requestId: string,
    body: { employeeId: string; action: 'CANCEL' | 'RESCHEDULE'; newShiftTime?: string; newShiftDate?: string },
  ) => apiRequest<unknown>(`/corporate/trips/requests/${requestId}/reschedule`, { method: 'POST', body }),

  /**
   * List corporate transport requests across all rosters for a tenant.
   */
  requests: (p: {
    tenantId?: string;
    status?: string;
    direction?: string;
    scheduledDate?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => apiRequest<BookingQueueResponse>(`/corporate/trips/requests${qs(p)}`),

  /**
   * Approve or reject an ad-hoc or exception transport booking request.
   */
  reviewRequest: (requestId: string, body: { decision: 'APPROVE' | 'REJECT'; notes?: string }) =>
    apiRequest<{ success: boolean; request: any }>(`/corporate/trips/requests/${requestId}/review`, {
      method: 'POST',
      body,
    }),
};

export const requestsApi = tripsApi;

export const safetyApi = {
  alerts: (tenantId: string, status?: string) =>
    apiRequest<SosAlert[]>(`/corporate/safety/alerts${qs({ tenantId, status })}`),
};

export const supportApi = {
  list: (tenantId: string, p: { status?: string; priority?: string; limit?: number; offset?: number }) =>
    apiRequest<SupportTicket[]>(`/corporate/support/tickets${qs({ tenantId, ...p })}`),
  create: (
    tenantId: string,
    body: {
      employeeId: string;
      category: string;
      priority?: string;
      subject: string;
      description: string;
      routeId?: string;
    },
  ) => apiRequest<SupportTicket>('/corporate/support/tickets', { method: 'POST', body: { ...body, tenantId } }),
};

export const billingApi = {
  invoices: (tenantId: string, p: { status?: string; page?: number; limit?: number }) =>
    apiRequest<Paginated<Invoice>>(`/corporate/billing/invoices${qs({ tenantId, ...p })}`),
  invoice: (invoiceId: string) => apiRequest<InvoiceDetail>(`/corporate/billing/invoices/${invoiceId}`),
  downloadPdf: (invoice: { id: string; invoiceNumber: string }) =>
    apiDownload(`/corporate/billing/invoices/${invoice.id}/pdf`, `Invoice-${invoice.invoiceNumber}.pdf`),
  raiseDispute: (invoiceId: string, body: { reason: string; claimedAmountPaise: string; invoiceLineId?: string }) =>
    apiRequest<InvoiceDispute>(`/corporate/billing/invoices/${invoiceId}/disputes`, { method: 'POST', body }),
  disputes: (tenantId: string, p: { status?: string; invoiceId?: string } = {}) =>
    apiRequest<InvoiceDispute[]>(`/corporate/billing/disputes${qs({ tenantId, ...p })}`),
  creditNotes: (tenantId: string, p: { invoiceId?: string } = {}) =>
    apiRequest<CreditNote[]>(`/corporate/billing/credit-notes${qs({ tenantId, ...p })}`),
  rateCards: (tenantId: string, includeRetired: boolean) =>
    apiRequest<CorporateRateCard[]>(
      `/corporate/billing/rate-cards/corporate${qs({ tenantId, includeRetired: includeRetired ? 'true' : undefined })}`,
    ),
};

export const usersApi = {
  list: (tenantId: string) => apiRequest<CorporateUser[]>(`/corporate/tenants/${tenantId}/users`),
  invite: (
    tenantId: string,
    body: { fullName: string; email?: string; phone?: string; corporateRole: string; officeIds: string[] },
  ) => apiRequest<CorporateUser>(`/corporate/tenants/${tenantId}/users`, { method: 'POST', body }),
  update: (tenantId: string, userId: string, body: { corporateRole?: string; officeIds?: string[] }) =>
    apiRequest<CorporateUser>(`/corporate/tenants/${tenantId}/users/${userId}`, { method: 'PATCH', body }),
};
