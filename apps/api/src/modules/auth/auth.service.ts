import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import {
  RequestOtpDto,
  RequestOtpResponseDto,
  VerifyOtpDto,
  AuthResponseDto,
  UserMeResponseDto,
  UserRole,
} from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async requestOtp(dto: RequestOtpDto): Promise<RequestOtpResponseDto> {
    const phone = dto.phone.trim();
    if (!phone) {
      throw new BadRequestException('Phone number is required');
    }

    // 1. Rate limiting: max 3 requests per 10 minutes (600s)
    const rateLimit = await this.redis.checkRateLimit(`otp_req:${phone}`, 3, 600);
    if (!rateLimit.allowed) {
      throw new BadRequestException('Too many OTP requests. Please try again in a few minutes.');
    }

    // 2. Resend delay check (30s)
    const recentRequest = await this.redis.get(`otp_delay:${phone}`);
    if (recentRequest) {
      throw new BadRequestException('Please wait 30 seconds before requesting another OTP.');
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    // Deterministic dev OTP or random 6 digits
    const isDev = this.configService.get<string>('app.nodeEnv') === 'development';
    const otp = isDev ? '123456' : Math.floor(100000 + Math.random() * 900000).toString();
    const expirySeconds = this.configService.get<number>('auth.otpExpirySeconds') || 300;
    const expiresAt = Date.now() + expirySeconds * 1000;

    // Store OTP in Redis
    await this.redis.set(`otp:${requestId}:${phone}`, otp, expirySeconds);
    // Set 30s resend delay
    await this.redis.set(`otp_delay:${phone}`, '1', 30);

    this.logger.log(`OTP generated for ${phone}: ${isDev ? otp : '[PROTECTED]'}`);

    return {
      requestId,
      expiresAt: new Date(expiresAt).toISOString(),
      retryAfterSeconds: this.configService.get<number>('auth.otpResendDelaySeconds') || 30,
    };
  }

  async verifyOtp(dto: VerifyOtpDto): Promise<AuthResponseDto> {
    const { requestId, phone, otp } = dto;
    const trimmedPhone = phone.trim();
    const cachedOtp = await this.redis.get(`otp:${requestId}:${trimmedPhone}`);

    const isDev = this.configService.get<string>('app.nodeEnv') === 'development';
    const isMasterOtp = isDev && otp === '123456';

    if (!isMasterOtp && (!cachedOtp || cachedOtp !== otp)) {
      throw new UnauthorizedException('Invalid or expired OTP code');
    }

    // Invalidate used OTP
    await this.redis.del(`otp:${requestId}:${trimmedPhone}`);

    // Find or create user
    let user = await this.db.user.findUnique({
      where: { phone: trimmedPhone },
      include: { vendor: true, driver: true },
    });

    if (!user) {
      user = await this.db.user.create({
        data: {
          phone: trimmedPhone,
          role: UserRole.DRIVER,
        },
        include: { vendor: true, driver: true },
      });
    }

    const tokenPayload = {
      id: user.id,
      phone: user.phone,
      role: user.role,
    };

    const accessSecret = this.configService.get<string>('auth.jwtAccessSecret') || 'dev_access_secret_adhocx_2026';
    const refreshSecret = this.configService.get<string>('auth.jwtRefreshSecret') || 'dev_refresh_secret_adhocx_2026';

    const accessToken = await this.jwtService.signAsync(tokenPayload, {
      secret: accessSecret,
      expiresIn: this.configService.get<string>('auth.jwtAccessExpiresIn') || '1h',
    });

    const refreshToken = await this.jwtService.signAsync(tokenPayload, {
      secret: refreshSecret,
      expiresIn: this.configService.get<string>('auth.jwtRefreshExpiresIn') || '30d',
    });

    return {
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role as UserRole,
        fullName: user.fullName || undefined,
        isApproved: user.driver ? user.driver.verificationStatus === 'VERIFIED' : true,
      },
    };
  }

  async logout(accessToken: string): Promise<void> {
    // Blacklist access token for 1 hour
    await this.redis.blacklistToken(accessToken, 3600);
    this.logger.log('User logged out and token invalidated');
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    const refreshSecret = this.configService.get<string>('auth.jwtRefreshSecret') || 'dev_refresh_secret_adhocx_2026';
    let payload: any;
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, { secret: refreshSecret });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.db.user.findUnique({
      where: { id: payload.id },
      include: { vendor: true, driver: true },
    });

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const tokenPayload = {
      id: user.id,
      phone: user.phone,
      role: user.role,
    };

    const accessSecret = this.configService.get<string>('auth.jwtAccessSecret') || 'dev_access_secret_adhocx_2026';
    const newAccessToken = await this.jwtService.signAsync(tokenPayload, {
      secret: accessSecret,
      expiresIn: this.configService.get<string>('auth.jwtAccessExpiresIn') || '1h',
    });

    const newRefreshToken = await this.jwtService.signAsync(tokenPayload, {
      secret: refreshSecret,
      expiresIn: this.configService.get<string>('auth.jwtRefreshExpiresIn') || '30d',
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role as UserRole,
        fullName: user.fullName || undefined,
        isApproved: user.driver ? user.driver.verificationStatus === 'VERIFIED' : true,
      },
    };
  }

  async getCurrentUser(userId: string): Promise<UserMeResponseDto> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: { vendor: true, driver: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      phone: user.phone,
      role: user.role as UserRole,
      fullName: user.fullName || undefined,
      status: user.status,
      vendorProfile: user.vendor ? {
        id: user.vendor.id,
        organizationName: user.vendor.organizationName,
        verificationStatus: user.vendor.verificationStatus,
      } : undefined,
      driverProfile: user.driver ? {
        id: user.driver.id,
        verificationStatus: user.driver.verificationStatus,
        availabilityStatus: user.driver.availabilityStatus,
        vehicleType: user.driver.vehicleType || undefined,
        walletBalance: Number(user.driver.walletBalance),
      } : undefined,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
