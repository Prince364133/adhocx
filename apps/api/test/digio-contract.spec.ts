/**
 * Digio contract tests: the REAL DigioClient builds every request (URL, Basic auth, JSON body,
 * multipart fields) and global.fetch answers with the example responses Digio publishes in its
 * Swagger specs (test/fixtures/digio/*.json, fetched from documentation.digio.in on 2026-11-10).
 * The parsed result then goes through the real DigioService into an in-memory store.
 *
 * Unlike mocking DigioClient methods, these tests fail when our parsing disagrees with what Digio
 * actually returns (e.g. the liveness score scale or face-match verdict keys).
 */
import { BadRequestException, CallHandler, ExecutionContext, HttpException, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { of } from 'rxjs';
import { AuthUserDto, UserRole } from '@adhocx/contracts';
import { DigioClient } from '../src/modules/digio/digio.client';
import { DigioService, AADHAAR_CONSENT_REQUIRED } from '../src/modules/digio/digio.service';
import { DigioRateLimitInterceptor } from '../src/modules/digio/digio-rate-limit.interceptor';
import { RedisService } from '../src/redis/redis.service';
import { AdminService } from '../src/modules/admin/admin.service';

const fx = (name: string, example: string) => require(`./fixtures/digio/${name}.json`).examples[example];

const CLIENT_ID = 'TEST_CLIENT_ID';
const CLIENT_SECRET = 'TEST_CLIENT_SECRET';
const WEBHOOK_SECRET = 'whsec-test-2026';
const BASE = 'https://api.digio.in';

const driver: AuthUserDto = { id: 'u-drv', role: UserRole.DRIVER, phone: '+919876543210', fullName: 'Vikram Singh' } as AuthUserDto;
const admin: AuthUserDto = { id: 'u-adm', role: UserRole.ADMIN, phone: '+919000000001', fullName: 'Admin' } as AuthUserDto;

// ---------------------------------------------------------------------------------------------
// In-memory persistence (only what DigioService/AdminService use)
// ---------------------------------------------------------------------------------------------
function matchWhere(row: any, where: any): boolean {
  if (!where) return true;
  return Object.entries(where).every(([k, v]: [string, any]) => {
    if (k === 'OR') return (v as any[]).some((w) => matchWhere(row, w));
    if (v && typeof v === 'object' && !(v instanceof Date) && 'gte' in v) return row[k] >= v.gte;
    return row[k] === v;
  });
}

function makeDb() {
  const rows: any[] = [];
  const drv = {
    id: 'drv-1',
    userId: driver.id,
    fullName: 'Vikram Singh',
    vehiclePlate: 'DL01AB1234',
    dlFrontUrl: '/uploads/dl.jpg',
    aadharFrontUrl: '/uploads/aadhaar.jpg',
    rcDocUrl: '/uploads/rc.jpg',
    verificationStatus: 'UNDER_REVIEW',
    kycDocuments: {},
  };
  let seq = 0;
  const db: any = {
    rows,
    driverRow: drv,
    digioVerification: {
      create: jest.fn(async ({ data }: any) => {
        const now = new Date(Date.now() + seq++); // strictly increasing createdAt
        const row = { id: `dv_${seq}`, ...data, createdAt: now, updatedAt: now };
        rows.push(row);
        return row;
      }),
      findFirst: jest.fn(async ({ where, orderBy }: any) => {
        const hits = rows.filter((r) => matchWhere(r, where));
        if (orderBy?.createdAt === 'desc') hits.sort((a, b) => b.createdAt - a.createdAt);
        return hits[0] ?? null;
      }),
      findMany: jest.fn(async ({ where }: any) =>
        rows.filter((r) => matchWhere(r, where)).sort((a, b) => b.createdAt - a.createdAt),
      ),
      findUnique: jest.fn(async ({ where }: any) => rows.find((r) => matchWhere(r, where)) ?? null),
      update: jest.fn(async ({ where, data }: any) => Object.assign(rows.find((r) => r.id === where.id), data)),
    },
    driver: {
      findUnique: jest.fn(async ({ where }: any) => (where.userId === drv.userId || where.id === drv.id ? drv : null)),
      update: jest.fn(async ({ data }: any) => Object.assign(drv, data)),
    },
    vendor: { findUnique: jest.fn(async () => null) },
    vehicle: { findUnique: jest.fn(async () => null), findFirst: jest.fn(async () => null), update: jest.fn() },
    user: { findUnique: jest.fn(async () => ({ phone: driver.phone, email: null, fullName: driver.fullName })) },
  };
  return db;
}

// ---------------------------------------------------------------------------------------------
// Real client + service; fetch answered from fixtures
// ---------------------------------------------------------------------------------------------
type Call = { url: string; method: string; headers: Record<string, string>; json?: any; form?: Record<string, string> };

function setup(opts: { webhookSecret?: string } = {}) {
  const cfg: Record<string, any> = {
    'digio.clientId': CLIENT_ID,
    'digio.clientSecret': CLIENT_SECRET,
    'digio.baseUrl': BASE,
    'digio.webhookSecret': opts.webhookSecret,
  };
  const client = new DigioClient({ get: (k: string) => cfg[k] } as any);
  const db = makeDb();
  const storage = {
    readStoredFile: jest.fn(async () => ({ buffer: Buffer.from('img'), mimeType: 'image/jpeg', filename: 'x.jpg' })),
    getFileBuffer: jest.fn(async () => ({ buffer: Buffer.from('img'), mimeType: 'image/jpeg', filename: 'x.jpg' })),
    saveBuffer: jest.fn(async () => '/uploads/masked.jpg'),
    uploadBuffer: jest.fn(async () => ({ url: '/uploads/masked.jpg' })),
  };
  const service = new DigioService(db, client, storage as any);
  const calls: Call[] = [];
  const replies: Array<{ status: number; body: any }> = [];
  const fetchMock = jest.fn(async (url: string, init: any) => {
    const call: Call = { url, method: init.method, headers: init.headers || {} };
    if (typeof init.body === 'string') call.json = JSON.parse(init.body);
    if (init.body instanceof FormData) {
      call.form = {};
      (init.body as FormData).forEach((v, k) => (call.form![k] = typeof v === 'string' ? v : `<file:${(v as any).type}>`));
    }
    calls.push(call);
    const reply = replies.shift() ?? { status: 200, body: {} };
    return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { 'content-type': 'application/json' } });
  });
  (global as any).fetch = fetchMock;
  const reply = (status: number, body: any) => replies.push({ status, body });
  const replyFx = (name: string, example: string) => {
    const e = fx(name, example);
    reply(e.status, e.body);
  };
  return { client, service, db, calls, reply, replyFx, fetchMock };
}

const originalFetch = global.fetch;
afterEach(() => {
  (global as any).fetch = originalFetch;
  delete process.env.DIGIO_REUSE_DAYS;
});

const basicAuth = `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`;

describe('Digio contract: requests match the published API', () => {
  it('PAN: POST /v3/client/kyc/fetch_id_data/PAN with Basic auth and documented JSON fields', async () => {
    const t = setup();
    t.reply(200, { status: 'VALID', name: 'VIKRAM SINGH', category: 'Individual' });
    const rec: any = await t.service.verifyPan(driver, { panNumber: 'abcde1234f', name: 'Vikram Singh', dob: '1990-05-01' } as any);
    const c = t.calls[0];
    expect(c.url).toBe(`${BASE}/v3/client/kyc/fetch_id_data/PAN`);
    expect(c.method).toBe('POST');
    expect(c.headers.Authorization).toBe(basicAuth);
    expect(c.json).toMatchObject({ id_no: 'ABCDE1234F', name: 'Vikram Singh' });
    expect(c.json.unique_request_id).toMatch(/^PAN_/);
    expect(rec).toMatchObject({ verificationType: 'PAN', verified: true, status: 'VERIFIED' });
  });

  it('Vehicle RC: POST /client/v4/apis/verify/vehicle_rc with { id } and parses the documented example', async () => {
    const t = setup();
    t.replyFx('post_getRCDetails', '200 Success');
    const rec: any = await t.service.verifyVehicleRc(driver, { registrationNumber: 'RJ14 XJ-4145' } as any);
    expect(t.calls[0].url).toBe(`${BASE}/client/v4/apis/verify/vehicle_rc`);
    expect(t.calls[0].json).toMatchObject({ id: 'RJ14XJ4145' });
    expect(rec.verificationType).toBe('VEHICLE_RC');
    // The documented example's insurance expired on 2025-10-07: compliance must flag it.
    expect(rec.complianceOk).toBe(false);
    expect(String(rec.complianceNotes)).toMatch(/insurance/i);
  });

  it('Bank: POST /v4/client/verify/bank_account with beneficiary_* fields; account number stored masked', async () => {
    const t = setup();
    t.replyFx('post_verifyBeneficiary_1', '200 Success');
    const rec: any = await t.service.verifyBankAccount(driver, { accountNumber: '123456789012', ifsc: 'sbin0000300', accountHolderName: 'Vikram Singh' } as any);
    const c = t.calls[0];
    expect(c.url).toBe(`${BASE}/v4/client/verify/bank_account`);
    expect(c.json).toMatchObject({ beneficiary_account_no: '123456789012', beneficiary_ifsc: 'SBIN0000300', validation_mode: 'PENNY_LESS' });
    expect(JSON.stringify(t.db.rows)).not.toContain('123456789012');
    expect(rec.identifier).toMatch(/^X+9012@SBIN0000300$/);
  });
});

describe('Digio contract: biometric verdicts follow Digio, not our assumptions', () => {
  it('Liveness FAIL example (score 12, "Photo of photo detected") is NOT live (score is 0-100)', async () => {
    const t = setup();
    t.replyFx('post_livenessCheck', '200 Failure');
    const rec: any = await t.service.checkLivenessBuffer(driver, { buffer: Buffer.from('x'), mimeType: 'image/jpeg', filename: 's.jpg' });
    expect(t.calls[0].url).toBe(`${BASE}/v3/client/kyc/analyze/file/liveness`);
    expect(t.calls[0].form).toMatchObject({ image: '<file:image/jpeg>' });
    expect(rec.verified).toBe(false);
  });

  it('Liveness PASS example is live', async () => {
    const t = setup();
    t.replyFx('post_livenessCheck', '200 Success');
    const rec: any = await t.service.checkLivenessBuffer(driver, { buffer: Buffer.from('x'), mimeType: 'image/jpeg', filename: 's.jpg' });
    expect(rec.verified).toBe(true);
  });

  const img = { buffer: Buffer.from('x'), mimeType: 'image/jpeg', filename: 'a.jpg' };
  it.each([
    ['200 Matched', true],
    ['200 Not Matched', false],
    ['200 Failed', false],
  ])('Face match %s → verified=%s (match_result vs result keys)', async (example, expected) => {
    const t = setup();
    t.replyFx('post_matchFaces', example);
    const rec: any = await t.service.faceMatchBuffers(driver, { file1: img, file2: img });
    expect(t.calls[0].url).toBe(`${BASE}/v3/client/kyc/facematch`);
    expect(Object.keys(t.calls[0].form!)).toEqual(expect.arrayContaining(['file1', 'file2']));
    expect(rec.verified).toBe(expected);
  });

  it('Face match: an explicit not_matched verdict wins over a high score', async () => {
    const t = setup();
    t.reply(200, { confidence: 80, result: 'not_matched' });
    const rec: any = await t.service.faceMatchBuffers(driver, { file1: img, file2: img });
    expect(rec.verified).toBe(false);
  });

  it('PAN with an explicit INVALID status is not verified even when a name comes back', async () => {
    const t = setup();
    t.reply(200, { status: 'INVALID', name: 'SOMEONE ELSE' });
    const rec: any = await t.service.verifyPan(driver, { panNumber: 'ABCDE1234F' } as any);
    expect(rec.verified).toBe(false);
  });
});

describe('Aadhaar consent (UIDAI / DPDP)', () => {
  const aadhaar = { buffer: Buffer.from('x'), mimeType: 'image/jpeg', filename: 'aadhaar.jpg' };

  it('masking without recorded consent is refused before any Digio call', async () => {
    const t = setup();
    await expect(t.service.maskAadhaarFileBuffer(driver, aadhaar)).rejects.toMatchObject({
      response: expect.objectContaining({ error: AADHAAR_CONSENT_REQUIRED }),
    });
    expect(t.fetchMock).not.toHaveBeenCalled();
  });

  it('after consent is recorded, masking calls /v4/client/kyc/aadhaar/file/mask with consent=yes', async () => {
    const t = setup();
    await expect(t.service.recordAadhaarConsent(driver, { accepted: false as any, textVersion: 'AADHAAR_CONSENT_V1' })).rejects.toThrow(
      BadRequestException,
    );
    await t.service.recordAadhaarConsent(driver, { accepted: true, textVersion: 'AADHAAR_CONSENT_V1' }, { ip: '1.2.3.4' });
    expect(await t.service.getAadhaarConsent(driver)).toMatchObject({ granted: true, textVersion: 'AADHAAR_CONSENT_V1' });
    t.replyFx('post_maskAadhaarFile', '200 Success');
    await t.service.maskAadhaarFileBuffer(driver, aadhaar);
    expect(t.calls[0].url).toBe(`${BASE}/v4/client/kyc/aadhaar/file/mask`);
    expect(t.calls[0].form).toMatchObject({ consent: 'yes', file: '<file:image/jpeg>' });
  });

  it('admins cannot bypass the driver\'s consent', async () => {
    const t = setup();
    await expect(t.service.maskAadhaarFileBuffer(admin, aadhaar, { targetDriverId: 'drv-1' })).rejects.toMatchObject({
      response: expect.objectContaining({ error: AADHAAR_CONSENT_REQUIRED }),
    });
    expect(t.fetchMock).not.toHaveBeenCalled();
  });

  it('ID OCR that cannot contain Aadhaar (DL only) needs no consent; default OCR does', async () => {
    const t = setup();
    await expect(t.service.analyzeIdCardFiles(driver, { front: aadhaar })).rejects.toMatchObject({
      response: expect.objectContaining({ error: AADHAAR_CONSENT_REQUIRED }),
    });
    t.replyFx('post_analyzeMultipleFileOcr', '200 Success');
    await t.service.analyzeIdCardFiles(driver, { front: aadhaar, expectedIds: ['DRIVING_LICENCE'] }).catch(() => undefined);
    expect(t.calls[0].url).toBe(`${BASE}/v4/client/kyc/analyze/file/idcard`);
    expect(Object.keys(t.calls[0].form!)).toEqual(expect.arrayContaining(['front_part', 'back_part', 'additional_request']));
  });
});

describe('Billing controls', () => {
  it('a driver re-checking the same PAN reuses the VERIFIED result (no second billed call); admins get a fresh call', async () => {
    const t = setup();
    t.reply(200, { status: 'VALID', name: 'VIKRAM SINGH' });
    await t.service.verifyPan(driver, { panNumber: 'ABCDE1234F' } as any);
    const again: any = await t.service.verifyPan(driver, { panNumber: 'abcde1234f' } as any);
    expect(again.reused).toBe(true);
    expect(t.fetchMock).toHaveBeenCalledTimes(1);

    t.reply(200, { status: 'VALID', name: 'VIKRAM SINGH' });
    const fresh: any = await t.service.verifyPan(admin, { panNumber: 'ABCDE1234F', targetDriverId: 'drv-1' } as any);
    expect(fresh.reused).toBeUndefined();
    expect(t.fetchMock).toHaveBeenCalledTimes(2);
  });

  it('a FAILED result is never reused, and DIGIO_REUSE_DAYS=0 disables reuse', async () => {
    const t = setup();
    t.reply(200, { status: 'INVALID' });
    t.reply(200, { status: 'VALID', name: 'VIKRAM SINGH' });
    await t.service.verifyPan(driver, { panNumber: 'ABCDE1234F' } as any);
    await t.service.verifyPan(driver, { panNumber: 'ABCDE1234F' } as any);
    expect(t.fetchMock).toHaveBeenCalledTimes(2);
    process.env.DIGIO_REUSE_DAYS = '0';
    t.reply(200, { status: 'VALID', name: 'VIKRAM SINGH' });
    await t.service.verifyPan(driver, { panNumber: 'ABCDE1234F' } as any);
    expect(t.fetchMock).toHaveBeenCalledTimes(3);
  });

  function interceptorCtx(user: any, method = 'POST', path = '/api/v1/kyc/digio/pan') {
    const headers: Record<string, string> = {};
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ user, method, route: { path } }), getResponse: () => ({ setHeader: (k: string, v: string) => (headers[k] = v) }) }),
    } as unknown as ExecutionContext;
    return { ctx, headers };
  }
  const next: CallHandler = { handle: () => of('ok') };

  it('rate limit: 11th call within an hour → 429 DIGIO_RATE_LIMITED with Retry-After; admins and GETs exempt', async () => {
    const redis = new RedisService({ get: () => undefined } as any); // in-memory store (no connect)
    const interceptor = new DigioRateLimitInterceptor(redis);
    for (let i = 0; i < 10; i++) await interceptor.intercept(interceptorCtx({ id: 'u1', role: 'DRIVER' }).ctx, next);
    const { ctx, headers } = interceptorCtx({ id: 'u1', role: 'DRIVER' });
    const err: any = await interceptor.intercept(ctx, next).catch((e) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect(err.getStatus()).toBe(429);
    expect(err.getResponse()).toMatchObject({ error: 'DIGIO_RATE_LIMITED' });
    expect(Number(headers['Retry-After'])).toBeGreaterThan(0);
    // other route, admin, GET: unaffected
    await expect(interceptor.intercept(interceptorCtx({ id: 'u1', role: 'DRIVER' }, 'POST', '/api/v1/kyc/digio/dl').ctx, next)).resolves.toBeDefined();
    for (let i = 0; i < 15; i++) await interceptor.intercept(interceptorCtx({ id: 'a1', role: 'ADMIN' }).ctx, next);
    await expect(interceptor.intercept(interceptorCtx({ id: 'u1', role: 'DRIVER' }, 'GET').ctx, next)).resolves.toBeDefined();
  });
});

describe('Webhooks (Digio contract: HMAC-SHA256 hex of raw body, 200 within 10 s, at-least-once)', () => {
  const body = JSON.stringify({ id: 'WH_1', event: 'KYC_REQUEST_COMPLETED', entities: ['kyc_request'], payload: { kyc_request: { id: 'KID_1' } } });
  const sign = (raw: string, secret = WEBHOOK_SECRET) => crypto.createHmac('sha256', secret).update(raw).digest('hex');

  it('rejects a bad checksum (401) and accepts the documented hex checksum', async () => {
    const t = setup({ webhookSecret: WEBHOOK_SECRET });
    await expect(t.service.handleWebhook({ rawBody: Buffer.from(body), checksumHeader: sign(body, 'wrong'), payload: JSON.parse(body) })).rejects.toThrow(
      UnauthorizedException,
    );
    const ok: any = await t.service.handleWebhook({ rawBody: Buffer.from(body), checksumHeader: sign(body), payload: JSON.parse(body) });
    expect(ok).toMatchObject({ acknowledged: true, queued: true });
  });

  it('acknowledges before reconciling with Digio (a slow /response never delays the 200)', async () => {
    const t = setup({ webhookSecret: WEBHOOK_SECRET });
    let release!: () => void;
    const reconcile = jest.spyOn(t.service, 'reconcileWebhookRequest').mockImplementation(() => new Promise((r) => (release = () => r(null))));
    const started = Date.now();
    const ok: any = await t.service.handleWebhook({ rawBody: Buffer.from(body), checksumHeader: sign(body), payload: JSON.parse(body) });
    expect(ok.acknowledged).toBe(true);
    expect(Date.now() - started).toBeLessThan(1000);
    await new Promise((r) => setImmediate(r));
    expect(reconcile).toHaveBeenCalledWith('KID_1');
    release();
  });

  it('duplicate deliveries of the same webhook id are processed once', async () => {
    const t = setup({ webhookSecret: WEBHOOK_SECRET });
    const seen = new Set<string>();
    (t.service as any).redis = { getClient: () => ({ set: async (k: string) => (seen.has(k) ? null : (seen.add(k), 'OK')) }) };
    const reconcile = jest.spyOn(t.service, 'reconcileWebhookRequest').mockResolvedValue(null as any);
    const args = { rawBody: Buffer.from(body), checksumHeader: sign(body), payload: JSON.parse(body) };
    await t.service.handleWebhook(args);
    const dup: any = await t.service.handleWebhook(args);
    await new Promise((r) => setImmediate(r));
    expect(dup.duplicate).toBe(true);
    expect(reconcile).toHaveBeenCalledTimes(1);
  });

  it('production without DIGIO_WEBHOOK_SECRET: acknowledged but ignored (no outbound Digio call)', async () => {
    const saved = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const t = setup();
      const reconcile = jest.spyOn(t.service, 'reconcileWebhookRequest');
      const res: any = await t.service.handleWebhook({ rawBody: Buffer.from(body), payload: JSON.parse(body), remoteIp: '6.6.6.6' });
      await new Promise((r) => setImmediate(r));
      expect(res).toMatchObject({ acknowledged: true, processed: false });
      expect(reconcile).not.toHaveBeenCalled();
      expect(t.fetchMock).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = saved;
    }
  });
});

describe('Admin approval guard', () => {
  function adminService(t: ReturnType<typeof setup>) {
    const audit = { log: jest.fn(async () => undefined) };
    t.db.driver.update = jest.fn(async ({ data }: any) => Object.assign(t.db.driverRow, data));
    return { svc: new AdminService(t.db, audit as any, undefined, undefined, undefined, t.service), audit };
  }

  it('blocks approval while blockers exist; an override reason (>= 10 chars) approves and is audited', async () => {
    const t = setup();
    t.replyFx('post_livenessCheck', '200 Failure');
    await t.service.checkLivenessBuffer(driver, { buffer: Buffer.from('x'), mimeType: 'image/jpeg', filename: 's.jpg' });
    const { svc, audit } = adminService(t);

    const err: any = await svc.verifyDriver('drv-1', admin.id, {} as any).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    const resp = err.getResponse();
    expect(resp.error).toBe('COMPLIANCE_BLOCKERS');
    expect(resp.details.issues.map((i: any) => i.code)).toEqual(expect.arrayContaining(['LIVENESS_FAILED', 'DL_NOT_VERIFIED', 'RC_NOT_VERIFIED']));
    expect(t.db.driverRow.verificationStatus).toBe('UNDER_REVIEW');

    await expect(svc.verifyDriver('drv-1', admin.id, { overrideReason: 'too short' } as any)).rejects.toThrow(BadRequestException);

    await svc.verifyDriver('drv-1', admin.id, { overrideReason: 'Verified DL and RC physically at hub; selfie retaken in person.' } as any);
    expect(t.db.driverRow.verificationStatus).toBe('VERIFIED');
    const meta = (audit.log.mock.calls[0] as any)[0].metadata;
    expect(meta.complianceOverride.reason).toMatch(/physically/);
    expect(meta.complianceOverride.blockers.length).toBeGreaterThan(0);
  });
});
