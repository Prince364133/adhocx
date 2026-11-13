/**
 * SMS OTP flow, end to end through Msg91Service -> NotificationsService -> AuthService.
 *
 * The MSG91 HTTP API is MOCKED: this suite must never send a real SMS. (It used to load the repo's
 * .env, carry a live AuthKey in source and text +91 98765 43210 on every test run.)
 * A real delivery check is opt-in only: set MSG91_AUTH_KEY and MSG91_LIVE_SMOKE_PHONE (your own
 * number) to run the "live smoke" test at the bottom.
 */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Msg91Service } from '../src/modules/notifications/msg91.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { DatabaseService } from '../src/database/database.service';
import { RedisService } from '../src/redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@adhocx/contracts';

const TEST_AUTH_KEY = 'test_msg91_auth_key_flow';
const msg91Ok = (id = 'msg91-mock-id') =>
  ({ ok: true, status: 200, json: async () => ({ message: id, type: 'success' }) }) as any;

describe('SMS OTP Dispatch & Verification Flow (MSG91 mocked)', () => {
  let fetchSpy: jest.SpyInstance;
  beforeAll(() => {
    process.env.MSG91_SEND_IN_TEST = 'true'; // network is mocked below
    process.env.MSG91_AUTH_KEY = TEST_AUTH_KEY; // fake key (test/setup.ts blanks the real one)
  });
  afterAll(() => {
    delete process.env.MSG91_SEND_IN_TEST;
    process.env.MSG91_AUTH_KEY = '';
  });
  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch' as any).mockResolvedValue(msg91Ok());
  });
  afterEach(() => fetchSpy.mockRestore());

  let msg91Service: Msg91Service;
  let notificationsService: NotificationsService;
  let authService: AuthService;

  // In-memory Redis simulation store for the test
  const memoryCache = new Map<string, string>();

  beforeAll(async () => {
    const mockDb = {
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'usr-test-sms-1',
            phone: data.phone,
            role: data.role || UserRole.DRIVER,
            status: 'ACTIVE',
            fullName: data.fullName || 'Test Commuter',
            driver: null,
            vendor: null,
          }),
        ),
      },
      notificationPreference: {
        findUnique: jest.fn().mockResolvedValue({ smsEnabled: true }),
      },
    };

    const mockRedis = {
      checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 5, resetAfter: 600 }),
      set: jest.fn().mockImplementation((key, val) => {
        memoryCache.set(key, val);
        return Promise.resolve('OK');
      }),
      get: jest.fn().mockImplementation((key) => Promise.resolve(memoryCache.get(key) || null)),
      del: jest.fn().mockImplementation((key) => {
        memoryCache.delete(key);
        return Promise.resolve(1);
      }),
      blacklistToken: jest.fn().mockResolvedValue('OK'),
      isTokenBlacklisted: jest.fn().mockResolvedValue(false),
    };

    const mockJwt = {
      signAsync: jest.fn().mockResolvedValue('jwt_access_token_sms_verified'),
    };

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              MSG91_AUTH_KEY: TEST_AUTH_KEY,
              MSG91_OTP_TEMPLATE_ID: '6aec3196704f112ad8019976',
              MSG91_SENDER_ID: 'ADHOCX',
              MSG91_ENABLED: 'true',
            }),
          ],
        }),
      ],
      providers: [
        Msg91Service,
        NotificationsService,
        AuthService,
        { provide: DatabaseService, useValue: mockDb },
        { provide: RedisService, useValue: mockRedis },
        { provide: JwtService, useValue: mockJwt },
      ],
    }).compile();

    msg91Service = module.get<Msg91Service>(Msg91Service);
    notificationsService = module.get<NotificationsService>(NotificationsService);
    authService = module.get<AuthService>(AuthService);
  });

  describe('Step 1: Msg91Service dispatch', () => {
    it('is configured from config (no key in source)', () => {
      expect(msg91Service.isConfigured()).toBe(true);
      expect(['6aecb09fbde8179f65068242', '6aec3196704f112ad8019976']).toContain(msg91Service.getOtpTemplateId());
      expect(msg91Service.getAuthKey()).toBe(TEST_AUTH_KEY);
    });

    it('dispatches the OTP to the MSG91 Flow API and returns its messageId', async () => {
      const testPhone = '9876543210';
      const testOtp = '749201';

      const result = await msg91Service.sendOtp(testPhone, testOtp);

      expect(result.success).toBe(true);
      expect(result.simulated).toBe(false);
      expect(result.messageId).toBeDefined();
      expect(result.response?.type).toBe('success');
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://control.msg91.com/api/v5/flow/',
        expect.objectContaining({ headers: expect.objectContaining({ authkey: TEST_AUTH_KEY }) }),
      );
    }, 15000);
  });

  describe('Step 2: NotificationsService Integration', () => {
    it('should route SMS OTP dispatch through Msg91Service', async () => {
      const result = await notificationsService.sendOtp({
        phone: '+919876543210',
        otp: '852963',
        channel: 'SMS',
      });

      expect(result.success).toBe(true);
      expect(result.channel).toBe('SMS');
      expect(result.messageId).toBeDefined();
    }, 15000);

    it('should route general transactional SMS notification', async () => {
      const result = await notificationsService.sendSms(
        '9876543210',
        '852963',
        { templateId: '6aec3196704f112ad8019976', variables: { num: '852963' } },
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    }, 15000);
  });

  describe('Step 3: End-to-End AuthService OTP Request and Verification', () => {
    it('should request SMS OTP with separate country code, dispatch to MSG91, and verify correctly', async () => {
      // 1. Request OTP via SMS
      const requestRes = await authService.requestOtp({
        countryCode: '+91',
        phone: '9876543210',
        channel: 'SMS',
        role: 'DRIVER',
      });

      expect(requestRes.requestId).toBeDefined();
      expect(requestRes.expiresAt).toBeDefined();
      expect(requestRes.retryAfterSeconds).toBe(30);

      // 2. Retrieve generated OTP from Redis store
      const cachedOtp = memoryCache.get(`otp_direct:+919876543210`);
      expect(cachedOtp).toBeDefined();
      expect(cachedOtp).toHaveLength(6);

      // 3. Verify OTP using countryCode + phone
      const verifyRes = await authService.verifyOtp({
        requestId: requestRes.requestId,
        countryCode: '+91',
        phone: '9876543210',
        otp: cachedOtp!,
      });

      expect(verifyRes.accessToken).toBe('jwt_access_token_sms_verified');
      expect(verifyRes.user.phone).toBe('+919876543210');
    }, 20000);
  });
});

// Opt-in real delivery check. Skipped unless the owner explicitly provides a key AND their own phone.
const LIVE_PHONE = process.env.MSG91_LIVE_SMOKE_PHONE;
const liveDescribe = LIVE_PHONE && process.env.MSG91_AUTH_KEY ? describe : describe.skip;
liveDescribe('MSG91 live smoke (opt-in: MSG91_LIVE_SMOKE_PHONE)', () => {
  it('delivers one real OTP SMS to the configured phone', async () => {
    process.env.MSG91_SEND_IN_TEST = 'true';
    try {
      const config = { get: (k: string, d?: string) => process.env[k] ?? d } as any;
      const result = await new Msg91Service(config).sendOtp(LIVE_PHONE!, '000000');
      expect(result.simulated).toBe(false);
      expect(result.success).toBe(true);
    } finally {
      delete process.env.MSG91_SEND_IN_TEST;
    }
  }, 20000);
});
