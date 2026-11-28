import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fleetApi, FleetApiError } from '../lib/api/client';

describe('Fleet API Client, Error Handling & Attachment Flow', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete (global as any).window;
    delete (global as any).document;
    delete (global as any).localStorage;
  });

  it('unwraps standard TransformInterceptor { data } envelope cleanly', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { code: 'FLT-123456', codeStatus: 'ACTIVE' },
      }),
    } as any);

    const res = await fleetApi.getFleetCode();
    expect(res.code).toBe('FLT-123456');
  });

  it('throws FleetApiError preserving status and backend error code on network/API failure', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        success: false,
        error: {
          code: 'INSUFFICIENT_FLEET_ROLE',
          message: 'Owner role required.',
        },
      }),
    } as any);

    await expect(fleetApi.regenerateFleetCode()).rejects.toMatchObject({
      name: 'FleetApiError',
      status: 403,
      errorCode: 'INSUFFICIENT_FLEET_ROLE',
      message: 'Owner role required.',
    });
  });

  it('handles 401 unauthorized by clearing cookie session and throwing FleetApiError', async () => {
    let cookieStore = 'adhocx_fleet_token=stale-jwt; path=/';
    (global as any).document = {
      get cookie() {
        return cookieStore;
      },
      set cookie(val: string) {
        cookieStore = val;
      },
    };
    const storageMock = {
      removeItem: vi.fn(),
      getItem: vi.fn(),
      setItem: vi.fn(),
    };
    (global as any).localStorage = storageMock;
    const replaceMock = vi.fn();
    (global as any).window = {
      location: { pathname: '/dashboard', hostname: 'localhost', protocol: 'http:', replace: replaceMock },
      localStorage: storageMock,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({
        error: { code: 'INVALID_OR_EXPIRED_TOKEN', message: 'Expired token' },
      }),
    } as any);

    await expect(fleetApi.getMe()).rejects.toBeInstanceOf(FleetApiError);
    expect(cookieStore).toContain('max-age=0');
    expect(replaceMock).toHaveBeenCalledWith('/login?redirect=%2Fdashboard');
  });

  it('routes support attachment uploads through presign PUT when S3_PRESIGNED mode is returned', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          data: {
            key: 'documents/fleet-support/f1/proof.pdf',
            uploadUrl: 'https://r2.example.com/presigned',
            method: 'PUT',
            uploadMode: 'S3_PRESIGNED',
            expiresInSeconds: 300,
          },
        }),
      })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    global.fetch = fetchMock as any;

    const fakeFile = new File(['hello'], 'proof.pdf', { type: 'application/pdf' });
    const uploaded = await fleetApi.uploadSupportAttachment(fakeFile);

    expect(uploaded.key).toBe('documents/fleet-support/f1/proof.pdf');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toBe('https://r2.example.com/presigned');
  });
});
