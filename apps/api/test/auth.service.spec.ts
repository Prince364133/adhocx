import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { AuthService } from '../src/modules/auth/auth.service';
import { DatabaseService } from '../src/database/database.service';
import { RedisService } from '../src/redis/redis.service';
import { UserRole } from '@adhocx/contracts';

import { NotificationsService } from '../src/modules/notifications/notifications.service';

describe('AuthService Unit Tests', () => {
  let service: AuthService;
  let db: any;
  let jwt: any;
  let redis: any;
  let notifications: any;

  beforeEach(async () => {
    db = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    jwt = {
      signAsync: jest.fn().mockResolvedValue('test_token'),
      verifyAsync: jest.fn(),
    };

    redis = {
      checkRateLimit: jest.fn().mockResolvedValue({ allowed: true, remaining: 2, resetAfter: 600 }),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      del: jest.fn().mockResolvedValue(undefined),
      blacklistToken: jest.fn().mockResolvedValue(undefined),
      isTokenBlacklisted: jest.fn().mockResolvedValue(false),
    };

    notifications = {
      sendOtp: jest.fn().mockResolvedValue({ success: true, channel: 'SMS', messageId: 'msg_1' }),
      sendSms: jest.fn().mockResolvedValue({ success: true }),
      sendEmail: jest.fn().mockResolvedValue({ success: true }),
      sendPush: jest.fn().mockResolvedValue({ success: true }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: DatabaseService, useValue: db },
        { provide: JwtService, useValue: jwt },
        { provide: RedisService, useValue: redis },
        { provide: NotificationsService, useValue: notifications },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'app.nodeEnv') return 'development';
              if (key === 'auth.otpTtlSeconds') return 300;
              if (key === 'auth.otpResendDelaySeconds') return 30;
              if (key === 'auth.jwtAccessSecret') return 'test_secret';
              if (key === 'auth.jwtAccessExpiresIn') return '15m';
              if (key === 'auth.jwtRefreshSecret') return 'test_refresh_secret';
              if (key === 'auth.jwtRefreshExpiresIn') return '7d';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should request OTP and return request ID and expiry', async () => {
    const result = await service.requestOtp({ phone: '+919876543210' });
    expect(result).toBeDefined();
    expect(result.requestId).toBeDefined();
    expect(result.retryAfterSeconds).toBe(30);
    expect(result.expiresAt).toBeDefined();
    expect(redis.checkRateLimit).toHaveBeenCalled();
    expect(redis.set).toHaveBeenCalled();
  });

  it('should reject OTP request when rate limit is exceeded', async () => {
    redis.checkRateLimit.mockResolvedValueOnce({ allowed: false, remaining: 0, resetAfter: 600 });
    await expect(service.requestOtp({ phone: '+919876543210' })).rejects.toThrow(BadRequestException);
  });

  it('should verify OTP and create new user if not exists', async () => {
    const otpRes = await service.requestOtp({ phone: '+919876543210' });
    const sentOtp = (notifications.sendOtp as jest.Mock).mock.calls[0][0].otp;
    redis.get.mockResolvedValue(sentOtp);

    db.user.findFirst.mockResolvedValue(null);
    db.user.findUnique.mockResolvedValue(null);
    db.user.create.mockResolvedValue({
      id: 'usr-1',
      phone: '+919876543210',
      role: UserRole.DRIVER,
      fullName: null,
      driver: null,
      vendor: null,
    });

    const result = await service.verifyOtp({
      requestId: otpRes.requestId,
      phone: '+919876543210',
      otp: sentOtp,
    });

    expect(result.accessToken).toBe('test_token');
    expect(result.user.id).toBe('usr-1');
  });

  it('should reject incorrect OTP', async () => {
    const otpRes = await service.requestOtp({ phone: '+919876543210' });
    redis.get.mockResolvedValueOnce('123456');

    await expect(
      service.verifyOtp({
        requestId: otpRes.requestId,
        phone: '+919876543210',
        otp: '999999',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should blacklist token on logout', async () => {
    await service.logout('jwt_sample_token');
    expect(redis.blacklistToken).toHaveBeenCalledWith('jwt_sample_token', 3600);
  });

  it('should retrieve current user profile', async () => {
    db.user.findUnique.mockResolvedValue({
      id: 'usr-1',
      phone: '+919876543210',
      role: UserRole.DRIVER,
      fullName: 'Test Driver',
      status: 'ACTIVE',
      driver: {
        id: 'drv-1',
        verificationStatus: 'VERIFIED',
        availabilityStatus: 'AVAILABLE',
        walletBalance: 1250.50,
      },
      createdAt: new Date(),
    });

    const user = await service.getCurrentUser('usr-1');
    expect(user.id).toBe('usr-1');
    expect(user.driverProfile?.verificationStatus).toBe('VERIFIED');
    expect(user.driverProfile?.walletBalance).toBe(1250.50);
  });

  it('should enforce 1-Account 1-Role rule on registration when mobile is already registered with another role', async () => {
    db.user.findFirst.mockResolvedValueOnce({
      id: 'existing-driver',
      phone: '+919876543210',
      role: UserRole.DRIVER,
    });

    await expect(
      service.requestOtp({
        phone: '+919876543210',
        role: 'VENDOR',
        isRegister: true,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should enforce 1-Account 1-Role rule on registration when email is already registered with another role', async () => {
    db.user.findFirst.mockResolvedValueOnce({
      id: 'existing-vendor',
      email: 'vendor@company.com',
      role: UserRole.VENDOR,
    });

    await expect(
      service.requestOtp({
        email: 'vendor@company.com',
        role: 'DRIVER',
        isRegister: true,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should create user without generating fake random phone number during social auth', async () => {
    db.user.findFirst.mockResolvedValueOnce(null); // no existing user
    db.user.create.mockImplementationOnce(({ data }: any) => {
      return {
        id: 'new-social-user',
        email: data.email,
        phone: data.phone,
        role: data.role,
        fullName: data.fullName,
      };
    });

    const res = await service.socialAuth({
      provider: 'GOOGLE',
      email: 'newuser@gmail.com',
      fullName: 'New User',
      role: 'VENDOR',
    });

    expect(res.user.email).toBe('newuser@gmail.com');
    // Ensure phone was NOT generated with a fake random number like +916...
    expect(res.user.phone).toBeUndefined();
    expect(db.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          phone: undefined,
        }),
      }),
    );
  });

  it('should reject social auth if account already exists with a different role', async () => {
    db.user.findFirst.mockResolvedValueOnce({
      id: 'existing-driver',
      email: 'driver@gmail.com',
      role: UserRole.DRIVER,
    });

    await expect(
      service.socialAuth({
        provider: 'GOOGLE',
        email: 'driver@gmail.com',
        role: 'VENDOR',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('should reject login if user role does not match requested role', async () => {
    db.user.findFirst.mockResolvedValueOnce({
      id: 'existing-driver',
      phone: '+919876543210',
      passwordHash: 'salt:key',
      role: UserRole.DRIVER,
    });
    jest.spyOn(service as any, 'verifyPassword').mockReturnValue(true);

    await expect(
      service.login({
        identifier: '+919876543210',
        password: 'Password123!',
        role: 'VENDOR',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
