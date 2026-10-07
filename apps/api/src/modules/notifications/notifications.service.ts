import { Injectable, Logger, OnModuleInit, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Subject, Observable, filter, map } from 'rxjs';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getApps, initializeApp, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';
import { DatabaseService } from '../../database/database.service';
import { NotificationQueueService } from './notification-queue.service';
import {
  DevicePlatform,
  NotificationType,
  UserRole,
  DriverAvailability,
  VerificationStatus,
  VehicleType,
  RegisterDeviceTokenDto,
  AudienceFilterDto,
  BroadcastPushDto,
  TestPushDto,
  UpdateNotificationPreferenceDto,
} from '@adhocx/contracts';
import { defaultFirebaseServiceAccount } from './firebase.config';

// ── Public Types ──────────────────────────────────────────────────────────────

export interface SendOtpPayload {
  phone?: string;
  email?: string;
  otp: string;
  channel?: 'SMS' | 'EMAIL';
  fullName?: string;
}

export interface SendKycNotificationPayload {
  userId?: string;
  phone?: string;
  email?: string;
  fullName?: string;
  status: 'VERIFIED' | 'REJECTED';
  reason?: string;
}

export interface SendWelcomeNotificationPayload {
  userId?: string;
  phone?: string;
  email?: string;
  fullName?: string;
  role: string;
}

export interface RealtimeEvent {
  channel: string;
  event: string;
  payload: Record<string, any>;
  timestamp: string;
}

export interface PushSendResult {
  success: boolean;
  totalTokens: number;
  successCount: number;
  failureCount: number;
  failedTokens?: string[];
}

function otpEmailTemplate(otp: string, fullName?: string): string {
  const digits = otp.split('');
  const recipient = fullName ? fullName.trim() : 'Partner';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AdhocX Verification Code</title>
  <style>
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; color: #0F172A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; width: 100%; border-collapse: separate;">
          <!-- Brand Header -->
          <tr>
            <td style="background-color: #0B1220; border-radius: 12px 12px 0 0; padding: 24px 32px; border-bottom: 3px solid #2563EB;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-size: 26px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.5px;">Adhoc<span style="color: #3B82F6;">X</span></span>
                    <div style="font-size: 11px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 1.2px; margin-top: 3px;">Corporate Mobility & On-Demand Dispatch</div>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; background-color: rgba(37, 99, 235, 0.18); border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 16px; padding: 5px 14px; font-size: 11px; font-weight: 700; color: #60A5FA; letter-spacing: 0.5px;">SECURE OTP</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Card -->
          <tr>
            <td style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 12px 12px; padding: 36px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700; color: #0F172A; letter-spacing: -0.2px;">Account Verification Code</h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Hello <strong>${recipient}</strong>,<br>
                Please use the 6-digit one-time password below to authenticate your AdhocX session.
              </p>

              <!-- Discrete OTP Digit Blocks -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin: 28px auto;">
                <tr>
                  ${digits.map(d => `
                    <td style="padding: 0 5px;">
                      <div style="width: 46px; height: 56px; line-height: 56px; background-color: #F8FAFC; border: 2px solid #2563EB; border-radius: 8px; font-size: 32px; font-weight: 800; color: #0F172A; text-align: center; font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; box-shadow: 0 2px 4px rgba(37, 99, 235, 0.08);">${d}</div>
                    </td>
                  `).join('')}
                </tr>
              </table>

              <!-- Security Notice Callout (Amber Box) -->
              <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-radius: 8px; padding: 14px 16px; margin: 28px 0 0 0;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="22" valign="top" style="font-size: 16px; line-height: 1.2;">🔒</td>
                    <td style="padding-left: 10px; font-size: 13px; line-height: 1.5; color: #92400E;">
                      <strong>Security Advisory:</strong> This code is strictly confidential and expires in <strong>5 minutes</strong>. Never share this code with anyone. AdhocX representatives will never ask for your verification code.
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Transactional Details Meta -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px; padding-top: 20px; border-top: 1px solid #F1F5F9; font-size: 12px; color: #64748B;">
                <tr>
                  <td style="padding: 3px 0;">Request Type:</td>
                  <td align="right" style="font-weight: 600; color: #0F172A;">Multi-Factor Authentication (MFA)</td>
                </tr>
                <tr>
                  <td style="padding: 3px 0;">Validity Window:</td>
                  <td align="right" style="font-weight: 600; color: #0F172A;">5 Minutes</td>
                </tr>
                <tr>
                  <td style="padding: 3px 0;">Channel:</td>
                  <td align="right" style="font-weight: 600; color: #2563EB;">Encrypted SMTP Delivery</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Corporate Legal Footer -->
          <tr>
            <td align="center" style="padding-top: 24px; font-size: 12px; line-height: 1.6; color: #94A3B8;">
              <p style="margin: 0 0 6px 0;">If you did not request this verification code, please ignore this email or notify <a href="mailto:support@adhocx.com" style="color: #2563EB; text-decoration: none; font-weight: 600;">support@adhocx.com</a> immediately.</p>
              <p style="margin: 0; font-size: 11px; color: #CBD5E1;">© 2026 AdhocX Technologies Inc. • DLF Cyber City, Phase 2, Gurugram, Haryana 122002 • All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function kycApprovedEmailTemplate(fullName: string): string {
  const recipient = fullName ? fullName.trim() : 'Partner';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AdhocX Verification Approved</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; width: 100%; border-collapse: separate;">
          <tr>
            <td style="background-color: #0B1220; border-radius: 12px 12px 0 0; padding: 24px 32px; border-bottom: 3px solid #16A34A;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-size: 26px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.5px;">Adhoc<span style="color: #3B82F6;">X</span></span>
                    <div style="font-size: 11px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 1.2px; margin-top: 3px;">Corporate Mobility & On-Demand Dispatch</div>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; background-color: rgba(22, 163, 74, 0.18); border: 1px solid rgba(22, 163, 74, 0.4); border-radius: 16px; padding: 5px 14px; font-size: 11px; font-weight: 700; color: #4ADE80; letter-spacing: 0.5px;">VERIFIED</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 12px 12px; padding: 36px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); text-align: center;">
              <div style="display: inline-block; width: 64px; height: 64px; line-height: 64px; background-color: #DCFCE7; border: 1px solid #86EFAC; border-radius: 50%; font-size: 32px; margin-bottom: 20px;">✓</div>
              <h2 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 700; color: #15803D;">Account Verification Approved</h2>
              <p style="margin: 0 0 20px 0; font-size: 15px; color: #334155;">Congratulations <strong>${recipient}</strong>,</p>
              <p style="margin: 0 0 28px 0; font-size: 14px; line-height: 1.6; color: #475569; text-align: left;">
                Your submitted KYC documentation and credentials have been officially verified and approved. Your AdhocX account is now active with full platform access.
              </p>

              <div style="text-align: center; margin-bottom: 28px;">
                <a href="https://app.adhocx.com" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Access Your Portal</a>
              </div>

              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px; text-align: left;">
                <p style="margin: 0 0 6px 0; font-size: 13px; font-weight: 600; color: #0F172A;">What's next?</p>
                <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #475569; line-height: 1.6;">
                  <li>Book and schedule rides or post corporate dispatch requirements</li>
                  <li>Accept verified on-demand trips and manage fleet vehicles</li>
                  <li>Access real-time trip telematics and automated invoice settlements</li>
                </ul>
              </div>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding-top: 24px; font-size: 12px; line-height: 1.6; color: #94A3B8;">
              <p style="margin: 0; font-size: 11px; color: #CBD5E1;">© 2026 AdhocX Technologies Inc. • DLF Cyber City, Phase 2, Gurugram, Haryana 122002</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function kycDeclinedEmailTemplate(fullName: string, reason: string): string {
  const recipient = fullName ? fullName.trim() : 'Partner';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AdhocX Verification Update</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; width: 100%; border-collapse: separate;">
          <tr>
            <td style="background-color: #0B1220; border-radius: 12px 12px 0 0; padding: 24px 32px; border-bottom: 3px solid #D97706;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-size: 26px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.5px;">Adhoc<span style="color: #3B82F6;">X</span></span>
                    <div style="font-size: 11px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 1.2px; margin-top: 3px;">Corporate Mobility & On-Demand Dispatch</div>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; background-color: rgba(217, 119, 6, 0.18); border: 1px solid rgba(217, 119, 6, 0.4); border-radius: 16px; padding: 5px 14px; font-size: 11px; font-weight: 700; color: #FBBF24; letter-spacing: 0.5px;">ACTION REQUIRED</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 12px 12px; padding: 36px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <h2 style="margin: 0 0 10px 0; font-size: 20px; font-weight: 700; color: #B45309;">Verification Documentation Update</h2>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Hello <strong>${recipient}</strong>,<br>
                During our compliance verification review, some of your submitted documentation requires your attention before approval can be completed.
              </p>

              <!-- Reason Box -->
              <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; border-left: 4px solid #D97706; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 700; color: #92400E; text-transform: uppercase; letter-spacing: 0.5px;">Review Feedback:</p>
                <p style="margin: 0; font-size: 14px; color: #78350F; line-height: 1.5;">${reason}</p>
              </div>

              <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.6; color: #64748B;">
                Please re-submit clear, high-resolution photos or scans of the required documents directly within the AdhocX application.
              </p>

              <div style="text-align: center; margin: 28px 0 12px 0;">
                <a href="https://app.adhocx.com" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px;">Re-Submit Documents</a>
              </div>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding-top: 24px; font-size: 12px; line-height: 1.6; color: #94A3B8;">
              <p style="margin: 0; font-size: 11px; color: #CBD5E1;">© 2026 AdhocX Technologies Inc. • DLF Cyber City, Phase 2, Gurugram, Haryana 122002</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function welcomeEmailTemplate(fullName: string, role: string): string {
  const recipient = fullName ? fullName.trim() : 'Partner';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to AdhocX</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; color: #0F172A; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; width: 100%; border-collapse: separate;">
          <tr>
            <td style="background-color: #0B1220; border-radius: 12px 12px 0 0; padding: 24px 32px; border-bottom: 3px solid #2563EB;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-size: 26px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.5px;">Adhoc<span style="color: #3B82F6;">X</span></span>
                    <div style="font-size: 11px; font-weight: 600; color: #94A3B8; text-transform: uppercase; letter-spacing: 1.2px; margin-top: 3px;">Corporate Mobility & On-Demand Dispatch</div>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; background-color: rgba(37, 99, 235, 0.18); border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 16px; padding: 5px 14px; font-size: 11px; font-weight: 700; color: #60A5FA; letter-spacing: 0.5px;">WELCOME</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="background-color: #FFFFFF; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 12px 12px; padding: 36px 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <h2 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 700; color: #0F172A;">Welcome to AdhocX Enterprise Mobility</h2>
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #334155;">Hello <strong>${recipient}</strong>,</p>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Thank you for registering on AdhocX as an authorized <strong style="color: #2563EB;">${role}</strong>. You now have access to our high-performance dispatch network, guaranteed rate cards, and real-time operations engine.
              </p>

              <div style="text-align: center; margin: 28px 0;">
                <a href="https://app.adhocx.com" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px;">Open AdhocX Portal</a>
              </div>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding-top: 24px; font-size: 12px; line-height: 1.6; color: #94A3B8;">
              <p style="margin: 0; font-size: 11px; color: #CBD5E1;">© 2026 AdhocX Technologies Inc. • DLF Cyber City, Phase 2, Gurugram, Haryana 122002</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Centralized Multi-Channel Notification Service ────────────────────────────

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter!: Transporter;
  private fromAddress!: string;
  private firebaseApp: App | null = null;
  private fcmInitialized = false;

  public getFirebaseApp(): App | null {
    return this.firebaseApp;
  }

  /** RxJS subject backing the SSE event stream */
  private readonly eventBus = new Subject<RealtimeEvent>();

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly db?: DatabaseService,
    @Optional() private readonly queue?: NotificationQueueService,
  ) {}

  async onModuleInit() {
    this.initSmtp();
    this.initFirebase();
    this.registerQueueProcessors();
  }

  // ─── Queue Processor Wiring ──────────────────────────────────────────────────

  private registerQueueProcessors() {
    if (!this.queue) return;

    this.queue.registerHandler('FCM_DIRECT_PUSH', async (payload: any) => {
      const { tokens, notification, data, priority } = payload;
      return this.sendPushToTokensSync(tokens, notification, data, priority);
    });

    this.queue.registerHandler('USER_NOTIFICATION', async (payload: any) => {
      return this.sendPushToUserSync(payload.userId, payload.payload);
    });
  }

  // ─── Firebase Admin SDK Initialization ────────────────────────────────────────

  private initFirebase() {
    try {
      const existingApps = getApps();
      if (existingApps.length > 0) {
        this.firebaseApp = existingApps[0]!;
        this.fcmInitialized = true;
        this.logger.log('🔥 Firebase Admin SDK already initialized');
        return;
      }

      const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID', defaultFirebaseServiceAccount.project_id);
      const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL', defaultFirebaseServiceAccount.client_email);
      let privateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY', defaultFirebaseServiceAccount.private_key);

      if (privateKey) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      const serviceAccount: ServiceAccount = {
        projectId,
        clientEmail,
        privateKey,
      };

      this.firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        projectId,
      });

      this.fcmInitialized = true;
      this.logger.log(`🔥 Firebase FCM initialized successfully for project: ${projectId}`);
    } catch (err: any) {
      this.logger.warn(`⚠️ Firebase Admin initialization notice: ${err.message}. Push notifications will fall back to simulated/in-app delivery.`);
      this.fcmInitialized = false;
    }
  }

  // ─── SMTP Initialization ──────────────────────────────────────────────────────

  private initSmtp() {
    const host = this.configService.get<string>('SMTP_HOST', '');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const secure = this.configService.get<string>('SMTP_SECURE', 'false') === 'true';
    const user = this.configService.get<string>('SMTP_USER', '');
    const pass = this.configService.get<string>('SMTP_PASS', '');
    const fromName = this.configService.get<string>('SMTP_FROM_NAME', 'AdhocX');
    const fromEmail = this.configService.get<string>('SMTP_FROM_EMAIL', user);

    this.fromAddress = `"${fromName}" <${fromEmail}>`;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });

    this.transporter.verify().then(() => {
      this.logger.log(`📧 SMTP connected successfully to ${host}:${port} as ${user}`);
    }).catch((err: any) => {
      this.logger.warn(`⚠️ SMTP connection failed (emails will be logged only): ${err.message}`);
    });
  }

  // ─── Private Email Sender ────────────────────────────────────────────────────

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string,
  ): Promise<string | null> {
    try {
      const plainText =
        text ||
        html
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        text: plainText,
        html,
        headers: {
          'X-Entity-Ref-ID': `adhocx-${Date.now()}`,
          'X-Auto-Response-Suppress': 'OOF, AutoReply',
          'Auto-Submitted': 'auto-generated',
        },
      });
      this.logger.log(`📧 [EMAIL SENT] To: ${to} | Subject: "${subject}" | MessageId: ${info.messageId}`);
      return info.messageId;
    } catch (err: any) {
      this.logger.error(`❌ [EMAIL FAILED] To: ${to} | Subject: "${subject}" | Error: ${err.message}`);
      return null;
    }
  }

  // ─── Device Token Management ─────────────────────────────────────────────────

  /**
   * Register or update a device FCM token for a user.
   */
  async registerDeviceToken(userId: string, dto: RegisterDeviceTokenDto) {
    if (!this.db) return { success: true };

    const { token, platform, deviceModel, appVersion } = dto;
    const devicePlatform = (platform as unknown as DevicePlatform) || DevicePlatform.ANDROID;

    const existing = await this.db.deviceToken.findUnique({
      where: { token },
    });

    if (existing) {
      const updated = await this.db.deviceToken.update({
        where: { token },
        data: {
          userId,
          platform: devicePlatform,
          deviceModel: deviceModel || existing.deviceModel,
          appVersion: appVersion || existing.appVersion,
          isActive: true,
          lastActiveAt: new Date(),
        },
      });
      this.logger.log(`📱 [DEVICE TOKEN UPDATED] User: ${userId} | Platform: ${platform} | Token: ${token.substring(0, 10)}...`);
      return updated;
    }

    const created = await this.db.deviceToken.create({
      data: {
        userId,
        token,
        platform: devicePlatform,
        deviceModel,
        appVersion,
        isActive: true,
        lastActiveAt: new Date(),
      },
    });

    this.logger.log(`📱 [DEVICE TOKEN REGISTERED] User: ${userId} | Platform: ${platform} | Token: ${token.substring(0, 10)}...`);
    return created;
  }

  /**
   * Unregister / deactivate a device token on logout.
   */
  async unregisterDeviceToken(token: string) {
    if (!this.db) return { success: true };
    try {
      await this.db.deviceToken.update({
        where: { token },
        data: { isActive: false },
      });
      this.logger.log(`📱 [DEVICE TOKEN DEACTIVATED] Token: ${token.substring(0, 10)}...`);
      return { success: true };
    } catch {
      return { success: false };
    }
  }

  // ─── Multi-Cast FCM Push Core Engine ──────────────────────────────────────────

  /**
   * Send FCM push notification to multiple device registration tokens.
   */
  async sendPushToTokens(
    tokens: string[],
    notification: { title: string; body: string; imageUrl?: string; actionUrl?: string },
    data?: Record<string, string>,
    priority: 'normal' | 'high' = 'high',
  ): Promise<PushSendResult> {
    return this.sendPushToTokensSync(tokens, notification, data, priority);
  }

  private async sendPushToTokensSync(
    tokens: string[],
    notification: { title: string; body: string; imageUrl?: string; actionUrl?: string },
    data?: Record<string, string>,
    priority: 'normal' | 'high' = 'high',
  ): Promise<PushSendResult> {
    if (!tokens || tokens.length === 0) {
      return { success: true, totalTokens: 0, successCount: 0, failureCount: 0 };
    }

    const title = this.queue ? this.queue.sanitizeText(notification.title) : notification.title;
    const body = this.queue ? this.queue.sanitizeText(notification.body) : notification.body;
    const { imageUrl, actionUrl } = notification;

    const stringData: Record<string, string> = {
      title,
      body,
      actionUrl: actionUrl || '',
      imageUrl: imageUrl || '',
      timestamp: new Date().toISOString(),
      ...(data || {}),
    };

    if (!this.fcmInitialized || !getApps().length) {
      this.logger.log(
        `🔔 [FCM SIMULATED PUSH] Tokens Count: ${tokens.length} | Title: "${title}" | Body: "${body}"`,
      );
      return {
        success: true,
        totalTokens: tokens.length,
        successCount: tokens.length,
        failureCount: 0,
      };
    }

    const simulatedTokens = tokens.filter(
      (t) => t.startsWith('fcm_tok_') || t.startsWith('sim_') || t.startsWith('mock_') || t.startsWith('test_'),
    );
    const realTokens = tokens.filter(
      (t) => !t.startsWith('fcm_tok_') && !t.startsWith('sim_') && !t.startsWith('mock_') && !t.startsWith('test_'),
    );

    let successCount = simulatedTokens.length;
    let failureCount = 0;
    const failedTokens: string[] = [];
    const staleTokens: string[] = [];

    if (simulatedTokens.length > 0) {
      this.logger.log(`📱 [SIMULATED TOKENS DISPATCH] ${simulatedTokens.length} test token(s) processed successfully`);
    }

    // Firebase multicast supports up to 500 tokens per chunk for real device tokens
    const chunkSize = 500;
    for (let i = 0; i < realTokens.length; i += chunkSize) {
      const chunk = realTokens.slice(i, i + chunkSize);

      const isUrgentDispatch = priority === 'high' || stringData['type'] === 'TRIP_OFFER' || stringData['offerId'] != null;

      const message: MulticastMessage = {
        tokens: chunk,
        notification: {
          title,
          body,
          ...(imageUrl ? { imageUrl } : {}),
        },
        data: stringData,
        android: {
          priority: isUrgentDispatch ? 'high' : 'normal',
          ttl: isUrgentDispatch ? 30 * 1000 : 86400 * 1000,
          notification: {
            title,
            body,
            icon: 'notification_icon',
            color: '#5b42f3',
            sound: isUrgentDispatch ? 'adhocx_dispatch_alert' : 'default',
            channelId: isUrgentDispatch ? 'adhocx_trip_dispatch_urgent' : 'adhocx_operational_alerts',
            clickAction: actionUrl || 'FLUTTER_NOTIFICATION_CLICK',
            ...(imageUrl ? { imageUrl } : {}),
          },
        },
        apns: {
          headers: {
            'apns-priority': isUrgentDispatch ? '10' : '5',
            'apns-push-type': 'alert',
            ...(isUrgentDispatch ? { 'apns-expiration': String(Math.floor(Date.now() / 1000) + 30) } : {}),
          },
          payload: {
            aps: {
              alert: { title, body },
              badge: 1,
              sound: isUrgentDispatch ? 'adhocx_dispatch_alert.wav' : 'default',
              category: isUrgentDispatch ? 'TRIP_DISPATCH_CATEGORY' : 'ADHOCX_ALERT',
              'interruption-level': isUrgentDispatch ? 'time-sensitive' : 'active',
              'mutable-content': 1,
            },
          },
          fcmOptions: imageUrl ? { imageUrl } : undefined,
        },
        webpush: {
          notification: {
            title,
            body,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            image: imageUrl,
            data: stringData,
            actions: actionUrl ? [{ action: 'open', title: 'View Details' }] : undefined,
          },
          fcmOptions: {
            link: actionUrl || '/',
          },
        },
      };

      try {
        const response = await getMessaging().sendEachForMulticast(message);
        successCount += response.successCount;
        failureCount += response.failureCount;

        response.responses.forEach((resp: any, idx: number) => {
          if (!resp.success) {
            const token = chunk[idx];
            failedTokens.push(token);
            const errorCode = resp.error?.code;
            if (
              errorCode === 'messaging/registration-token-not-registered' ||
              errorCode === 'messaging/invalid-registration-token'
            ) {
              staleTokens.push(token);
            }
            this.logger.warn(`Push delivery failed for token ${token.substring(0, 10)}... : ${resp.error?.message}`);
          }
        });
      } catch (err: any) {
        this.logger.error(`Error sending FCM multicast chunk: ${err.message}`);
        failureCount += chunk.length;
      }
    }

    // Automatically prune stale / unregistered tokens from DB
    if (staleTokens.length > 0 && this.db) {
      this.db.deviceToken
        .updateMany({
          where: { token: { in: staleTokens } },
          data: { isActive: false },
        })
        .catch((err) => this.logger.warn(`Failed to deactivate stale tokens: ${err.message}`));
    }

    this.logger.log(
      `🔔 [FCM PUSH DISPATCHED] Total: ${tokens.length} | Success: ${successCount} | Failed: ${failureCount}`,
    );

    return {
      success: failureCount === 0 || successCount > 0,
      totalTokens: tokens.length,
      successCount,
      failureCount,
      failedTokens,
    };
  }

  /**
   * Send notification to a specific user across all their active devices + In-App storage + SSE event.
   */
  async sendPushToUser(
    userId: string,
    payload: {
      title: string;
      body: string;
      type?: NotificationType;
      data?: Record<string, any>;
      imageUrl?: string;
      actionUrl?: string;
      saveInApp?: boolean;
      idempotencyKey?: string;
    },
  ): Promise<PushSendResult> {
    // Check idempotency if key provided
    if (payload.idempotencyKey && this.queue) {
      const isDupe = await this.queue.isDuplicate(payload.idempotencyKey);
      if (isDupe) {
        return { success: true, totalTokens: 0, successCount: 0, failureCount: 0 };
      }
    }

    return this.sendPushToUserSync(userId, payload);
  }

  private async sendPushToUserSync(
    userId: string,
    payload: {
      title: string;
      body: string;
      type?: NotificationType;
      data?: Record<string, any>;
      imageUrl?: string;
      actionUrl?: string;
      saveInApp?: boolean;
      idempotencyKey?: string;
    },
  ): Promise<PushSendResult> {
    const rawTitle = payload.title;
    const rawBody = payload.body;
    const title = this.queue ? this.queue.sanitizeText(rawTitle) : rawTitle;
    const body = this.queue ? this.queue.sanitizeText(rawBody) : rawBody;
    const { type = NotificationType.SYSTEM, data = {}, imageUrl, actionUrl, saveInApp = true, idempotencyKey } = payload;

    // Check user notification preferences if DB available
    let allowPush = true;
    if (this.db) {
      try {
        const pref = await this.db.notificationPreference.findUnique({ where: { userId } });
        if (pref) {
          if (!pref.pushEnabled) {
            allowPush = false;
          }
          if (type === NotificationType.MARKETING_PROMO && !pref.marketingPromos) {
            allowPush = false;
          }
          if (type === NotificationType.TRIP_STATUS && !pref.tripAlerts) {
            allowPush = false;
          }
        }
      } catch {}

      // Strict Offline Driver Check: If this is a TRIP_OFFER, ensure driver is not OFFLINE
      if (type === NotificationType.TRIP_OFFER) {
        try {
          const driver = await this.db.driver.findFirst({
            where: { userId },
            select: { availabilityStatus: true },
          });
          if (driver && driver.availabilityStatus === DriverAvailability.OFFLINE) {
            this.logger.log(`Skipping TRIP_OFFER push to driver ${userId} because driver is OFFLINE`);
            allowPush = false;
          }
        } catch (err: any) {
          this.logger.warn(`Failed driver status check for push: ${err.message}`);
        }
      }
    }

    // 1. Save in-app notification in DB if requested
    if (saveInApp && this.db) {
      try {
        await this.db.notification.create({
          data: {
            userId,
            title,
            body,
            type: (type as unknown as NotificationType) || NotificationType.SYSTEM,
            data: data ? JSON.parse(JSON.stringify(data)) : undefined,
            imageUrl,
            idempotencyKey,
          },
        });
      } catch (err: any) {
        this.logger.warn(`Failed to store in-app notification for ${userId}: ${err.message}`);
      }
    }

    // 2. Emit Real-time SSE event for instant in-app toast / update
    this.emitEvent(`user:${userId}`, 'NEW_NOTIFICATION', {
      title,
      body,
      type,
      data,
      imageUrl,
      actionUrl,
      timestamp: new Date().toISOString(),
    });

    if (!allowPush) {
      this.logger.debug(`User ${userId} opted out of push for ${type}. In-app alert saved.`);
      return { success: true, totalTokens: 0, successCount: 0, failureCount: 0 };
    }

    // 3. Find active device tokens for the user
    let tokens: string[] = [];
    if (this.db) {
      const deviceTokens = await this.db.deviceToken.findMany({
        where: { userId, isActive: true },
        select: { token: true },
      });
      tokens = deviceTokens.map((d) => d.token);
    }

    // If no tokens found, log and return
    if (tokens.length === 0) {
      this.logger.debug(`User ${userId} has 0 registered active device tokens. Notification stored in-app.`);
      return { success: true, totalTokens: 0, successCount: 0, failureCount: 0 };
    }

    // 4. Send FCM Multicast
    const stringData: Record<string, string> = {};
    for (const [k, v] of Object.entries(data)) {
      stringData[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }

    return this.sendPushToTokensSync(
      tokens,
      { title, body, imageUrl, actionUrl },
      stringData,
      'high',
    );
  }

  /**
   * Public backward-compatible sendPush method.
   */
  async sendPush(userId: string, title: string, body: string, data?: Record<string, any>): Promise<void> {
    await this.sendPushToUser(userId, {
      title,
      body,
      type: NotificationType.SYSTEM,
      data,
      saveInApp: true,
    });
  }

  /**
   * Send notification to a Firebase Topic (e.g. 'drivers-all', 'vendors-all').
   */
  async sendPushToTopic(
    topic: string,
    notification: { title: string; body: string; imageUrl?: string; actionUrl?: string },
    data?: Record<string, string>,
  ): Promise<boolean> {
    const title = this.queue ? this.queue.sanitizeText(notification.title) : notification.title;
    const body = this.queue ? this.queue.sanitizeText(notification.body) : notification.body;
    const { imageUrl, actionUrl } = notification;

    if (!this.fcmInitialized || !getApps().length) {
      this.logger.log(`🔔 [FCM TOPIC SIMULATED] Topic: "${topic}" | Title: "${title}" | Body: "${body}"`);
      return true;
    }

    try {
      await getMessaging().send({
        topic,
        notification: {
          title,
          body,
          ...(imageUrl ? { imageUrl } : {}),
        },
        data: {
          title,
          body,
          actionUrl: actionUrl || '',
          ...(data || {}),
        },
      });
      this.logger.log(`🔔 [FCM TOPIC SENT] Topic: ${topic} | Title: "${title}"`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed sending FCM topic message to ${topic}: ${err.message}`);
      return false;
    }
  }

  // ─── Audience Filter & Broadcast Engine ───────────────────────────────────────

  /**
   * Computes audience query filter based on role, availability, verification, vehicle, city, etc.
   */
  private buildAudienceWhere(filter?: AudienceFilterDto): { userWhere: any; driverWhere?: any } {
    const userWhere: any = { status: 'ACTIVE' };

    if (!filter) return { userWhere };

    if (filter.role && filter.role !== 'ALL') {
      userWhere.role = filter.role as UserRole;
    }

    if (filter.userIds && filter.userIds.length > 0) {
      userWhere.id = { in: filter.userIds };
    }

    if (filter.phones && filter.phones.length > 0) {
      userWhere.phone = { in: filter.phones };
    }

    // Driver specific criteria
    const driverConditions: any = {};
    if (filter.availability && filter.availability !== 'ALL') {
      driverConditions.availabilityStatus = filter.availability as DriverAvailability;
    }
    if (filter.verificationStatus && filter.verificationStatus !== 'ALL') {
      driverConditions.verificationStatus = filter.verificationStatus as VerificationStatus;
    }
    if (filter.vehicleTypes && filter.vehicleTypes.length > 0) {
      driverConditions.vehicleType = { in: filter.vehicleTypes as VehicleType[] };
    }

    if (Object.keys(driverConditions).length > 0) {
      userWhere.driver = driverConditions;
      userWhere.role = UserRole.DRIVER;
    }

    return { userWhere };
  }

  /**
   * Real-time estimation of targeted audience users and device count.
   */
  async estimateAudience(filter?: AudienceFilterDto) {
    if (!this.db) {
      return {
        matchingUsers: 0,
        matchingDevices: 0,
        platformBreakdown: { android: 0, ios: 0, web: 0 },
      };
    }

    const { userWhere } = this.buildAudienceWhere(filter);
    const users = await this.db.user.findMany({
      where: userWhere,
      select: {
        id: true,
        deviceTokens: {
          where: { isActive: true },
          select: { platform: true },
        },
      },
    });

    const matchingUsers = users.length;
    let android = 0;
    let ios = 0;
    let web = 0;

    users.forEach((u) => {
      u.deviceTokens.forEach((t) => {
        if (t.platform === DevicePlatform.ANDROID) android++;
        else if (t.platform === DevicePlatform.IOS) ios++;
        else if (t.platform === DevicePlatform.WEB) web++;
      });
    });

    return {
      matchingUsers,
      matchingDevices: android + ios + web,
      platformBreakdown: { android, ios, web },
    };
  }

  /**
   * Broadcast push notification to filtered audience from Admin Portal.
   */
  async broadcastPush(dto: BroadcastPushDto, adminId?: string) {
    if (!this.db) throw new BadRequestException('Database service unavailable');

    const rawTitle = dto.title;
    const rawBody = dto.body;
    const title = this.queue ? this.queue.sanitizeText(rawTitle) : rawTitle;
    const body = this.queue ? this.queue.sanitizeText(rawBody) : rawBody;
    const { imageUrl, actionUrl, priority = 'high', filter: audienceFilter, data = {}, dryRun = false } = dto;

    const { userWhere } = this.buildAudienceWhere(audienceFilter);

    // Fetch target users and their active tokens & preferences
    const users = await this.db.user.findMany({
      where: userWhere,
      include: {
        deviceTokens: {
          where: { isActive: true },
        },
        notificationPreference: true,
      },
    });

    const allTokens: string[] = [];
    const targetUserIds: string[] = [];

    users.forEach((u) => {
      // Check if user disabled push notifications
      if (u.notificationPreference && !u.notificationPreference.pushEnabled) {
        return;
      }
      targetUserIds.push(u.id);
      u.deviceTokens.forEach((t) => {
        allTokens.push(t.token);
      });
    });

    if (dryRun) {
      return {
        dryRun: true,
        totalTargetedUsers: users.length,
        totalTargetedDevices: allTokens.length,
        message: 'Audience dry run simulated successfully',
      };
    }

    // 1. Dispatch FCM push
    const stringData: Record<string, string> = {
      type: NotificationType.BROADCAST,
      title,
      body,
      actionUrl: actionUrl || '',
      imageUrl: imageUrl || '',
      ...(data || {}),
    };

    const pushResult = await this.sendPushToTokensSync(
      allTokens,
      { title, body, imageUrl, actionUrl },
      stringData,
      priority,
    );

    // 2. Persist in-app notifications for targeted users in batch
    if (targetUserIds.length > 0) {
      try {
        await this.db.notification.createMany({
          data: targetUserIds.map((uId) => ({
            userId: uId,
            title,
            body,
            type: NotificationType.BROADCAST,
            data: stringData,
            imageUrl,
          })),
        });
      } catch (err: any) {
        this.logger.warn(`Failed batch in-app notifications: ${err.message}`);
      }
    }

    // 3. Emit realtime event on broadcast channel
    this.emitEvent('broadcast:all', 'ADMIN_BROADCAST', {
      title,
      body,
      imageUrl,
      actionUrl,
      targetRole: audienceFilter?.role || 'ALL',
      timestamp: new Date().toISOString(),
    });

    // 4. Save campaign log in DB
    const campaign = await this.db.notificationCampaign.create({
      data: {
        title,
        body,
        imageUrl,
        actionUrl,
        targetRole: audienceFilter?.role || 'ALL',
        targetFilter: audienceFilter ? JSON.parse(JSON.stringify(audienceFilter)) : undefined,
        totalTargeted: allTokens.length,
        successCount: pushResult.successCount,
        failureCount: pushResult.failureCount,
        status: pushResult.failureCount === 0 || pushResult.successCount > 0 ? 'SENT' : 'FAILED',
        sentBy: adminId || 'ADMIN',
      },
    });

    this.logger.log(`📢 [ADMIN CAMPAIGN DISPATCHED] Campaign ID: ${campaign.id} | Recipients: ${users.length}`);

    return {
      campaignId: campaign.id,
      totalTargetedUsers: users.length,
      totalTargetedDevices: allTokens.length,
      successCount: pushResult.successCount,
      failureCount: pushResult.failureCount,
      status: campaign.status,
    };
  }

  /**
   * Dispatch instant test push notification to a specific token, user ID, or phone number.
   */
  async sendTestPush(dto: TestPushDto) {
    const { title, body, imageUrl, actionUrl, targetToken, targetUserId, targetPhone, data } = dto;

    if (targetToken) {
      return this.sendPushToTokensSync(
        [targetToken],
        { title, body, imageUrl, actionUrl },
        data,
        'high',
      );
    }

    if (targetUserId) {
      return this.sendPushToUser(targetUserId, {
        title,
        body,
        type: NotificationType.SYSTEM,
        imageUrl,
        actionUrl,
        data,
        saveInApp: true,
      });
    }

    if (targetPhone && this.db) {
      const cleanPhone = targetPhone.trim();
      const normalizedWithPlus = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone.replace(/^0+/, '')}`;
      const digitsOnly = cleanPhone.replace(/\D/g, '');
      const tenDigits = digitsOnly.slice(-10);

      const user = await this.db.user.findFirst({
        where: {
          OR: [
            { phone: cleanPhone },
            { phone: normalizedWithPlus },
            ...(tenDigits ? [{ phone: { endsWith: tenDigits } }] : []),
          ],
        },
      });
      if (!user) {
        throw new NotFoundException(`User with phone ${targetPhone} not found`);
      }
      return this.sendPushToUser(user.id, {
        title,
        body,
        type: NotificationType.SYSTEM,
        imageUrl,
        actionUrl,
        data,
        saveInApp: true,
      });
    }

    throw new BadRequestException('Either targetToken, targetUserId, or targetPhone must be provided');
  }

  // ─── User Preferences Management ─────────────────────────────────────────────

  /**
   * Get user notification preferences (creates default if not present).
   */
  async getPreferences(userId: string) {
    if (!this.db) {
      return {
        userId,
        pushEnabled: true,
        emailEnabled: true,
        smsEnabled: true,
        tripAlerts: true,
        marketingPromos: true,
      };
    }

    let pref = await this.db.notificationPreference.findUnique({ where: { userId } });
    if (!pref) {
      pref = await this.db.notificationPreference.create({
        data: {
          userId,
          pushEnabled: true,
          emailEnabled: true,
          smsEnabled: true,
          tripAlerts: true,
          marketingPromos: true,
        },
      });
    }

    return pref;
  }

  /**
   * Update user notification preferences.
   */
  async updatePreferences(userId: string, dto: UpdateNotificationPreferenceDto) {
    if (!this.db) return { success: true };

    const updated = await this.db.notificationPreference.upsert({
      where: { userId },
      create: {
        userId,
        pushEnabled: dto.pushEnabled ?? true,
        emailEnabled: dto.emailEnabled ?? true,
        smsEnabled: dto.smsEnabled ?? true,
        tripAlerts: dto.tripAlerts ?? true,
        marketingPromos: dto.marketingPromos ?? true,
        quietHoursStart: dto.quietHoursStart,
        quietHoursEnd: dto.quietHoursEnd,
      },
      update: {
        ...(dto.pushEnabled !== undefined ? { pushEnabled: dto.pushEnabled } : {}),
        ...(dto.emailEnabled !== undefined ? { emailEnabled: dto.emailEnabled } : {}),
        ...(dto.smsEnabled !== undefined ? { smsEnabled: dto.smsEnabled } : {}),
        ...(dto.tripAlerts !== undefined ? { tripAlerts: dto.tripAlerts } : {}),
        ...(dto.marketingPromos !== undefined ? { marketingPromos: dto.marketingPromos } : {}),
        ...(dto.quietHoursStart !== undefined ? { quietHoursStart: dto.quietHoursStart } : {}),
        ...(dto.quietHoursEnd !== undefined ? { quietHoursEnd: dto.quietHoursEnd } : {}),
      },
    });

    this.logger.log(`⚙️ [NOTIFICATION PREFERENCES UPDATED] User: ${userId}`);
    return updated;
  }

  // ─── In-App Notifications Feed & Interaction Tracking ────────────────────────

  /**
   * Get user's in-app notifications feed with unread count.
   */
  async getUserNotifications(userId: string, query?: { page?: number; limit?: number; unreadOnly?: boolean }) {
    if (!this.db) return { notifications: [], unreadCount: 0, total: 0 };

    const page = Number(query?.page || 1);
    const limit = Number(query?.limit || 20);
    const unreadOnly = query?.unreadOnly === true || String(query?.unreadOnly) === 'true';

    const where: any = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    try {
      const [notifications, total, unreadCount] = await Promise.all([
        this.db.notification.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: (page - 1) * limit,
        }),
        this.db.notification.count({ where }),
        this.db.notification.count({ where: { userId, isRead: false } }),
      ]);

      return {
        notifications: notifications.map((n) => ({
          id: n.id,
          userId: n.userId,
          title: n.title,
          body: n.body,
          type: n.type,
          data: n.data as Record<string, any> | undefined,
          imageUrl: n.imageUrl || undefined,
          isRead: n.isRead,
          readAt: n.readAt ? n.readAt.toISOString() : undefined,
          isClicked: n.isClicked,
          clickedAt: n.clickedAt ? n.clickedAt.toISOString() : undefined,
          createdAt: n.createdAt.toISOString(),
        })),
        unreadCount,
        total,
        page,
        limit,
      };
    } catch (err: any) {
      this.logger.warn(`Failed to fetch notifications: ${err.message}`);
      return { notifications: [], unreadCount: 0, total: 0, page, limit };
    }
  }

  /**
   * Mark single in-app notification as read.
   */
  async markAsRead(userId: string, notificationId: string) {
    if (!this.db) return { success: true };
    try {
      await this.db.notification.updateMany({
        where: { id: notificationId, userId },
        data: { isRead: true, readAt: new Date() },
      });
    } catch (err: any) {
      this.logger.warn(`Failed to mark notification read: ${err.message}`);
    }
    return { success: true };
  }

  /**
   * Track user interaction (click / open / conversion) on notification.
   */
  async trackInteraction(userId: string, notificationId: string) {
    if (!this.db) return { success: true };
    await this.db.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true, isClicked: true, clickedAt: new Date() },
    });
    return { success: true };
  }

  /**
   * Mark all in-app notifications as read for a user.
   */
  async markAllAsRead(userId: string) {
    if (!this.db) return { success: true };
    await this.db.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }

  // ─── Admin Campaigns & Metrics ───────────────────────────────────────────────

  /**
   * Get past notification broadcast campaigns list for Admin Portal.
   */
  async getCampaigns(query?: { page?: number; limit?: number }) {
    if (!this.db) return { campaigns: [], total: 0 };

    const page = Number(query?.page || 1);
    const limit = Number(query?.limit || 20);

    const [campaigns, total] = await Promise.all([
      this.db.notificationCampaign.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.db.notificationCampaign.count(),
    ]);

    return {
      campaigns: campaigns.map((c) => ({
        id: c.id,
        title: c.title,
        body: c.body,
        imageUrl: c.imageUrl || undefined,
        actionUrl: c.actionUrl || undefined,
        targetRole: c.targetRole || 'ALL',
        targetFilter: c.targetFilter as Record<string, any> | undefined,
        totalTargeted: c.totalTargeted,
        successCount: c.successCount,
        failureCount: c.failureCount,
        status: c.status,
        sentBy: c.sentBy || 'ADMIN',
        createdAt: c.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Get push notification metrics summary for Admin Portal.
   */
  async getMetrics() {
    if (!this.db) {
      return {
        totalDelivered: 0,
        totalCampaigns: 0,
        activeDevicesCount: 0,
        devicesByPlatform: { android: 0, ios: 0, web: 0 },
        deliverySuccessRate: 100,
        inAppNotificationsCount: 0,
      };
    }

    const [campaigns, devices, inAppCount] = await Promise.all([
      this.db.notificationCampaign.findMany(),
      this.db.deviceToken.findMany({ where: { isActive: true } }),
      this.db.notification.count(),
    ]);

    let totalSuccess = 0;
    let totalFailure = 0;
    let totalTargeted = 0;
    campaigns.forEach((c) => {
      totalSuccess += c.successCount;
      totalFailure += c.failureCount;
      totalTargeted += c.totalTargeted;
    });

    let android = 0;
    let ios = 0;
    let web = 0;
    devices.forEach((d) => {
      if (d.platform === DevicePlatform.ANDROID) android++;
      else if (d.platform === DevicePlatform.IOS) ios++;
      else if (d.platform === DevicePlatform.WEB) web++;
    });

    const totalAttempted = totalSuccess + totalFailure;
    const deliverySuccessRate =
      totalAttempted > 0
        ? Number(((totalSuccess / totalAttempted) * 100).toFixed(1))
        : (totalTargeted > 0 ? Number(((totalSuccess / totalTargeted) * 100).toFixed(1)) : 100.0);

    return {
      totalDelivered: totalSuccess || inAppCount,
      totalCampaigns: campaigns.length,
      activeDevicesCount: devices.length,
      devicesByPlatform: { android, ios, web },
      deliverySuccessRate,
      inAppNotificationsCount: inAppCount,
    };
  }

  // ─── OTP Dispatch ────────────────────────────────────────────────────────────

  /**
   * Centralized OTP Dispatcher (SMS & Email via SMTP)
   */
  async sendOtp(payload: SendOtpPayload): Promise<{ success: boolean; channel: string; messageId: string }> {
    const { phone, email, otp, channel } = payload;
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const targetChannel = channel || (email ? 'EMAIL' : 'SMS');

    if (targetChannel === 'EMAIL' && email) {
      const emailMessageId = await this.sendEmail(
        email,
        `Your AdhocX Verification Code: ${otp}`,
        otpEmailTemplate(otp, payload.fullName),
        `Your AdhocX verification code is: ${otp}\n\nEnter this 6-digit code to verify your identity. This code expires in 5 minutes.\n\nSecurity Notice: Never share this code with anyone. AdhocX representatives will never ask for your verification code.\n\n© 2026 AdhocX Technologies Inc. • DLF Cyber City, Phase 2, Gurugram, Haryana 122002`,
      );

      return {
        success: !!emailMessageId,
        channel: 'EMAIL',
        messageId: emailMessageId || messageId,
      };
    }

    if (phone) {
      const smsText = `[AdhocX] Your authentication OTP is ${otp}. Valid for 5 minutes. Never share OTP with anyone.`;
      this.logger.log(
        `📱 [NOTIFICATION DISPATCH - SMS] To: ${phone} | Body: "${smsText}" | MsgID: ${messageId}`,
      );
      return { success: true, channel: 'SMS', messageId };
    }

    throw new Error('Either phone or email must be provided to send OTP');
  }

  // ─── Trip OTP (Driver Arrival OTP sent to vendor) ────────────────────────────

  /**
   * Send trip verification OTP to vendor when driver arrives at pickup.
   */
  async sendTripOtp(phone: string, otp: string): Promise<void> {
    const smsText = `[AdhocX] Trip OTP: ${otp}. Share this code with the driver to confirm pickup.`;
    this.logger.log(
      `📱 [NOTIFICATION - TRIP OTP] To: ${phone} | Body: "${smsText}"`,
    );
  }

  // ─── KYC Status Alerts ──────────────────────────────────────────────────────

  /**
   * KYC Verification Status Alerts (Approved or Declined) — sends real email + FCM push + in-app
   */
  async sendKycStatusNotification(payload: SendKycNotificationPayload): Promise<{ success: boolean }> {
    const { userId, phone, email, fullName, status, reason } = payload;
    const name = fullName || 'Partner';

    if (email) {
      if (status === 'VERIFIED') {
        await this.sendEmail(email, '🎉 AdhocX Verification Approved!', kycApprovedEmailTemplate(name));
      } else {
        await this.sendEmail(
          email,
          '⚠️ AdhocX Verification Update — Action Required',
          kycDeclinedEmailTemplate(name, reason || 'Documents unclear or incomplete'),
        );
      }
    }

    if (userId) {
      const title = status === 'VERIFIED' ? '🎉 Verification Approved!' : '⚠️ Verification Update';
      const body =
        status === 'VERIFIED'
          ? `Congratulations ${name}! Your documents have been verified. You can now accept trips.`
          : `Verification declined: ${reason || 'Documents unclear'}. Please re-submit in the app.`;

      await this.sendPushToUser(userId, {
        title,
        body,
        type: NotificationType.KYC_UPDATE,
        actionUrl: '/verifications',
        saveInApp: true,
      });
    }

    const recipient = email || phone || 'User';
    if (status === 'VERIFIED') {
      this.logger.log(`🎉 [KYC APPROVED] ${recipient} (${name})`);
    } else {
      this.logger.log(`⚠️ [KYC DECLINED] ${recipient} (${name}) — Reason: "${reason}"`);
    }

    return { success: true };
  }

  // ─── Welcome Notification ───────────────────────────────────────────────────

  /**
   * Welcome Notification upon Successful Registration — sends real email + in-app notification
   */
  async sendWelcomeNotification(payload: SendWelcomeNotificationPayload): Promise<{ success: boolean }> {
    const { userId, phone, email, fullName, role } = payload;
    const name = fullName || 'Partner';

    if (email) {
      this.sendEmail(email, '🌟 Welcome to AdhocX!', welcomeEmailTemplate(name, role)).catch((err) => {
        this.logger.warn(`Welcome email dispatch notice: ${err.message}`);
      });
    }

    if (userId) {
      await this.sendPushToUser(userId, {
        title: '🌟 Welcome to AdhocX!',
        body: `Welcome ${name}! Your account as ${role} is ready. Complete your profile to get started.`,
        type: NotificationType.SYSTEM,
        saveInApp: true,
      });
    }

    const recipient = email || phone || 'Partner';
    this.logger.log(`🌟 [WELCOME] ${recipient} — ${name} as ${role}`);

    return { success: true };
  }

  // ─── Realtime Event Bus (SSE) ───────────────────────────────────────────────

  /**
   * Emit a realtime event on a named channel (e.g. `driver:abc`, `vendor:xyz`, `user:123`, `broadcast:all`).
   */
  emitEvent(channel: string, event: string, payload: Record<string, any>): void {
    const realtimeEvent: RealtimeEvent = {
      channel,
      event,
      payload,
      timestamp: new Date().toISOString(),
    };
    this.logger.debug(`📡 [SSE EVENT] Channel: ${channel} | Event: ${event}`);
    this.eventBus.next(realtimeEvent);
  }

  /**
   * Returns an Observable that emits only the events matching the given channel.
   */
  getEventStream(channel: string): Observable<{ data: RealtimeEvent }> {
    return this.eventBus.asObservable().pipe(
      filter((evt) => evt.channel === channel || evt.channel === 'broadcast:all'),
      map((evt) => ({ data: evt })),
    );
  }
}
