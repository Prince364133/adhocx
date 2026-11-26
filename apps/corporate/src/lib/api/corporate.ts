/**
 * Every endpoint the corporate portal calls. Paths, query params and bodies are taken from the
 * controllers under apps/api/src/domains/corporate and apps/api/src/modules/auth. Nothing here is
 * ADMIN-only. Tenant-scoped endpoints receive the tenant id from the token; CorporateAccessGuard
 * forces it server side anyway and rejects any other value.
 */
import { apiDownload, apiRequest, qs } from './client';
import type {
  CreateCorporateOfficeDto,
  CreateCorporateTransportZoneDto,
  UpdateCorporateOfficeDto,
  UpdateCorporateTenantProfileDto,
  UpdateCorporateTransportZoneDto,
} from '@adhocx/contracts';
import type {
  AttendancePage,
  AuthResponse,
  BookingQueueResponse,
  CorporateRateCard,
  CorporateUser,
  CreditNote,
  Dashboard,
  Department,
  Direction,
  Employee,
  EmployeeLocation,
  EmployeeRequestsResponse,
  ExceptionsResponse,
  Holiday,
  Invoice,
  InvoiceDetail,
  InvoiceDispute,
  InAppNotificationsResponse,
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
  SafetyIncident,
  SupportTicket,
  CorporateTicketMessage,
  CorporateTicketActivity,
  Tenant,
  TenantIntegrations,
  TransportZone,
} from './types';

export interface AnalyticsParams {
  tenantId: string;
  from?: string;
  to?: string;
  officeId?: string;
  direction?: Direction | '';
  shiftTime?: string;
}

export interface TripsAnalyticsReport {
  rowCount: number;
  truncated: boolean;
  rows: Array<{
    shiftDate: string;
    direction: string;
    status: string;
    vehicleNumber: string | null;
  }>;
}

export type ReportType = 'trips' | 'no-shows' | 'attendance';

export const authApi = {
  /** Password login (POST /auth/login). */
  login: (identifier: string, password: string) =>
    apiRequest<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { identifier, password },
      anonymous: true,
    }),

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
    apiRequest<AuthResponse>('/auth/otp/verify', {
      method: 'POST',
      body: { ...body, isRegister: false },
      anonymous: true,
    }),

  setPassword: (password: string) =>
    apiRequest<AuthResponse & { success: boolean; message?: string }>('/auth/password', {
      method: 'POST',
      body: { password },
    }),

  logout: () =>
    apiRequest<{ success: boolean }>('/auth/logout', {
      method: 'POST',
      body: {},
    }),
};

export const tenantApi = {
  get: (tenantId: string) => apiRequest<Tenant>(`/corporate/tenants/${tenantId}`),
  updateProfile: (tenantId: string, body: UpdateCorporateTenantProfileDto) =>
    apiRequest<Tenant>(`/corporate/tenants/${tenantId}/profile`, {
      method: 'PATCH',
      body,
    }),
  offices: (tenantId: string, includeInactive?: boolean) =>
    apiRequest<Office[]>(
      `/corporate/tenants/${tenantId}/offices${qs({ includeInactive: includeInactive ? 'true' : undefined })}`,
    ),
  createOffice: (tenantId: string, body: CreateCorporateOfficeDto) =>
    apiRequest<Office>(`/corporate/tenants/${tenantId}/offices`, {
      method: 'POST',
      body,
    }),
  updateOffice: (tenantId: string, officeId: string, body: UpdateCorporateOfficeDto) =>
    apiRequest<Office>(`/corporate/tenants/${tenantId}/offices/${officeId}`, {
      method: 'PATCH',
      body,
    }),
  geofences: (tenantId: string, officeId: string) => apiRequest<OfficeGeofenceDetails>(`/corporate/tenants/${tenantId}/offices/${officeId}/geofences`),
  integrations: (tenantId: string) => apiRequest<TenantIntegrations>(`/corporate/tenants/${tenantId}/integrations`),
  costCenters: (tenantId: string) => apiRequest<any[]>(`/corporate/tenants/${tenantId}/cost-centers`),
  departments: (tenantId: string, includeInactive?: boolean) =>
    apiRequest<Department[]>(
      `/corporate/tenants/${tenantId}/departments${qs({ includeInactive: includeInactive ? 'true' : undefined })}`,
    ),
  createDepartment: (
    tenantId: string,
    body: {
      code: string;
      name: string;
      departmentHead?: string;
      officeId?: string;
      description?: string;
      isActive?: boolean;
    },
  ) =>
    apiRequest<Department>(`/corporate/tenants/${tenantId}/departments`, {
      method: 'POST',
      body,
    }),
  updateDepartment: (
    tenantId: string,
    departmentId: string,
    body: Partial<{
      code: string;
      name: string;
      departmentHead?: string;
      officeId?: string;
      description?: string;
      isActive?: boolean;
    }>,
  ) =>
    apiRequest<Department>(`/corporate/tenants/${tenantId}/departments/${departmentId}`, {
      method: 'PATCH',
      body,
    }),
  transportZones: (tenantId: string, includeInactive?: boolean) =>
    apiRequest<TransportZone[]>(
      `/corporate/tenants/${tenantId}/transport-zones${qs({ includeInactive: includeInactive ? 'true' : undefined })}`,
    ),
  createTransportZone: (tenantId: string, body: CreateCorporateTransportZoneDto) =>
    apiRequest<TransportZone>(`/corporate/tenants/${tenantId}/transport-zones`, {
      method: 'POST',
      body,
    }),
  updateTransportZone: (tenantId: string, zoneId: string, body: UpdateCorporateTransportZoneDto) =>
    apiRequest<TransportZone>(`/corporate/tenants/${tenantId}/transport-zones/${zoneId}`, {
      method: 'PATCH',
      body,
    }),
};

export const analyticsApi = {
  dashboard: (p: AnalyticsParams) => apiRequest<Dashboard>(`/corporate/analytics/dashboard${qs({ ...p })}`),
  tripsReport: (p: AnalyticsParams) => apiRequest<TripsAnalyticsReport>(`/corporate/analytics/reports/trips${qs({ ...p, format: 'json' })}`),
  exceptions: (p: { tenantId?: string; officeId?: string; from?: string; to?: string }) => apiRequest<ExceptionsResponse>(`/corporate/analytics/exceptions${qs(p)}`),
  attendance: (
    p: Omit<AnalyticsParams, 'direction' | 'shiftTime'> & {
      page?: number;
      pageSize?: number;
    },
  ) => apiRequest<AttendancePage>(`/corporate/analytics/attendance${qs({ ...p })}`),
  downloadReport: (
    typeOrParams:
      | ReportType
      | ({
          type: ReportType;
          tenantId: string;
          format?: string;
        } & AnalyticsParams),
    maybeParams?: AnalyticsParams,
  ) => {
    let type: ReportType;
    let p: AnalyticsParams;
    if (typeof typeOrParams === 'object') {
      type = typeOrParams.type;
      p = typeOrParams;
    } else {
      type = typeOrParams;
      if (!maybeParams) {
        throw new Error('Analytics filters are required to download a report.');
      }
      p = maybeParams;
    }
    const filename = `adhocx-${type}-${p.from || 'report'}_to_${p.to || 'latest'}.csv`;
    return apiDownload(`/corporate/analytics/reports/${type}${qs({ ...p, format: 'csv' })}`, filename);
  },
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
  latitude?: number;
  longitude?: number;
}

export type EmployeeUpdate = Partial<
  Pick<Employee, 'fullName' | 'email' | 'phoneNumber' | 'gender' | 'officeId' | 'isActive'> & {
    department: string;
    costCenter: string;
    homeAddress: string;
    landmark?: string;
  }
>;

export interface DeleteEmployeeResult {
  id: string;
  deleted: boolean;
  deactivated: boolean;
  message: string;
}

export const employeeApi = {
  list: (
    tenantId: string,
    p: {
      search?: string;
      officeId?: string;
      department?: string;
      isActive?: string;
      page?: number;
      limit?: number;
    },
  ) => apiRequest<Paginated<Employee>>(`/corporate/tenants/${tenantId}/employees${qs(p)}`),
  get: (tenantId: string, employeeId: string) => apiRequest<Employee>(`/corporate/tenants/${tenantId}/employees/${employeeId}`),
  requests: (tenantId: string, employeeId: string, limit = 30) => apiRequest<EmployeeRequestsResponse>(`/corporate/tenants/${tenantId}/employees/${employeeId}/requests${qs({ limit })}`),
  create: (tenantId: string, body: EmployeeInput) =>
    apiRequest<Employee>(`/corporate/tenants/${tenantId}/employees`, {
      method: 'POST',
      body,
    }),
  update: (tenantId: string, employeeId: string, body: EmployeeUpdate) => apiRequest<Employee>(`/corporate/tenants/${tenantId}/employees/${employeeId}`, { method: 'PATCH', body }),
  delete: (tenantId: string, employeeId: string) =>
    apiRequest<DeleteEmployeeResult>(`/corporate/tenants/${tenantId}/employees/${employeeId}`, {
      method: 'DELETE',
    }),
  addLocation: (
    tenantId: string,
    employeeId: string,
    body: {
      addressText: string;
      landmark?: string;
      latitude: number;
      longitude: number;
      isDefault?: boolean;
    },
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
  list: (tenantId: string, p: { rosterDate?: string; officeId?: string }) => apiRequest<Roster[]>(`/corporate/rosters${qs({ tenantId, ...p })}`),
  get: (rosterId: string) => apiRequest<Roster & { requests: RosterRequest[] }>(`/corporate/rosters/${rosterId}`),
  requests: (rosterId: string, status?: string) => apiRequest<RosterRequest[]>(`/corporate/rosters/${rosterId}/requests${qs({ status })}`),
  approve: (rosterId: string) =>
    apiRequest<Roster>(`/corporate/rosters/${rosterId}/approve`, {
      method: 'POST',
      body: {},
    }),
  publish: (rosterId: string) =>
    apiRequest<unknown>(`/corporate/rosters/${rosterId}/publish`, {
      method: 'POST',
      body: {},
    }),
};

export const schedulingApi = {
  shiftTemplates: (tenantId: string, officeId?: string) => apiRequest<ShiftTemplate[]>(`/corporate/scheduling/shift-templates${qs({ tenantId, officeId })}`),
  createShiftTemplate: (
    tenantId: string,
    body: {
      officeId: string;
      name: string;
      loginTime: string;
      logoutTime: string;
      weekdays: number[];
    },
  ) =>
    apiRequest<ShiftTemplate>('/corporate/scheduling/shift-templates', {
      method: 'POST',
      body: { ...body, tenantId },
    }),
  holidays: (tenantId: string, from?: string, to?: string) => apiRequest<Holiday[]>(`/corporate/scheduling/holidays${qs({ tenantId, from, to })}`),
  createHoliday: (tenantId: string, body: { officeId?: string | null; holidayDate: string; name: string }) =>
    apiRequest<Holiday>('/corporate/scheduling/holidays', {
      method: 'POST',
      body: { ...body, tenantId },
    }),
};

export const routesApi = {
  list: (
    tenantIdOrParams?:
      | string
      | {
          shiftDate?: string;
          shiftTime?: string;
          direction?: Direction | '';
          status?: string;
          dispatchStatus?: string;
          search?: string;
          limit?: number;
          offset?: number;
          includeStops?: boolean;
        },
    p?: {
      shiftDate?: string;
      shiftTime?: string;
      direction?: Direction | '';
      status?: string;
      dispatchStatus?: string;
      search?: string;
      limit?: number;
      offset?: number;
      includeStops?: boolean;
    },
  ) => {
    const tenantId = typeof tenantIdOrParams === 'string' ? tenantIdOrParams : undefined;
    const params = typeof tenantIdOrParams === 'object' ? tenantIdOrParams : (p || {});
    return apiRequest<RouteListItem[]>(
      `/corporate/routes/portal${qs({ tenantId, includeStops: true, ...params })}`,
    );
  },
  get: (routeId: string) =>
    apiRequest<RouteDetail>(`/corporate/routes/${encodeURIComponent(routeId)}?includeDirections=true`),
  directions: (routeId: string, refresh = false) =>
    apiRequest<import('./types').RouteDirectionsResult>(
      `/corporate/routes/${encodeURIComponent(routeId)}/directions${refresh ? '?refresh=true' : ''}`,
    ),
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
    body: {
      employeeId: string;
      action: 'CANCEL' | 'RESCHEDULE';
      newShiftTime?: string;
      newShiftDate?: string;
    },
  ) =>
    apiRequest<unknown>(`/corporate/trips/requests/${requestId}/reschedule`, {
      method: 'POST',
      body,
    }),

  /**
   * List corporate transport requests across all rosters for a tenant.
   */
  requests: (p: { tenantId?: string; status?: string; direction?: string; scheduledDate?: string; search?: string; page?: number; limit?: number }) =>
    apiRequest<BookingQueueResponse>(`/corporate/trips/requests${qs(p)}`),

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
  alerts: (tenantId: string, p?: string | { status?: string }) => {
    const status = typeof p === 'string' ? p : p?.status;
    return apiRequest<SosAlert[]>(`/corporate/safety/alerts${qs({ tenantId, status })}`);
  },
  incidents: (tenantId: string, p?: { status?: string }) => apiRequest<SafetyIncident[]>(`/corporate/safety/alerts${qs({ tenantId, ...p })}`),
  incident: (incidentId: string) => apiRequest<SafetyIncident>(`/corporate/safety/alerts/${incidentId}`),
  resolveAlert: (
    alertId: string,
    body: {
      reason?: string;
      resolutionNotes?: string;
      falsePositive?: boolean;
    },
  ) =>
    apiRequest<unknown>(`/corporate/safety/alerts/${alertId}/resolve`, {
      method: 'POST',
      body,
    }),
  resolveIncident: (
    incidentId: string,
    body: {
      reason?: string;
      resolutionNotes?: string;
      falsePositive?: boolean;
    },
  ) =>
    apiRequest<unknown>(`/corporate/safety/alerts/${incidentId}/resolve`, {
      method: 'POST',
      body,
    }),
  confirmSafeDrop: (routeId: string, stopId: string, body: { confirmedByRole: 'DRIVER' | 'EMPLOYEE'; notes?: string }) =>
    apiRequest<unknown>(`/corporate/safety/routes/${routeId}/stops/${stopId}/confirm-safe-drop`, {
      method: 'POST',
      body,
    }),
  confirmSafeReach: (routeId: string, stopId: string, body: { confirmedSafely?: boolean; notes?: string }) =>
    apiRequest<unknown>(`/corporate/safety/routes/${routeId}/stops/${stopId}/confirm-safe-reach`, {
      method: 'POST',
      body,
    }),
  emergencyBoardingOverride: (routeId: string, stopId: string, body: { reason: string; verificationEvidence?: string; notes?: string }) =>
    apiRequest<unknown>(`/corporate/safety/routes/${routeId}/stops/${stopId}/emergency-boarding-override`, {
      method: 'POST',
      body,
    }),
  trackingLossRoutes: () => apiRequest<string[]>(`/corporate/safety/tracking-loss`),
  getSafeDropStatus: (stopId: string) => apiRequest<unknown>(`/corporate/safety/stops/${stopId}/safe-drop-status`),
};

export const supportApi = {
  list: (
    tenantId?: string,
    p: {
      status?: string;
      priority?: string;
      category?: string;
      search?: string;
      from?: string;
      to?: string;
      limit?: number;
      offset?: number;
    } = {},
  ) => apiRequest<SupportTicket[]>(`/corporate/support/tickets${qs({ tenantId, ...p })}`),
  get: (ticketId: string) => apiRequest<SupportTicket>(`/corporate/support/tickets/${ticketId}`),
  summary: () =>
    apiRequest<{
      total: number;
      open: number;
      inProgress: number;
      resolved: number;
      closed: number;
    }>('/corporate/support/tickets/summary'),
  create: (
    tenantId: string,
    body: {
      employeeId?: string;
      category: string;
      priority?: string;
      subject: string;
      description: string;
      routeId?: string;
    },
    attachments: File[] = [],
    idempotencyKey = crypto.randomUUID(),
  ) => {
    if (attachments && attachments.length > 0) {
      const formData = new FormData();
      Object.entries({ ...body, tenantId }).forEach(([key, value]) => {
        if (value !== undefined) formData.append(key, value);
      });
      attachments.forEach((file) => formData.append('attachments', file));
      return apiRequest<SupportTicket>('/corporate/support/tickets', {
        method: 'POST',
        formData,
        headers: { 'Idempotency-Key': idempotencyKey },
      });
    }
    return apiRequest<SupportTicket>('/corporate/support/tickets', {
      method: 'POST',
      body: { ...body, tenantId },
      headers: { 'Idempotency-Key': idempotencyKey },
    });
  },
  reply: (ticketId: string, message: string, attachments: File[] = []) => {
    const formData = new FormData();
    formData.append('message', message);
    attachments.forEach((file) => formData.append('attachments', file));
    return apiRequest<SupportTicket>(`/corporate/support/tickets/${ticketId}/replies`, { method: 'POST', formData });
  },
  listMessages: (ticketId: string) =>
    apiRequest<CorporateTicketMessage[]>(`/corporate/support/tickets/${ticketId}/messages`),
  sendMessage: (ticketId: string, body: { message: string }) =>
    apiRequest<CorporateTicketMessage>(`/corporate/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      body,
    }),
  reopen: (ticketId: string, body?: { reason?: string }) =>
    apiRequest<SupportTicket>(`/corporate/support/tickets/${ticketId}/reopen`, {
      method: 'POST',
      body: body || {},
    }),
  updateStatus: (ticketId: string, status: string, notes?: string) =>
    apiRequest<SupportTicket>(`/corporate/support/tickets/${ticketId}/status`, {
      method: 'PATCH',
      body: notes ? { status, notes } : { status },
    }),
  activity: (ticketId: string) =>
    apiRequest<CorporateTicketActivity[]>(`/corporate/support/tickets/${ticketId}/activity`),
};

export const billingApi = {
  invoices: (tenantId: string, p: { status?: string; page?: number; limit?: number }) => apiRequest<Paginated<Invoice>>(`/corporate/billing/invoices${qs({ tenantId, ...p })}`),
  invoice: (invoiceId: string) => apiRequest<InvoiceDetail>(`/corporate/billing/invoices/${invoiceId}`),
  downloadPdf: (invoice: { id: string; invoiceNumber: string }) => apiDownload(`/corporate/billing/invoices/${invoice.id}/pdf`, `Invoice-${invoice.invoiceNumber}.pdf`),
  raiseDispute: (
    invoiceId: string,
    body: {
      reason: string;
      claimedAmountPaise: string;
      invoiceLineId?: string;
    },
  ) => apiRequest<InvoiceDispute>(`/corporate/billing/invoices/${invoiceId}/disputes`, { method: 'POST', body }),
  disputes: (tenantId: string, p: { status?: string; invoiceId?: string } = {}) => apiRequest<InvoiceDispute[]>(`/corporate/billing/disputes${qs({ tenantId, ...p })}`),
  creditNotes: (tenantId: string, p: { invoiceId?: string } = {}) => apiRequest<CreditNote[]>(`/corporate/billing/credit-notes${qs({ tenantId, ...p })}`),
  rateCards: (tenantId: string, includeRetired: boolean) =>
    apiRequest<CorporateRateCard[]>(`/corporate/billing/rate-cards/corporate${qs({ tenantId, includeRetired: includeRetired ? 'true' : undefined })}`),
};

export const usersApi = {
  list: (tenantId: string) => apiRequest<CorporateUser[]>(`/corporate/tenants/${tenantId}/users`),
  invite: (
    tenantId: string,
    body: {
      fullName: string;
      email?: string;
      phone?: string;
      password?: string;
      corporateRole: string;
      officeIds: string[];
    },
  ) =>
    apiRequest<CorporateUser>(`/corporate/tenants/${tenantId}/users`, {
      method: 'POST',
      body,
    }),
  update: (tenantId: string, userId: string, body: { corporateRole?: string; officeIds?: string[]; password?: string }) =>
    apiRequest<CorporateUser>(`/corporate/tenants/${tenantId}/users/${userId}`, { method: 'PATCH', body }),
};

export const notificationsApi = {
  list: (limit = 8, page = 1) =>
    apiRequest<InAppNotificationsResponse>(`/notifications/in-app${qs({ limit, page })}`),
  markRead: (notificationId: string) =>
    apiRequest<{ success: boolean }>(`/notifications/in-app/${encodeURIComponent(notificationId)}/read`, {
      method: 'PATCH',
    }),
  markAllRead: () =>
    apiRequest<{ success: boolean }>('/notifications/in-app/read-all', {
      method: 'PATCH',
    }),
  delete: (notificationId: string) =>
    apiRequest<{ success: boolean; deletedCount?: number; unreadCount?: number }>(
      `/notifications/in-app/${encodeURIComponent(notificationId)}`,
      { method: 'DELETE' },
    ),
  clearAll: () =>
    apiRequest<{ success: boolean; deletedCount?: number; unreadCount?: number }>(
      '/notifications/in-app',
      { method: 'DELETE' },
    ),
};
