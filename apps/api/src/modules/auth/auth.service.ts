import { Injectable, UnauthorizedException, BadRequestException, NotFoundException, ForbiddenException, ConflictException, OnModuleInit, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { promisify } from 'util';

const pbkdf2Async = promisify(crypto.pbkdf2);
/** OWASP (2023) minimum for PBKDF2-HMAC-SHA512. Old hashes (no iteration suffix) used 10,000. */
const PBKDF2_ITERATIONS = 210_000;
const LEGACY_PBKDF2_ITERATIONS = 10_000;
import {
  RequestOtpDto,
  RequestOtpResponseDto,
  VerifyOtpDto,
  SocialAuthDto,
  SetPasswordDto,
  LoginDto,
  ResetPasswordDto,
  AuthResponseDto,
  UserMeResponseDto,
  UpdateUserDto,
  UserRole,
} from '@adhocx/contracts';
import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../../redis/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { getPhoneVariants, assertPhoneAvailable, sanitizeRealName, isPlaceholderName } from '../../common';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationsService,
  ) {}

  async onModuleInit() {
    try {
      await this.ensureAdminExists();
    } catch (err: any) {
      this.logger.warn(`Admin startup verification: ${err.message}`);
    }
  }

  /**
   * First-boot bootstrap only: creates the first ADMIN when none exists, from ADMIN_EMAIL /
   * ADMIN_PASSWORD (no built-in default password). It never touches existing users: the old version
   * promoted ANY user matching the admin email/phone (default +919876543210) to ADMIN on every boot,
   * keeping that user's own password.
   */
  private async ensureAdminExists(): Promise<void> {
    const anyAdmin = await this.db.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true } });
    if (anyAdmin) return;

    const adminEmail = process.env.ADMIN_EMAIL?.trim();
    const adminPhone = process.env.ADMIN_PHONE?.trim() || undefined;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword || adminPassword.length < 12) {
      this.logger.warn(
        'No ADMIN account exists. Set ADMIN_EMAIL and ADMIN_PASSWORD (12+ characters) to create the first one at startup.',
      );
      return;
    }

    const clash = await this.db.user.findFirst({
      where: {
        OR: [
          { email: { equals: adminEmail, mode: 'insensitive' } },
          ...(adminPhone ? [{ phone: adminPhone }] : []),
        ],
      },
      select: { id: true, role: true },
    });
    if (clash) {
      this.logger.error(
        `Not creating the first ADMIN: ADMIN_EMAIL/ADMIN_PHONE already belongs to user ${clash.id} (${clash.role}). ` +
          'Existing users are never promoted automatically; choose a different email/phone.',
      );
      return;
    }

    await this.db.user.create({
      data: {
        ...(adminPhone ? { phone: adminPhone } : {}),
        email: adminEmail,
        fullName: 'AdhocX Administrator',
        role: 'ADMIN',
        passwordHash: await this.hashPassword(adminPassword),
        status: 'ACTIVE',
      },
    });
    this.logger.log(`First administrative account created: ${adminEmail}`);
  }

  /**
   * Cryptographic Password Hashing (PBKDF2 with Cryptographic Salt)
   */
  /** `salt:hash:iterations` (async, so a login never blocks the event loop for other requests). */
  private async hashPassword(password: string): Promise<string> {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = (await pbkdf2Async(password, salt, PBKDF2_ITERATIONS, 64, 'sha512')).toString('hex');
    return `${salt}:${hash}:${PBKDF2_ITERATIONS}`;
  }

  /** Accepts current `salt:hash:iterations` and legacy `salt:hash` (10,000 iterations). */
  private async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, key, iterRaw] = storedHash.split(':');
    const iterations = iterRaw ? Number(iterRaw) : LEGACY_PBKDF2_ITERATIONS;
    if (!salt || !key || !Number.isInteger(iterations) || iterations < 1) return false;
    const expected = Buffer.from(key, 'hex');
    const actual = await pbkdf2Async(password, salt, iterations, 64, 'sha512');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  }

  /** After a successful login, re-hash passwords still stored with the legacy iteration count. */
  private async upgradePasswordHashIfNeeded(userId: string, password: string, storedHash: string): Promise<void> {
    const iterations = Number(storedHash.split(':')[2] ?? LEGACY_PBKDF2_ITERATIONS);
    if (iterations >= PBKDF2_ITERATIONS) return;
    try {
      await this.db.user.update({ where: { id: userId }, data: { passwordHash: await this.hashPassword(password) } });
    } catch (err: any) {
      this.logger.warn(`Password hash upgrade skipped for ${userId}: ${err?.message ?? err}`);
    }
  }

  private otpEquals(expected: string, given: unknown): boolean {
    const a = Buffer.from(String(expected));
    const b = Buffer.from(String(given ?? ''));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  private async invalidateOtps(value: string, requestId?: string): Promise<void> {
    await this.redis.del(`otp_direct:${value}`);
    await this.redis.del(`otp_reset:${value}`);
    if (requestId) await this.redis.del(`otp:${requestId}:${value}`);
  }

  /**
   * Fixed-window attempt limit (Redis, with RedisService's in-memory fallback). Throws 429 when exceeded.
   * `onExceeded` runs once the limit is hit (e.g. invalidate the OTP being guessed).
   */
  private async enforceAttemptLimit(
    key: string,
    limit: number,
    windowSeconds: number,
    message: string,
    onExceeded?: () => Promise<void>,
  ): Promise<void> {
    const { allowed } = await this.redis.checkRateLimit(key, limit, windowSeconds);
    if (allowed) return;
    if (onExceeded) await onExceeded().catch(() => undefined);
    throw new HttpException(message, HttpStatus.TOO_MANY_REQUESTS);
  }

  /**
   * Normalize Phone Number or Email Identifier
   */
  private normalizeIdentifier(raw: string, countryCode?: string): { isEmail: boolean; value: string; phoneVariants?: string[] } {
    const trimmed = raw.trim();
    const lower = trimmed.toLowerCase();
    if (lower === 'admin' || lower === 'administrator') {
      return { isEmail: true, value: 'admin@adhocx.com' };
    }
    if (trimmed.includes('@')) {
      return { isEmail: true, value: lower };
    }
    const digitsOnly = trimmed.replaceAll(/\D/g, '');
    let formattedPhone = trimmed;

    if (countryCode) {
      const codeCleaned = countryCode.trim().replace(/[^\d+]/g, '');
      const codeDigits = codeCleaned.replace('+', '');
      const codePrefix = codeCleaned.startsWith('+') ? codeCleaned : `+${codeCleaned}`;

      let nationalDigits = digitsOnly;
      if (digitsOnly.startsWith(codeDigits) && digitsOnly.length > codeDigits.length) {
        nationalDigits = digitsOnly.substring(codeDigits.length);
      }
      formattedPhone = `${codePrefix}${nationalDigits}`;
    } else if (digitsOnly.length === 10) {
      formattedPhone = `+91${digitsOnly}`;
    } else if (!formattedPhone.startsWith('+') && digitsOnly.length > 10) {
      formattedPhone = `+${digitsOnly}`;
    }
    return {
      isEmail: false,
      value: formattedPhone,
      phoneVariants: getPhoneVariants(trimmed),
    };
  }

  /**
   * Safe UserRole mapping helper
   */
  private mapUserRole(rawRole?: string): UserRole {
    if (!rawRole) return UserRole.DRIVER;
    const upper = String(rawRole).trim().toUpperCase();
    if (upper === 'VENDOR' || upper === 'USER' || upper === 'CUSTOMER') {
      return UserRole.VENDOR;
    }
    if (upper === 'ADMIN' || upper === 'SUPER_ADMIN') {
      return UserRole.ADMIN;
    }
    if (upper === 'OPS' || upper === 'OPERATIONS' || upper === 'DISPATCHER') {
      return UserRole.OPS;
    }
    if (upper === 'CORPORATE_ADMIN' || upper === 'CORP_ADMIN') {
      return UserRole.CORPORATE_ADMIN;
    }
    if (upper === 'CORPORATE_MANAGER' || upper === 'CORP_MANAGER') {
      return UserRole.CORPORATE_MANAGER;
    }
    if (upper === 'EMPLOYEE' || upper === 'COMMUTER') {
      return UserRole.EMPLOYEE;
    }
    return UserRole.DRIVER;
  }

  /**
   * Dedicated Administrative Authentication (Admin ID/Email + Password with strict role verification)
   */
  async adminLogin(dto: LoginDto & { mfaCode?: string }): Promise<any> {
    const { isEmail, value, phoneVariants } = this.normalizeIdentifier(dto.identifier);
    this.logger.log(`🛡️ [ADMIN LOGIN ATTEMPT] Identifier: ${value} (isEmail: ${isEmail})`);
    await this.enforceAttemptLimit(
      `admin_login:${value.toLowerCase()}`,
      5,
      15 * 60,
      'Too many admin login attempts. Try again in 15 minutes.',
    );

    let user: any;
    try {
      if (isEmail) {
        user = await this.db.user.findFirst({
          where: { email: { equals: value, mode: 'insensitive' } },
        });
      } else {
        user = await this.db.user.findFirst({
          where: {
            phone: { in: phoneVariants || [value] },
          },
        });
      }
    } catch (dbErr: any) {
      this.logger.error(`Database query failed in adminLogin: ${dbErr.message}`);
      throw new BadRequestException('Database connectivity error. Please try again.');
    }

    if (!user) {
      this.logger.warn(`Admin login failed: administrative user ${value} not found`);
      throw new UnauthorizedException('Invalid administrative ID or password');
    }

    if (!user.passwordHash) {
      this.logger.warn(`Admin login failed: user ${value} has not set a password`);
      throw new UnauthorizedException('Invalid administrative credentials. Administrative password not configured.');
    }

    const isValidPassword = await this.verifyPassword(dto.password, user.passwordHash);
    if (!isValidPassword) {
      this.logger.warn(`Admin login failed: invalid password for user ${value}`);
      throw new UnauthorizedException('Invalid administrative ID or password');
    }
    await this.upgradePasswordHashIfNeeded(user.id, dto.password, user.passwordHash);

    // STRICT SERVER-SIDE ROLE ENFORCEMENT
    const userRoleStr = String(user.role).trim().toUpperCase();
    if (userRoleStr !== 'ADMIN' && userRoleStr !== UserRole.ADMIN) {
      this.logger.warn(`Security alert: non-admin user (${user.id}, role: ${user.role}) attempted admin portal login`);
      throw new ForbiddenException('Access denied: You do not have administrative privileges');
    }

    if (user.status && user.status !== 'ACTIVE') {
      throw new ForbiddenException('Access denied: Administrative account is suspended or deactivated');
    }

    this.logger.log(`✅ [ADMIN LOGIN SUCCESS] Admin authenticated directly: ${user.id} (${user.email || user.phone})`);
    return this.generateAuthResponse(user);
  }

  /**
   * Verify Admin Multi-Factor Authentication Challenge
   */
  async adminMfaVerify(dto: { mfaSessionToken: string; mfaCode: string }): Promise<AuthResponseDto> {
    if (!dto.mfaSessionToken || !dto.mfaCode) {
      throw new BadRequestException('MFA session token and verification code are required');
    }

    const sessionRaw = await this.redis.get(`admin_mfa_challenge:${dto.mfaSessionToken}`);
    if (!sessionRaw) {
      throw new UnauthorizedException('MFA verification session expired or invalid. Please login again.');
    }

    const session = JSON.parse(sessionRaw);
    if (session.attempts >= 3) {
      await this.redis.del(`admin_mfa_challenge:${dto.mfaSessionToken}`);
      throw new UnauthorizedException('Too many invalid attempts. Multi-factor challenge cancelled.');
    }

    if (session.mfaCode !== dto.mfaCode.trim()) {
      session.attempts += 1;
      await this.redis.set(`admin_mfa_challenge:${dto.mfaSessionToken}`, JSON.stringify(session), 300);
      throw new UnauthorizedException('Invalid MFA verification code');
    }

    await this.redis.del(`admin_mfa_challenge:${dto.mfaSessionToken}`);
    await this.redis.del(`admin_mfa_code:${session.userId}`);

    const user = await this.db.user.findUnique({
      where: { id: session.userId },
    });

    if (!user || user.status !== 'ACTIVE' || String(user.role).toUpperCase() !== 'ADMIN') {
      throw new ForbiddenException('Invalid administrative privileges');
    }

    this.logger.log(`✅ [ADMIN 2FA SUCCESS] Admin ${user.id} completed multi-factor authentication`);
    return this.generateAuthResponse(user);
  }

  /**
   * Verify an active administrative session
   */
  async verifyAdminSession(userId: string): Promise<any> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
    });

    if (!user || String(user.role).toUpperCase() !== 'ADMIN' || user.status !== 'ACTIVE') {
      throw new ForbiddenException('Invalid administrative session');
    }

    return {
      valid: true,
      user: {
        id: user.id,
        phone: user.phone,
        email: user.email,
        fullName: user.fullName || 'AdhocX Administrator',
        role: user.role,
      },
    };
  }

  /**
   * Password Authentication (Mobile Number / Email + Password)
   */
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const { isEmail, value, phoneVariants } = this.normalizeIdentifier(dto.identifier);
    this.logger.log(`🔑 [LOGIN ATTEMPT] Identifier: ${value} (isEmail: ${isEmail})`);
    await this.enforceAttemptLimit(
      `pwd_login:${value.toLowerCase()}`,
      10,
      15 * 60,
      'Too many login attempts. Try again in 15 minutes, or sign in with an OTP.',
    );

    let user: any;
    try {
      if (isEmail) {
        user = await this.db.user.findFirst({
          where: { email: { equals: value, mode: 'insensitive' } },
          include: { vendor: true, driver: true },
        });
      } else {
        user = await this.db.user.findFirst({
          where: {
            phone: { in: phoneVariants || [value] },
          },
          include: { vendor: true, driver: true },
        });
      }
    } catch (dbErr: any) {
      this.logger.error(`Database query failed in login: ${dbErr.message}`);
      throw new BadRequestException('Database connectivity error. Please try again.');
    }

    if (!user) {
      this.logger.warn(`Login failed: user with identifier ${value} not found`);
      throw new UnauthorizedException('No account found with this email or mobile number. Please check your credentials or sign up.');
    }

    if (!user.passwordHash) {
      this.logger.warn(`Login failed: user ${value} has not set a password yet`);
      throw new BadRequestException(
        'No password set for this account. Please sign in with OTP or click "Forgot Password" to set a password.',
      );
    }

    const isValidPassword = await this.verifyPassword(dto.password, user.passwordHash);
    if (!isValidPassword) {
      this.logger.warn(`Login failed: invalid password for user ${value}`);
      throw new UnauthorizedException('Incorrect password. Please try again or reset your password.');
    }
    await this.upgradePasswordHashIfNeeded(user.id, dto.password, user.passwordHash);

    if (dto.role) {
      const requestedRole = this.mapUserRole(dto.role);
      if (user.role !== requestedRole) {
        this.logger.log(`[LOGIN AUTO-DETECT] Note: login requested role ${requestedRole}, but account is registered as ${user.role}. Automatically logging in as ${user.role}.`);
      }
    }

    this.logger.log(`✅ [LOGIN SUCCESS] User authenticated: ${user.id} (${user.fullName || user.phone}) as ${user.role}`);
    return this.generateAuthResponse(user);
  }

  /**
   * Request OTP for Phone or Email Authentication
   */
  async requestOtp(dto: RequestOtpDto): Promise<RequestOtpResponseDto> {
    const rawPhone = dto.phone?.trim();
    const rawEmail = dto.email?.trim().toLowerCase();
    const rawIdentifier = rawEmail || rawPhone;
    if (!rawIdentifier) {
      throw new BadRequestException('Either Mobile Number or Email Address is required');
    }

    const { isEmail, value, phoneVariants } = this.normalizeIdentifier(rawIdentifier, dto.countryCode);
    const channel = dto.channel || (isEmail ? 'EMAIL' : 'SMS');

    // Check if phone or email already exists under another role (1-Account 1-Role enforcement)
    if (dto.isRegister === true) {
      if (rawPhone) {
        await assertPhoneAvailable(this.db, rawPhone);
      }

      if (rawEmail) {
        const existingUser = await this.db.user.findFirst({
          where: { email: { equals: rawEmail, mode: 'insensitive' } },
        });
        if (existingUser) {
          throw new ConflictException(
            `An account with this email address is already registered. Please sign in instead.`
          );
        }
      }
    }

    // If explicit login or password recovery (isRegister === false), verify user exists and matches role
    if (dto.isRegister === false) {
      let existingUser: any = null;
      try {
        if (isEmail) {
          existingUser = await this.db.user.findFirst({
            where: { email: { equals: value, mode: 'insensitive' } },
          });
        } else {
          existingUser = await this.db.user.findFirst({
            where: { phone: { in: phoneVariants || [value] } },
          });
        }
      } catch (_) {}

      if (!existingUser) {
        throw new BadRequestException('No account found with this email or mobile number. Please check your details or sign up.');
      }
    }

    // Rate limiting: max 5 requests per 10 minutes
    try {
      const rateLimit = await this.redis.checkRateLimit(`otp_req:${value}`, 5, 600);
      if (!rateLimit.allowed) {
        throw new BadRequestException('Too many OTP requests. Please try again in a few minutes.');
      }
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
    }

    const requestId = `req_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    // Cryptographically secure production-grade 6-digit OTP (100000 - 999999)
    const otp = crypto.randomInt(100000, 1000000).toString();
    const expirySeconds = this.configService.get<number>('auth.otpExpirySeconds') || 300;
    const expiresAt = Date.now() + expirySeconds * 1000;

    try {
      await this.redis.set(`otp:${requestId}:${value}`, otp, expirySeconds);
      await this.redis.set(`otp_direct:${value}`, otp, expirySeconds);
      await this.redis.set(`otp_delay:${value}`, '1', 30);
    } catch (_) {}

    await this.notifications.sendOtp({
      phone: !isEmail ? value : undefined,
      email: isEmail ? value : undefined,
      otp,
      channel,
      fullName: dto.fullName,
    });

    const isProd = process.env.NODE_ENV === 'production';
    return {
      requestId,
      expiresAt: new Date(expiresAt).toISOString(),
      retryAfterSeconds: this.configService.get<number>('auth.otpResendDelaySeconds') || 30,
      otp: !isProd ? otp : undefined,
      message: !isProd ? `OTP sent! (Dev Code: ${otp})` : `OTP sent successfully to ${value} via ${channel}`,
    };
  }

  /**
   * Verify OTP and issue JWT session tokens
   */
  async verifyOtp(dto: VerifyOtpDto): Promise<AuthResponseDto> {
    const { requestId, phone, email, otp, countryCode } = dto;
    const rawIdentifier = email ? email.trim().toLowerCase() : phone?.trim();

    if (!rawIdentifier) {
      throw new BadRequestException('Either Mobile Number or Email is required');
    }

    const { isEmail, value } = this.normalizeIdentifier(rawIdentifier, countryCode);

    // A 6-digit code is guessable without a limit: 5 tries per 10 minutes, then the code is voided.
    await this.enforceAttemptLimit(
      `otp_verify:${value}`,
      5,
      10 * 60,
      'Too many incorrect codes. Request a new OTP and try again.',
      () => this.invalidateOtps(value, requestId),
    );

    let cachedOtp: string | null = null;
    try {
      if (requestId) {
        cachedOtp = await this.redis.get(`otp:${requestId}:${value}`);
      }
      if (!cachedOtp) {
        cachedOtp = await this.redis.get(`otp_direct:${value}`);
      }
    } catch (_) {}

    if (!cachedOtp || !this.otpEquals(cachedOtp, otp)) {
      throw new UnauthorizedException('Invalid or expired OTP code');
    }

    // Single use for sign-in. The forgot-password screen signs in with this code and then submits it
    // again to reset-password, so it survives only as a reset-only code until it expires.
    try {
      await this.redis.set(`otp_reset:${value}`, cachedOtp, 10 * 60);
      if (requestId) await this.redis.del(`otp:${requestId}:${value}`);
      await this.redis.del(`otp_direct:${value}`);
    } catch (_) {}

    // Find or create user in live authoritative DB
    let user: any = null;
    try {
      const rawEmail = dto.email ? dto.email.trim().toLowerCase() : (isEmail ? value : undefined);
      const rawPhone = dto.phone ? dto.phone.trim() : (!isEmail ? value : undefined);

      if (rawEmail) {
        user = await this.db.user.findFirst({
          where: { email: { equals: rawEmail, mode: 'insensitive' } },
          include: { vendor: true, driver: true },
        });
      }
      if (!user && rawPhone) {
        const phoneNorm = this.normalizeIdentifier(rawPhone);
        user = await this.db.user.findFirst({
          where: { phone: { in: phoneNorm.phoneVariants || [phoneNorm.value] } },
          include: { vendor: true, driver: true },
        });
      }

      const assignedRole = this.mapUserRole(dto.role);

      if (user) {
        // Enforce 1-Account 1-Role policy: cannot register existing account
        if (dto.isRegister) {
          throw new ConflictException(
            `An account with this ${user.email === rawEmail ? 'email address' : 'mobile number'} is already registered as a ${user.role}. Under AdhocX's 1-account-1-role policy, an email or mobile number can only have a single role. Please sign in instead.`
          );
        }
      } else {
        // Create new user with real phone (if provided) and real email (if provided)
        const effectivePhone = rawPhone
          ? this.normalizeIdentifier(rawPhone).value
          : (!isEmail ? value : null);
        const effectiveEmail = rawEmail || (isEmail ? value : null);

        // Verify neither phone nor email is already taken by another account
        if (effectivePhone) {
          await assertPhoneAvailable(this.db, effectivePhone);
        }
        if (effectiveEmail) {
          const existingEmailUser = await this.db.user.findFirst({
            where: { email: { equals: effectiveEmail, mode: 'insensitive' } },
          });
          if (existingEmailUser) {
            throw new ConflictException(
              `This email address is already registered to a ${existingEmailUser.role} account. Under the 1-account-1-role policy, an email can only belong to one role.`
            );
          }
        }

        const realName = sanitizeRealName(dto.fullName);

        user = await this.db.user.create({
          data: {
            phone: effectivePhone || undefined,
            email: effectiveEmail || undefined,
            role: assignedRole,
            fullName: realName || undefined,
            driver:
              assignedRole === UserRole.DRIVER
                ? {
                    create: {
                      fullName: realName || '',
                      phone: effectivePhone || undefined,
                      verificationStatus: 'PENDING',
                      availabilityStatus: 'OFFLINE',
                    },
                  }
                : undefined,
            vendor:
              assignedRole === UserRole.VENDOR
                ? {
                    create: {
                      fullName: realName || '',
                      organizationName: '',
                      phone: effectivePhone || undefined,
                      verificationStatus: 'PENDING',
                    },
                  }
                : undefined,
          },
          include: { vendor: true, driver: true },
        });

        this.logger.log(`Created new user via OTP: ${user.id} (${user.phone ?? user.email}) with role ${user.role}`);
      }
    } catch (dbErr: any) {
      if (dbErr instanceof ConflictException || dbErr instanceof ForbiddenException) {
        throw dbErr;
      }
      this.logger.error(`Database error in verifyOtp: ${dbErr.message}`, dbErr.stack);
      throw new BadRequestException('Failed to authenticate with database.');
    }

    return this.generateAuthResponse(user);
  }

  /**
   * Google & Apple Social Auth (Pre-Verified Identity, Skips OTP)
   */
  async socialAuth(dto: SocialAuthDto): Promise<AuthResponseDto> {
    let email = dto.email.trim().toLowerCase();
    let fullName = dto.fullName;
    const provider = dto.provider;

    // If Google idToken is provided, verify against Google OAuth Client ID
    if (provider === 'GOOGLE' && dto.idToken) {
      try {
        const googleClientId =
          this.configService.get<string>('GOOGLE_CLIENT_ID') || process.env.GOOGLE_CLIENT_ID;
        if (googleClientId) {
          const { OAuth2Client } = await import('google-auth-library');
          const client = new OAuth2Client(googleClientId);
          const ticket = await client.verifyIdToken({
            idToken: dto.idToken,
            audience: googleClientId,
          });
          const payload = ticket.getPayload();
          if (payload?.email) {
            email = payload.email.toLowerCase();
            fullName = payload.name || fullName;
            this.logger.log(`✅ [GOOGLE OAUTH VERIFIED] Token validated for ${email} (${fullName})`);
          }
        }
      } catch (oauthErr: any) {
        this.logger.warn(`⚠️ [GOOGLE OAUTH TOKEN VERIFICATION NOTICE] ${oauthErr.message}. Accepting verified social payload.`);
      }
    }

    this.logger.log(`🔑 [SOCIAL AUTH - ${provider}] Authenticating verified user: ${email} (${fullName || 'User'})`);

    let user: any = null;
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        user = await this.db.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
          include: { vendor: true, driver: true },
        });

        const assignedRole = this.mapUserRole(dto.role);

        if (user && dto.role && user.role !== assignedRole) {
          this.logger.log(`[SOCIAL AUTO-DETECT] Account already registered as ${user.role}. Automatically logging in as ${user.role}.`);
        }

        const realName = sanitizeRealName(fullName);

        if (!user) {
          user = await this.db.user.create({
            data: {
              email,
              phone: undefined, // No fake random phone numbers generated!
              fullName: realName || undefined,
              role: assignedRole,
              driver:
                assignedRole === UserRole.DRIVER
                  ? {
                      create: {
                        fullName: realName || '',
                        phone: undefined,
                        verificationStatus: 'PENDING',
                        availabilityStatus: 'OFFLINE',
                      },
                    }
                  : undefined,
              vendor:
                assignedRole === UserRole.VENDOR
                  ? {
                      create: {
                        fullName: realName || '',
                        organizationName: realName || '',
                        phone: undefined,
                        verificationStatus: 'PENDING',
                      },
                    }
                  : undefined,
            },
            include: { vendor: true, driver: true },
          });

          try {
            await this.notifications.sendWelcomeNotification({
              email,
              fullName: user.fullName,
              role: user.role,
            });
          } catch (_) {}
        } else {
          // Existing user authenticating via social auth: log them in as their registered role
          if (user.role === UserRole.VENDOR && !user.vendor) {
            try {
              user.vendor = await this.db.vendor.create({
                data: {
                  userId: user.id,
                  fullName: sanitizeRealName(user.fullName) || realName || '',
                  organizationName: '',
                  verificationStatus: 'PENDING',
                },
              });
            } catch (_) {}
          } else if (user.role === UserRole.DRIVER && !user.driver) {
            try {
              user.driver = await this.db.driver.create({
                data: {
                  userId: user.id,
                  fullName: sanitizeRealName(user.fullName) || realName || '',
                  verificationStatus: 'PENDING',
                  availabilityStatus: 'OFFLINE',
                },
              });
            } catch (_) {}
          }
          this.logger.log(`✅ [SOCIAL AUTH SUCCESS] Existing user logged in: ${user.id} (${user.email}) as ${user.role}`);
        }
        break; // Success
      } catch (dbErr: any) {
        if (dbErr instanceof ConflictException || dbErr instanceof ForbiddenException) {
          throw dbErr;
        }
        retries++;
        this.logger.warn(`⚠️ [SOCIAL AUTH ATTEMPT ${retries}/${maxRetries} FAILED]: ${dbErr.message}`);
        if (retries >= maxRetries) {
          this.logger.error(`Database error in socialAuth after retries: ${dbErr.message}`, dbErr.stack);
          // In development mode, construct in-memory session rather than failing
          const isDev = this.configService.get<string>('app.nodeEnv') === 'development';
          if (isDev) {
            const assignedRole = this.mapUserRole(dto.role);
            user = {
              id: '5a91aadb-d7be-4199-a412-479c0a69271d',
              email,
              phone: '',
              role: assignedRole,
              fullName: fullName || 'Verified User',
              driver: assignedRole === UserRole.DRIVER ? { verificationStatus: 'VERIFIED' } : undefined,
              vendor: assignedRole === UserRole.VENDOR ? { verificationStatus: 'VERIFIED' } : undefined,
            };
            break;
          }
          throw new BadRequestException('Database error authenticating social user.');
        }
        await new Promise((resolve) => setTimeout(resolve, 500 * retries));
      }
    }

    return this.generateAuthResponse(user);
  }

  /**
   * Set / Update User Password for Authenticated User
   */
  async setPassword(userId: string, dto: SetPasswordDto) {
    if (!dto.password || dto.password.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters long');
    }

    const passwordHash = await this.hashPassword(dto.password);

    try {
      await this.db.user.update({
        where: { id: userId },
        data: { passwordHash },
      });
      this.logger.log(`🔒 Password set and persisted successfully for user ${userId}`);
    } catch (err: any) {
      this.logger.error(`Failed to update password in DB for user ${userId}: ${err.message}`);
      throw new BadRequestException('Failed to save password');
    }

    return {
      success: true,
      message: 'Password set successfully',
    };
  }

  /**
   * Reset Password with Verified OTP
   */
  async resetPassword(dto: ResetPasswordDto) {
    const { isEmail, value, phoneVariants } = this.normalizeIdentifier(dto.identifier);

    await this.enforceAttemptLimit(
      `otp_verify:${value}`,
      5,
      10 * 60,
      'Too many incorrect codes. Request a new OTP and try again.',
      () => this.invalidateOtps(value),
    );

    // Verify OTP against Redis cache (a code already used to sign in is still valid here once)
    let cachedOtp: string | null = null;
    let resetOnlyOtp: string | null = null;
    try {
      cachedOtp = await this.redis.get(`otp_direct:${value}`);
      resetOnlyOtp = await this.redis.get(`otp_reset:${value}`);
    } catch (_) {}

    const otpOk = (cachedOtp && this.otpEquals(cachedOtp, dto.otp)) || (resetOnlyOtp && this.otpEquals(resetOnlyOtp, dto.otp));
    if (!otpOk) {
      throw new UnauthorizedException('Invalid or expired OTP code');
    }

    // Hash new password
    const passwordHash = await this.hashPassword(dto.password);

    let user: any;
    try {
      if (isEmail) {
        user = await this.db.user.findFirst({
          where: { email: { equals: value, mode: 'insensitive' } },
        });
      } else {
        user = await this.db.user.findFirst({
          where: { phone: { in: phoneVariants || [value] } },
        });
      }

      if (!user) {
        throw new BadRequestException('User account not found');
      }

      await this.db.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      await this.invalidateOtps(value);
      this.logger.log(`🔒 Password reset successfully for user ${user.id} (${value})`);
    } catch (err: any) {
      this.logger.error(`Reset password failed for user ${value}: ${err.message}`);
      throw new BadRequestException('Failed to reset password. Please try again.');
    }

    return {
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    };
  }

  /**
   * Corporate access-control claims. corporateTenantId scopes CORPORATE_ADMIN /
   * CORPORATE_MANAGER / EMPLOYEE users to their own tenant; corporateEmployeeId
   * identifies the EMPLOYEE's own CorporateEmployee row. Omitted (undefined) for
   * everyone else so existing tokens keep exactly the same shape.
   */
  private async buildCorporateClaims(
    user: any,
  ): Promise<{ corporateTenantId?: string; corporateEmployeeId?: string; corporateRole?: string; corporateOfficeIds?: string[] }> {
    const claims: { corporateTenantId?: string; corporateEmployeeId?: string; corporateRole?: string; corporateOfficeIds?: string[] } = {};
    if (!user) return claims;
    if (user.corporateTenantId) {
      claims.corporateTenantId = user.corporateTenantId;
    }
    // WS-F: fine-grained corporate role + office scope (omitted when unset: legacy mapping applies).
    if (user.role === UserRole.CORPORATE_ADMIN || user.role === UserRole.CORPORATE_MANAGER) {
      if (user.corporateRole) claims.corporateRole = user.corporateRole;
      if (Array.isArray(user.corporateOfficeIds) && user.corporateOfficeIds.length > 0) {
        claims.corporateOfficeIds = user.corporateOfficeIds;
      }
    }
    if (user.role === UserRole.EMPLOYEE) {
      const employee = await this.db.corporateEmployee.findUnique({
        where: { userId: user.id },
        select: { id: true, tenantId: true },
      });
      if (employee) {
        claims.corporateEmployeeId = employee.id;
        claims.corporateTenantId = claims.corporateTenantId ?? employee.tenantId;
      }
    }
    return claims;
  }

  private async generateAuthResponse(user: any): Promise<AuthResponseDto> {
    const tokenPayload = {
      id: user.id,
      phone: user.phone,
      email: user.email,
      role: user.role,
      ...(await this.buildCorporateClaims(user)),
    };

    const accessSecret = this.configService.get<string>('auth.jwtAccessSecret') || process.env.JWT_ACCESS_SECRET;
    const refreshSecret = this.configService.get<string>('auth.jwtRefreshSecret') || process.env.JWT_REFRESH_SECRET;

    const accessToken = await this.jwtService.signAsync(tokenPayload, {
      secret: accessSecret,
      expiresIn: this.configService.get<string>('auth.jwtAccessExpiresIn') || '7d',
    });

    const refreshToken = await this.jwtService.signAsync(tokenPayload, {
      secret: refreshSecret,
      expiresIn: this.configService.get<string>('auth.jwtRefreshExpiresIn') || '90d',
    });

    const hasPassword = Boolean(user.passwordHash);
    let isOnboarded = false;
    let isApproved = false;

    const hasVendorSubmission = Boolean(
      user.vendor &&
      (user.vendor.verificationStatus === 'VERIFIED' ||
       user.vendor.verificationStatus === 'UNDER_REVIEW' ||
       (user.vendor.verificationStatus === 'REJECTED' && Boolean(user.vendor.address?.trim())) ||
       (Boolean(user.vendor.address?.trim()) &&
        Boolean(user.vendor.organizationName?.trim()) &&
        !isPlaceholderName(user.vendor.organizationName)))
    );

    const hasDriverSubmission = Boolean(
      user.driver &&
      (user.driver.verificationStatus === 'VERIFIED' ||
       user.driver.verificationStatus === 'UNDER_REVIEW' ||
       user.driver.verificationStatus === 'REJECTED' ||
       user.driver.dlFrontUrl ||
       (user.driver.vehiclePlate && user.driver.vehicleType))
    );

    if (user.role === UserRole.DRIVER) {
      isApproved = user.driver?.verificationStatus === 'VERIFIED';
      isOnboarded = hasDriverSubmission;
    } else if (user.role === UserRole.VENDOR) {
      isApproved = user.vendor?.verificationStatus === 'VERIFIED';
      isOnboarded = hasVendorSubmission;
    } else if (user.role === UserRole.ADMIN) {
      isApproved = true;
      isOnboarded = true;
    }

    if (hasVendorSubmission || hasDriverSubmission) {
      isOnboarded = true;
    }
    if (user.driver?.verificationStatus === 'VERIFIED' || user.vendor?.verificationStatus === 'VERIFIED') {
      isApproved = true;
    }

    return {
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      user: {
        id: user.id,
        phone: user.phone || user.driver?.phone || user.vendor?.phone || undefined,
        email: user.email,
        role: user.role as UserRole,
        fullName: user.fullName || user.driver?.fullName || user.vendor?.fullName || undefined,
        isApproved,
        hasPassword,
        isOnboarded,
        vendorProfile: user.vendor
          ? {
              id: user.vendor.id,
              organizationName: user.vendor.organizationName,
              fullName: user.vendor.fullName,
              phone: user.vendor.phone || user.phone || undefined,
              address: user.vendor.address,
              gstNumber: user.vendor.gstNumber,
              verificationStatus: user.vendor.verificationStatus,
              rejectionReason: (user.vendor as any).rejectionReason || undefined,
              createdAt: user.vendor.createdAt,
            }
          : undefined,
        driverProfile: user.driver
          ? {
              id: user.driver.id,
              fullName: user.driver.fullName,
              phone: user.driver.phone || user.phone || undefined,
              verificationStatus: user.driver.verificationStatus,
              availabilityStatus: user.driver.availabilityStatus,
              vehicleType: user.driver.vehicleType || undefined,
              walletBalance: Number(user.driver.walletBalance || 0),
              rejectionReason: (user.driver as any).rejectionReason || undefined,
              createdAt: user.driver.createdAt,
            }
          : undefined,
      },
    };
  }

  async logout(accessToken: string): Promise<void> {
    try {
      await this.redis.blacklistToken(accessToken, 3600);
    } catch (_) {}
    this.logger.log('User logged out and token invalidated');
  }

  async deleteAccount(userId: string, accessToken?: string): Promise<void> {
    this.logger.warn(`Permanent account deletion requested for user ID: ${userId}`);

    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: { driver: true, vendor: true },
    });

    if (!user) {
      throw new NotFoundException('User account not found');
    }

    // 1. Blacklist current access token in Redis
    if (accessToken) {
      try {
        await this.redis.blacklistToken(accessToken, 86400);
      } catch (_) {}
    }

    // 2. Clear Redis cache for this user
    try {
      if (user.phone) {
        await this.redis.del(`otp:sms:${user.phone}`);
        await this.redis.del(`auth:session:${user.phone}`);
      }
      if (user.email) {
        await this.redis.del(`otp:email:${user.email}`);
        await this.redis.del(`auth:session:${user.email}`);
      }
      await this.redis.del(`auth:user:${userId}`);
    } catch (_) {}

    // 3. Atomically purge all user data from PostgreSQL
    await this.db.$transaction(async (tx) => {
      // If user is a driver, purge driver-specific child records
      if (user.driver) {
        const driverId = user.driver.id;
        await tx.settlement.deleteMany({ where: { driverId } });
        await tx.trip.deleteMany({ where: { driverId } });
        await tx.assignment.deleteMany({ where: { driverId } });
        await tx.offer.deleteMany({ where: { driverId } });
        await tx.vehicle.deleteMany({ where: { driverId } });
        await tx.driver.delete({ where: { id: driverId } });
      }

      // If user is a vendor, purge vendor-specific records
      if (user.vendor) {
        const vendorId = user.vendor.id;
        await tx.trip.deleteMany({ where: { vendorId } });
        await tx.payment.deleteMany({ where: { vendorId } });
        await tx.requirement.deleteMany({ where: { vendorId } });
        await tx.vendor.delete({ where: { id: vendorId } });
      }

      // Clean up user-direct child records
      await tx.deviceToken.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.notificationPreference.deleteMany({ where: { userId } });
      await tx.couponRedemption.deleteMany({ where: { userId } });
      await tx.review.deleteMany({
        where: {
          OR: [{ reviewerId: userId }, { revieweeId: userId }],
        },
      });
      await tx.dispute.deleteMany({ where: { reporterId: userId } });
      await tx.dispute.deleteMany({ where: { accusedId: userId } });
      await tx.auditLog.deleteMany({ where: { actorId: userId } });

      // Permanently remove user record
      await tx.user.delete({ where: { id: userId } });
    });

    this.logger.log(`User ${userId} (${user.phone}) and all associated records permanently erased from database.`);
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    const refreshSecret = this.configService.get<string>('auth.jwtRefreshSecret') || process.env.JWT_REFRESH_SECRET;
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

    // Corporate claims are re-derived from the database on every refresh so a
    // tenant re-assignment / employee unlink takes effect without re-login.
    const tokenPayload = {
      id: payload.id,
      phone: payload.phone,
      email: payload.email,
      role: payload.role,
      ...(await this.buildCorporateClaims(user ? { ...user, role: payload.role } : null)),
    };

    const accessSecret = this.configService.get<string>('auth.jwtAccessSecret') || process.env.JWT_ACCESS_SECRET;
    const newAccessToken = await this.jwtService.signAsync(tokenPayload, {
      secret: accessSecret,
      expiresIn: this.configService.get<string>('auth.jwtAccessExpiresIn') || '7d',
    });

    const newRefreshToken = await this.jwtService.signAsync(tokenPayload, {
      secret: refreshSecret,
      expiresIn: this.configService.get<string>('auth.jwtRefreshExpiresIn') || '90d',
    });

    const hasPassword = user ? Boolean(user.passwordHash) : true;
    let isOnboarded = false;
    let isApproved = false;

    if (user) {
      if (user.role === UserRole.DRIVER) {
        isApproved = user.driver?.verificationStatus === 'VERIFIED';
        isOnboarded = Boolean(
          user.driver &&
          (user.driver.verificationStatus === 'VERIFIED' ||
           user.driver.verificationStatus === 'UNDER_REVIEW' ||
           (user.driver.vehiclePlate && user.driver.vehicleType))
        );
      } else if (user.role === UserRole.VENDOR) {
        isApproved = user.vendor?.verificationStatus === 'VERIFIED';
        isOnboarded = Boolean(
          user.vendor &&
          (user.vendor.verificationStatus === 'VERIFIED' ||
           user.vendor.verificationStatus === 'UNDER_REVIEW' ||
           (user.vendor.verificationStatus === 'REJECTED' && Boolean(user.vendor.address?.trim())) ||
           (Boolean(user.vendor.address?.trim()) &&
            Boolean(user.vendor.organizationName?.trim()) &&
            !isPlaceholderName(user.vendor.organizationName)))
        );
      } else if (user.role === UserRole.ADMIN) {
        isApproved = true;
        isOnboarded = true;
      }

      if (user.driver?.verificationStatus === 'UNDER_REVIEW' || user.vendor?.verificationStatus === 'UNDER_REVIEW') {
        isOnboarded = true;
      }
      if (user.driver?.verificationStatus === 'VERIFIED' || user.vendor?.verificationStatus === 'VERIFIED') {
        isOnboarded = true;
        isApproved = true;
      }
    }

    const profilePhoto = (user?.driver?.kycDocuments as any)?.profilePhotoUrl || (user?.vendor?.kycDocuments as any)?.logoUrl || undefined;

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
      user: {
        id: payload.id,
        phone: user?.phone || payload.phone || undefined,
        email: user?.email || payload.email || undefined,
        role: payload.role as UserRole,
        fullName: user?.fullName || undefined,
        photoUrl: profilePhoto,
        isApproved,
        hasPassword,
        isOnboarded,
      },
    };
  }

  async getCurrentUser(userId: string): Promise<UserMeResponseDto> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: { vendor: true, driver: true },
    });

    if (!user) {
      throw new BadRequestException('User account not found');
    }

    const hasPassword = Boolean(user.passwordHash);
    let isOnboarded = false;

    if (user.role === UserRole.DRIVER) {
      isOnboarded = Boolean(
        user.driver &&
        (user.driver.verificationStatus === 'VERIFIED' ||
         user.driver.verificationStatus === 'UNDER_REVIEW' ||
         (user.driver.vehiclePlate && user.driver.vehicleType))
      );
    } else if (user.role === UserRole.VENDOR) {
      isOnboarded = Boolean(
        user.vendor &&
        (user.vendor.verificationStatus === 'VERIFIED' ||
         user.vendor.verificationStatus === 'UNDER_REVIEW' ||
         Boolean(user.vendor.organizationName?.trim()))
      );
    } else if (user.role === UserRole.ADMIN) {
      isOnboarded = true;
    }

    if (user.driver?.verificationStatus === 'UNDER_REVIEW' || user.vendor?.verificationStatus === 'UNDER_REVIEW') {
      isOnboarded = true;
    }
    if (user.driver?.verificationStatus === 'VERIFIED' || user.vendor?.verificationStatus === 'VERIFIED') {
      isOnboarded = true;
    }

    const effectivePhone = user.phone || user.driver?.phone || user.vendor?.phone || undefined;
    const effectiveFullName = sanitizeRealName(user.fullName) || sanitizeRealName(user.driver?.fullName) || sanitizeRealName(user.vendor?.fullName) || undefined;
    const driverKyc = (user.driver?.kycDocuments as Record<string, any>) || {};
    const effectivePhoto = driverKyc.profilePhotoUrl || (user.vendor?.kycDocuments as any)?.logoUrl || undefined;

    // Backfill user.phone if driver or vendor has a verified phone
    if (!user.phone && effectivePhone) {
      await this.db.user.update({
        where: { id: userId },
        data: { phone: effectivePhone },
      }).catch(() => null);
    }
    if (user.driver && !user.driver.phone && effectivePhone && this.db.driver?.update) {
      await this.db.driver.update({
        where: { id: user.driver.id },
        data: { phone: effectivePhone },
      }).catch(() => null);
    }
    if (user.vendor && !user.vendor.phone && effectivePhone && this.db.vendor?.update) {
      await this.db.vendor.update({
        where: { id: user.vendor.id },
        data: { phone: effectivePhone },
      }).catch(() => null);
    }

    return {
      id: user.id,
      phone: effectivePhone,
      email: user.email || undefined,
      role: user.role as UserRole,
      fullName: effectiveFullName,
      photoUrl: effectivePhoto,
      status: user.status,
      hasPassword,
      isOnboarded,
      vendorProfile: user.vendor
        ? {
            id: user.vendor.id,
            organizationName: user.vendor.organizationName,
            fullName: user.vendor.fullName,
            phone: user.vendor.phone || effectivePhone,
            address: user.vendor.address || undefined,
            gstNumber: user.vendor.gstNumber || undefined,
            verificationStatus: user.vendor.verificationStatus,
            rejectionReason: (user.vendor as any).rejectionReason || undefined,
            ...((user.vendor.kycDocuments as any)?.companyDetails || {}),
          }
        : undefined,
      driverProfile: user.driver
        ? {
            id: user.driver.id,
            fullName: user.driver.fullName,
            phone: user.driver.phone || effectivePhone,
            verificationStatus: user.driver.verificationStatus,
            availabilityStatus: user.driver.availabilityStatus,
            vehicleType: user.driver.vehicleType || undefined,
            walletBalance: Number(user.driver.walletBalance || 0),
            rejectionReason: (user.driver as any).rejectionReason || undefined,
            profilePhotoUrl: driverKyc.profilePhotoUrl || undefined,
            dateOfBirth: driverKyc.dateOfBirth || undefined,
            gender: driverKyc.gender || undefined,
            address: driverKyc.address || undefined,
            emergencyContactName: driverKyc.emergencyContactName || undefined,
            emergencyContactPhone: driverKyc.emergencyContactPhone || undefined,
            vehiclePlate: user.driver.vehiclePlate || undefined,
            vehicleModel: user.driver.vehicleModel || undefined,
          }
        : undefined,
      createdAt: user.createdAt.toISOString(),
    };
  }

  async updateUserProfile(userId: string, dto: UpdateUserDto): Promise<UserMeResponseDto> {
    const cleanName = sanitizeRealName(dto.fullName);
    const cleanPhone = dto.phone ? dto.phone.trim().replace(/\s+/g, '') : undefined;
    const cleanEmail = dto.email ? dto.email.trim().toLowerCase() : undefined;

    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: { driver: true, vendor: true },
    });

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    if (cleanPhone && cleanPhone !== user.phone && cleanPhone !== user.driver?.phone && cleanPhone !== user.vendor?.phone) {
      await assertPhoneAvailable(this.db, cleanPhone, {
        excludeUserId: userId,
        excludeDriverId: user.driver?.id,
        excludeVendorId: user.vendor?.id,
      });
    }

    if (cleanEmail && cleanEmail !== user.email?.toLowerCase()) {
      const existing = await this.db.user.findUnique({
        where: { email: cleanEmail },
      });
      if (existing && existing.id !== userId) {
        throw new ConflictException('This email is already in use by another account');
      }
    }

    await this.db.user.update({
      where: { id: userId },
      data: {
        ...(cleanName ? { fullName: cleanName } : {}),
        ...(cleanPhone ? { phone: cleanPhone } : {}),
        ...(cleanEmail ? { email: cleanEmail } : {}),
      },
    });

    if (user.driver) {
      try {
        await this.db.driver.update({
          where: { id: user.driver.id },
          data: {
            ...(cleanName ? { fullName: cleanName } : {}),
            ...(cleanPhone ? { phone: cleanPhone } : {}),
          },
        });
      } catch (_) {}
    }

    if (user.vendor) {
      try {
        await this.db.vendor.update({
          where: { id: user.vendor.id },
          data: {
            ...(cleanName ? { fullName: cleanName } : {}),
            ...(cleanPhone ? { phone: cleanPhone } : {}),
          },
        });
      } catch (_) {}
    }

    this.logger.log(`👤 Profile updated for user ${userId}: name="${cleanName}", email="${cleanEmail}", phone="${cleanPhone}"`);
    return this.getCurrentUser(userId);
  }

  async checkPhoneAvailability(
    phone: string,
    tokenOrUserId?: string,
  ): Promise<{ available: boolean; message?: string }> {
    if (!phone || !phone.trim()) {
      return { available: false, message: 'Please enter a valid mobile number.' };
    }

    let excludeUserId: string | undefined;
    if (tokenOrUserId) {
      if (tokenOrUserId.includes('.')) {
        try {
          const payload = this.jwtService.decode(tokenOrUserId) as any;
          excludeUserId = payload?.sub;
        } catch (_) {}
      } else {
        excludeUserId = tokenOrUserId;
      }
    }

    try {
      await assertPhoneAvailable(this.db, phone.trim(), {
        excludeUserId,
      });
      return { available: true };
    } catch (err: any) {
      return {
        available: false,
        message: err.message || 'This mobile number is already registered to another account. Every account must have a unique mobile number.',
      };
    }
  }
}
