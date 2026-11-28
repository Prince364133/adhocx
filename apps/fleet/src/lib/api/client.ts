import type {
  CreateFleetAnnouncementDto,
  CreateFleetIncentiveDto,
  CreateFleetShiftDto,
  CreateFleetSupportTicketDto,
  FleetAuthResponseDto,
  FleetAuthUserDto,
  FleetDashboardResponseDto,
  FleetDriverDetailDto,
  FleetDriverSummaryDto,
  FleetEarningsResponseDto,
  FleetIncentiveDto,
  FleetIncentiveProgressDto,
  FleetLiveOpsResponseDto,
  FleetLoginDto,
  FleetNotificationDto,
  FleetPayoutRecordDto,
  FleetShiftDto,
  FleetShortfallRecordDto,
  FleetSupportAttachmentLinkDto,
  FleetSupportTicketDetailDto,
  FleetSupportTicketDto,
  PresignFleetSupportAttachmentDto,
  ReassignFleetVehicleDto,
  ReplyFleetSupportTicketDto,
  RequestFleetPayoutDto,
  UpdateFleetCodeStatusDto,
  UpdateFleetIncentiveDto,
  UpdateFleetShiftDto,
} from '@adhocx/contracts';
import { clearFleetSession, getFleetToken } from '../auth/session';

export class FleetApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly errorCode: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'FleetApiError';
  }
}

export function getFleetApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_FLEET_API_URL) {
    return process.env.NEXT_PUBLIC_FLEET_API_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
      return `${window.location.protocol}//${host}:7001/api/v1/fleet`;
    }
    if (host.includes('adhocx.com')) {
      return '/api/v1/fleet';
    }
    return `${window.location.origin}/api/v1/fleet`;
  }
  return 'http://localhost:7001/api/v1/fleet';
}

interface RequestConfig {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

export async function fleetRequest<T>(path: string, config: RequestConfig = {}): Promise<T> {
  const token = getFleetToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...config.headers,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${getFleetApiBaseUrl()}${path}`, {
      method: config.method || 'GET',
      headers,
      body: config.body !== undefined ? JSON.stringify(config.body) : undefined,
      cache: 'no-store',
    });
  } catch (err: unknown) {
    throw new FleetApiError(
      0,
      'NETWORK_ERROR',
      err instanceof Error ? err.message : 'Unable to reach AdhocX API.',
    );
  }

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && typeof window !== 'undefined' && window.location.pathname !== '/login') {
      clearFleetSession();
      window.location.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
    }
    throw new FleetApiError(
      response.status,
      String(json?.error?.code || json?.errorCode || json?.code || 'REQUEST_FAILED'),
      String(json?.error?.message || json?.message || `Request failed with status ${response.status}`),
      json?.error?.details ?? json?.details,
    );
  }

  if (json && typeof json === 'object' && 'data' in json) {
    return json.data as T;
  }
  return json as T;
}

export const fleetApi = {
  login: (dto: FleetLoginDto) =>
    fleetRequest<FleetAuthResponseDto>('/auth/login', { method: 'POST', body: dto }),
  getMe: () => fleetRequest<FleetAuthUserDto>('/auth/me'),
  logout: () => fleetRequest<{ success: boolean }>('/auth/logout', { method: 'POST' }),

  getDashboard: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return fleetRequest<FleetDashboardResponseDto>(`/dashboard${q}`);
  },

  getFleetCode: () =>
    fleetRequest<{ id: string; name: string; code: string; codeStatus: string; codeRotatedAt?: string }>('/code'),
  regenerateFleetCode: () =>
    fleetRequest<{ id: string; code: string; codeStatus: string; codeRotatedAt?: string }>('/code/regenerate', {
      method: 'POST',
    }),
  updateFleetCodeStatus: (dto: UpdateFleetCodeStatusDto) =>
    fleetRequest<{ id: string; code: string; codeStatus: string }>('/code/status', {
      method: 'PATCH',
      body: dto,
    }),

  listDrivers: (params?: { search?: string; status?: string; vehiclePlate?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.status && params.status !== 'ALL') qs.set('status', params.status);
    if (params?.vehiclePlate) qs.set('vehiclePlate', params.vehiclePlate);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return fleetRequest<{ items: FleetDriverSummaryDto[]; total: number; page: number; limit: number }>(`/drivers${q}`);
  },
  getDriverDetail: (driverId: string) =>
    fleetRequest<FleetDriverDetailDto>(`/drivers/${driverId}`),
  reassignVehicle: (driverId: string, dto: ReassignFleetVehicleDto) =>
    fleetRequest<{ id: string; fullName: string; vehiclePlate: string }>(`/drivers/${driverId}/vehicle`, {
      method: 'PATCH',
      body: dto,
    }),
  removeDriver: (driverId: string, notes?: string) =>
    fleetRequest<{ removed: boolean; driverId: string }>(`/drivers/${driverId}/remove`, {
      method: 'POST',
      body: { notes },
    }),

  getLiveOperations: (params?: { status?: string; driverId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') qs.set('status', params.status);
    if (params?.driverId) qs.set('driverId', params.driverId);
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return fleetRequest<FleetLiveOpsResponseDto>(`/live-operations${q}`);
  },

  getEarnings: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return fleetRequest<FleetEarningsResponseDto>(`/earnings${q}`);
  },
  getEarningsExportUrl: (params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    if (params?.from) qs.set('from', params.from);
    if (params?.to) qs.set('to', params.to);
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return `${getFleetApiBaseUrl()}/earnings/export${q}`;
  },
  listPayouts: (params?: { status?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return fleetRequest<{ items: FleetPayoutRecordDto[]; total: number; page: number; limit: number }>(`/payouts${q}`);
  },
  requestPayout: (dto: RequestFleetPayoutDto) =>
    fleetRequest<FleetPayoutRecordDto>('/payouts', { method: 'POST', body: dto }),
  getShortfallClaims: () => fleetRequest<FleetShortfallRecordDto[]>('/shortfall-claims'),

  listIncentives: (params?: { status?: string; type?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') qs.set('status', params.status);
    if (params?.type && params.type !== 'ALL') qs.set('type', params.type);
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return fleetRequest<FleetIncentiveDto[]>(`/incentives${q}`);
  },
  createIncentive: (dto: CreateFleetIncentiveDto) =>
    fleetRequest<FleetIncentiveDto>('/incentives', { method: 'POST', body: dto }),
  updateIncentive: (id: string, dto: UpdateFleetIncentiveDto) =>
    fleetRequest<FleetIncentiveDto>(`/incentives/${id}`, { method: 'PATCH', body: dto }),
  getIncentiveProgress: (id: string) =>
    fleetRequest<FleetIncentiveProgressDto[]>(`/incentives/${id}/progress`),

  listShifts: () => fleetRequest<FleetShiftDto[]>('/shifts'),
  createShift: (dto: CreateFleetShiftDto) =>
    fleetRequest<FleetShiftDto>('/shifts', { method: 'POST', body: dto }),
  updateShift: (id: string, dto: UpdateFleetShiftDto) =>
    fleetRequest<FleetShiftDto>(`/shifts/${id}`, { method: 'PATCH', body: dto }),

  listSupportTickets: (params?: { status?: string; category?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status && params.status !== 'ALL') qs.set('status', params.status);
    if (params?.category && params.category !== 'ALL') qs.set('category', params.category);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return fleetRequest<{ items: FleetSupportTicketDto[]; total: number; page: number; limit: number }>(
      `/support/tickets${q}`,
    );
  },
  createSupportTicket: (dto: CreateFleetSupportTicketDto) =>
    fleetRequest<FleetSupportTicketDto>('/support/tickets', { method: 'POST', body: dto }),
  getSupportTicketDetail: (id: string) =>
    fleetRequest<FleetSupportTicketDetailDto>(`/support/tickets/${id}`),
  replySupportTicket: (id: string, dto: ReplyFleetSupportTicketDto) =>
    fleetRequest<{ ticket: FleetSupportTicketDto; message: FleetSupportTicketDetailDto['messages'][number] }>(
      `/support/tickets/${id}/messages`,
      { method: 'POST', body: dto },
    ),
  presignSupportAttachment: (dto: PresignFleetSupportAttachmentDto) =>
    fleetRequest<{
      key: string;
      uploadUrl: string;
      method: 'PUT' | 'POST';
      uploadMode: 'S3_PRESIGNED' | 'MULTIPART_FALLBACK';
      expiresInSeconds: number;
    }>('/support/attachments/presign', { method: 'POST', body: dto }),
  uploadSupportAttachment: async (file: File): Promise<FleetSupportAttachmentLinkDto> => {
    const mimeType = file.type || 'application/octet-stream';
    const presign = await fleetApi.presignSupportAttachment({
      fileName: file.name,
      mimeType,
    });

    if (presign.uploadMode === 'S3_PRESIGNED') {
      const putRes = await fetch(presign.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: file,
      });
      if (!putRes.ok) {
        throw new FleetApiError(putRes.status, 'ATTACHMENT_UPLOAD_FAILED', 'Unable to upload attachment to storage.');
      }
      return {
        key: presign.key,
        fileName: file.name,
        mimeType,
      };
    }

    const token = getFleetToken();
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${getFleetApiBaseUrl()}/support/attachments/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const errMsg = json?.error?.message || json?.message || `Attachment upload failed (${res.status})`;
      throw new FleetApiError(res.status, json?.error?.code || 'ATTACHMENT_UPLOAD_FAILED', errMsg);
    }
    return (json && typeof json === 'object' && 'data' in json ? json.data : json) as FleetSupportAttachmentLinkDto;
  },

  listNotifications: (params?: { unreadOnly?: boolean; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.unreadOnly) qs.set('unreadOnly', 'true');
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const q = qs.toString() ? `?${qs.toString()}` : '';
    return fleetRequest<{
      items: FleetNotificationDto[];
      unreadCount: number;
      total: number;
      page: number;
      limit: number;
    }>(`/notifications${q}`);
  },
  markNotificationRead: (id: string) =>
    fleetRequest<FleetNotificationDto>(`/notifications/${id}/read`, { method: 'PATCH' }),
  markAllNotificationsRead: () =>
    fleetRequest<{ updatedCount: number }>('/notifications/read-all', { method: 'POST' }),
  createAnnouncement: (dto: CreateFleetAnnouncementDto) =>
    fleetRequest<FleetNotificationDto>('/notifications/announcements', { method: 'POST', body: dto }),
};
