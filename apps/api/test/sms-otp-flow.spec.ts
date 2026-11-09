import * as path from 'path';
import * as dotenv from 'dotenv';
// Load root .env file for the live integration test
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Msg91Service } from '../src/modules/notifications/msg91.service';
import { NotificationsService } from '../src/modules/notifications/notifications.service';
import { AuthService } from '../src/modules/auth/auth.service';
import { DatabaseService } from '../src/database/database.service';
import { RedisService } from '../src/redis/redis.service';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@adhocx/contracts';

describe('Live SMS OTP Dispatch & Verification Flow', () => {
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
              MSG91_AUTH_KEY: process.env.MSG91_AUTH_KEY || '566812Axr8m5zl8a6aec3551P1',
              MSG91_OTP_TEMPLATE_ID: process.env.MSG91_OTP_TEMPLATE_ID || '6aec3196704f112ad8019976',
              MSG91_SENDER_ID: process.env.MSG91_SENDER_ID || 'ADHOCX',
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

  describe('Step 1: Msg91Service Live Dispatch', () => {
    it('should be configured with the live MSG91 credentials', () => {
      expect(msg91Service.isConfigured()).toBe(true);
      expect(['6aecb09fbde8179f65068242', '6aec3196704f112ad8019976']).toContain(msg91Service.getOtpTemplateId());
      expect(msg91Service.getAuthKey()).toBe('566812Axr8m5zl8a6aec3551P1');
    });

    it('should dispatch live OTP to MSG91 Flow API and receive HTTP 200 messageId', async () => {
      const testPhone = '9876543210';
      const testOtp = '749201';

      const result = await msg91Service.sendOtp(testPhone, testOtp);

      expect(result.success).toBe(true);
      expect(result.simulated).toBe(false);
      expect(result.messageId).toBeDefined();
      expect(result.response?.type).toBe('success');
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
