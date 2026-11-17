import { Injectable, Logger, OnModuleInit, NotFoundException, BadRequestException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { Subject, Observable, filter, map, interval, merge } from 'rxjs';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { getApps, initializeApp, cert, App, ServiceAccount } from 'firebase-admin/app';
import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';
import { DatabaseService } from '../../database/database.service';
import { NotificationQueueService } from './notification-queue.service';
import { Msg91Service } from './msg91.service';
import {
  DevicePlatform,
  NotificationType,
  UserRole,
  DriverAvailability,
  VerificationStatus,
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
  tokenResults?: PushTokenResult[];
}

export interface PushTokenResult {
  token: string;
  status: 'PENDING' | 'FAILED';
  providerAccepted: boolean;
  providerMessageId?: string;
  attemptedAt?: Date;
  failureReason?: string;
}

type CampaignRecipientStatus = 'PENDING' | 'DELIVERED' | 'FAILED';

export interface CampaignRecipientCounts {
  sent: number;
  delivered: number;
  failed: number;
  pending: number;
}

interface CampaignTrackingSchemaState {
  hasTrackingColumn: boolean;
  hasRecipientTable: boolean;
  hasRecipientDetails: boolean;
}

interface LegacyCampaignHistoryRow {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  actionUrl: string | null;
  targetRole: string | null;
  targetFilter: unknown;
  totalTargeted: number;
  successCount: number;
  failureCount: number;
  status: string;
  sentBy: string | null;
  createdAt: Date;
}

export interface CampaignDeviceDetail {
  deviceTokenId: string;
  platform: string;
  model: string | null;
  appVersion: string | null;
  maskedToken: string;
  isActive: boolean;
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
  status: 'SENDING' | 'PENDING' | 'FAILED';
  providerAccepted: boolean | null;
  providerMessageId: string | null;
  attemptedAt: string | null;
  failureReason: string | null;
}

export interface CampaignRecipientProfile {
  accountStatus: string | null;
  createdAt: string | null;
  driver?: {
    verificationStatus: string;
    availabilityStatus: string;
    vehicleType: string | null;
    vehicleModel: string | null;
    vehiclePlate: string | null;
  };
  vendor?: {
    organizationName: string;
    verificationStatus: string;
  };
  corporateEmployee?: {
    fullName: string | null;
    phoneNumber: string | null;
  };
}

export interface BroadcastProgressRecipient {
  userId: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  status: 'SENDING' | 'PENDING' | 'PARTIAL' | 'FAILED';
  deviceCount: number;
  providerAcceptedCount: number;
  providerFailedCount: number;
  failureReason: string | null;
  profile: CampaignRecipientProfile;
  devices: CampaignDeviceDetail[];
}

export interface NotificationBroadcastProgress {
  operationId: string;
  phase: 'PREPARING' | 'SENDING' | 'SAVING' | 'COMPLETED' | 'FAILED';
  title: string;
  audience: string;
  startedAt: string;
  updatedAt: string;
  campaignId: string | null;
  failureMessage: string | null;
  recipientDetailsPersisted: boolean | null;
  counts: {
    targetedUsers: number;
    targetedDevices: number;
    providerResponses: number;
    providerNotAttempted: number;
    providerAccepted: number;
    providerFailed: number;
    awaitingProviderResponse: number;
    usersWithAcceptedDevice: number;
    usersFullyFailed: number;
    usersWithoutActiveDevice: number;
    confirmedDelivered: number;
  };
  recipients: BroadcastProgressRecipient[];
}

function summarizeBroadcastProgress(
  recipients: BroadcastProgressRecipient[],
  targetedDevices: number,
): NotificationBroadcastProgress['counts'] {
  const devices = recipients.flatMap((recipient) => recipient.devices);
  const providerResponses = devices.filter(
    (device) => device.attemptedAt !== null,
  ).length;
  const providerNotAttempted = devices.filter(
    (device) => device.attemptedAt === null && device.failureReason !== null,
  ).length;

  return {
    targetedUsers: recipients.length,
    targetedDevices,
    providerResponses,
    providerNotAttempted,
    providerAccepted: recipients.reduce(
      (total, recipient) => total + recipient.providerAcceptedCount,
      0,
    ),
    providerFailed: recipients.reduce(
      (total, recipient) => total + recipient.providerFailedCount,
      0,
    ),
    awaitingProviderResponse: Math.max(
      0,
      targetedDevices - providerResponses - providerNotAttempted,
    ),
    usersWithAcceptedDevice: recipients.filter(
      (recipient) => recipient.providerAcceptedCount > 0,
    ).length,
    usersFullyFailed: recipients.filter(
      (recipient) => recipient.status === 'FAILED',
    ).length,
    usersWithoutActiveDevice: recipients.filter(
      (recipient) => recipient.deviceCount === 0,
    ).length,
    confirmedDelivered: 0,
  };
}

function summarizeCampaignRecipients(recipients: Array<{ status: string }>): CampaignRecipientCounts {
  const counts: CampaignRecipientCounts = {
    sent: recipients.length,
    delivered: 0,
    failed: 0,
    pending: 0,
  };

  recipients.forEach(({ status }) => {
    if (status === 'DELIVERED') counts.delivered++;
    else if (status === 'FAILED') counts.failed++;
    else counts.pending++;
  });

  return counts;
}

function otpEmailTemplate(otp: string, fullName?: string): string {
  const recipient = fullName ? fullName.trim() : 'there';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your AdhocX Verification Code</title>
  <style>
    body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    body { margin: 0; padding: 0; width: 100% !important; background-color: #F8FAFC; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #F8FAFC; color: #0F172A;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; width: 100%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);">
          <!-- Minimal Brand Wordmark -->
          <tr>
            <td style="padding-bottom: 24px; border-bottom: 1px solid #F1F5F9;">
              <span style="font-size: 22px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px;">Adhoc<span style="color: #2563EB;">X</span></span>
            </td>
          </tr>

          <!-- Message Body -->
          <tr>
            <td style="padding-top: 24px;">
              <p style="margin: 0 0 12px 0; font-size: 15px; color: #0F172A; font-weight: 500;">
                Hello ${recipient},
              </p>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.5; color: #475569;">
                Here is your verification code to sign up or log in to your AdhocX account:
              </p>

              <!-- Clean, Prominent OTP Code -->
              <div style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0F172A; margin: 24px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace;">
                ${otp}
              </div>

              <p style="margin: 0 0 8px 0; font-size: 13px; line-height: 1.5; color: #64748B;">
                This code will expire in 5 minutes.
              </p>
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #94A3B8;">
                If you did not request this verification code, please ignore this email.
              </p>
            </td>
          </tr>

          <!-- Minimal Footer -->
          <tr>
            <td style="padding-top: 24px; margin-top: 24px; border-top: 1px solid #F1F5F9; font-size: 11px; color: #94A3B8;">
              <p style="margin: 0;">© 2026 AdhocX Technologies Inc. All rights reserved.</p>
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
  const recipient = fullName ? fullName.trim() : 'there';

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
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; width: 100%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);">
          <tr>
            <td style="padding-bottom: 24px; border-bottom: 1px solid #F1F5F9;">
              <span style="font-size: 22px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px;">Adhoc<span style="color: #2563EB;">X</span></span>
            </td>
          </tr>

          <tr>
            <td style="padding-top: 24px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0F172A;">Account Verification Approved</h2>
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">Hello <strong>${recipient}</strong>,</p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Your submitted KYC documentation and credentials have been verified and approved. Your AdhocX account is now active with full platform access.
              </p>

              <div style="margin: 24px 0;">
                <a href="https://app.adhocx.com" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 6px;">Open AdhocX Portal</a>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding-top: 24px; border-top: 1px solid #F1F5F9; font-size: 11px; color: #94A3B8;">
              <p style="margin: 0;">© 2026 AdhocX Technologies Inc. All rights reserved.</p>
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
  const recipient = fullName ? fullName.trim() : 'there';

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
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; width: 100%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);">
          <tr>
            <td style="padding-bottom: 24px; border-bottom: 1px solid #F1F5F9;">
              <span style="font-size: 22px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px;">Adhoc<span style="color: #2563EB;">X</span></span>
            </td>
          </tr>

          <tr>
            <td style="padding-top: 24px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0F172A;">Verification Documentation Update</h2>
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">Hello <strong>${recipient}</strong>,</p>
              <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                During our compliance verification review, some submitted documentation requires your attention before approval can be completed.
              </p>

              <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-left: 3px solid #D97706; border-radius: 6px; padding: 14px; margin: 20px 0;">
                <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #92400E; text-transform: uppercase;">Review Feedback:</p>
                <p style="margin: 0; font-size: 14px; color: #78350F; line-height: 1.5;">${reason}</p>
              </div>

              <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 1.6; color: #64748B;">
                Please re-submit clear documents directly within the AdhocX application.
              </p>

              <div style="margin: 20px 0;">
                <a href="https://app.adhocx.com" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 6px;">Re-Submit Documents</a>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding-top: 24px; border-top: 1px solid #F1F5F9; font-size: 11px; color: #94A3B8;">
              <p style="margin: 0;">© 2026 AdhocX Technologies Inc. All rights reserved.</p>
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
  const recipient = fullName ? fullName.trim() : role === 'DRIVER' ? 'Driver' : 'User';

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
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" border="0" style="max-width: 480px; width: 100%; background-color: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);">
          <tr>
            <td style="padding-bottom: 24px; border-bottom: 1px solid #F1F5F9;">
              <span style="font-size: 22px; font-weight: 800; color: #0F172A; letter-spacing: -0.5px;">Adhoc<span style="color: #2563EB;">X</span></span>
            </td>
          </tr>

          <tr>
            <td style="padding-top: 24px;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0F172A;">Welcome to AdhocX</h2>
              <p style="margin: 0 0 16px 0; font-size: 14px; color: #475569;">Hello <strong>${recipient}</strong>,</p>
              <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 1.6; color: #475569;">
                Thank you for registering on AdhocX as an authorized <strong style="color: #2563EB;">${role}</strong>. You now have access to our dispatch network, rate cards, and operations portal.
              </p>

              <div style="margin: 24px 0;">
                <a href="https://app.adhocx.com" style="display: inline-block; background-color: #2563EB; color: #FFFFFF; font-size: 14px; font-weight: 600; text-decoration: none; padding: 10px 20px; border-radius: 6px;">Open AdhocX Portal</a>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding-top: 24px; border-top: 1px solid #F1F5F9; font-size: 11px; color: #94A3B8;">
              <p style="margin: 0;">© 2026 AdhocX Technologies Inc. All rights reserved.</p>
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
  private readonly broadcastProgressById = new Map<
    string,
    NotificationBroadcastProgress
  >();

  public getFirebaseApp(): App | null {
    return this.firebaseApp;
  }

  private pruneBroadcastProgress() {
    const expiresBefore = Date.now() - 30 * 60 * 1000;
    this.broadcastProgressById.forEach((progress, operationId) => {
      if (
        (progress.phase === 'COMPLETED' || progress.phase === 'FAILED') &&
        new Date(progress.updatedAt).getTime() < expiresBefore
      ) {
        this.broadcastProgressById.delete(operationId);
      }
    });
  }

  private setBroadcastProgress(
    operationId: string,
    updates: Partial<NotificationBroadcastProgress>,
  ) {
    const current = this.broadcastProgressById.get(operationId);
    if (!current) return;
    this.broadcastProgressById.set(operationId, {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  }

  async getBroadcastProgress(operationId: string) {
    this.pruneBroadcastProgress();
    const progress = this.broadcastProgressById.get(operationId);
    if (!progress) {
      throw new NotFoundException(
        'Live notification progress is unavailable or has expired',
      );
    }
    return JSON.parse(
      JSON.stringify(progress),
    ) as NotificationBroadcastProgress;
  }

  /** RxJS subject backing the SSE event stream */
  private readonly eventBus = new Subject<RealtimeEvent>();

  constructor(
    private readonly configService: ConfigService,
    @Optional() private readonly db?: DatabaseService,
    @Optional() private readonly queue?: NotificationQueueService,
    @Optional() private readonly msg91Service?: Msg91Service,
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
      this.logger.warn(
        `⚠️ Firebase Admin initialization notice: ${err.message}. Push notifications will remain pending without an FCM provider response.`,
      );
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

    this.transporter
      .verify()
      .then(() => {
        this.logger.log(`📧 SMTP connected successfully to ${host}:${port} as ${user}`);
      })
      .catch((err: any) => {
        this.logger.warn(`⚠️ SMTP connection failed (emails will be logged only): ${err.message}`);
      });
  }

  // ─── Private Email Sender ────────────────────────────────────────────────────

  private async sendEmail(to: string, subject: string, html: string, text?: string): Promise<string | null> {
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

    try {
      // 1. Verify user exists to prevent Prisma Foreign Key violation (P2003)
      const user = await this.db.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });

      if (!user) {
        this.logger.warn(`⚠️ [DEVICE TOKEN] User ${userId} not found in database. Registration skipped.`);
        return { success: false, message: 'User account not found' };
      }

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
    } catch (err: any) {
      this.logger.error(`❌ [DEVICE TOKEN ERROR] Failed to register token for ${userId}: ${err.message}`, err.stack);
      return { success: false, error: err.message };
    }
  }

  /**
   * Unregister / deactivate a device token on logout.
   */
  async unregisterDeviceToken(token: string) {
    if (!this.db) return { success: true };
    try {
      await this.db.deviceToken.updateMany({
        where: { token },
        data: { isActive: false },
      });
      this.logger.log(`📱 [DEVICE TOKEN DEACTIVATED] Token: ${token.substring(0, 10)}...`);
      return { success: true };
    } catch (err: any) {
      this.logger.warn(`⚠️ [DEVICE TOKEN UNREGISTER NOTICE] Token not found or already deactivated: ${err.message}`);
      return { success: true };
    }
  }

  // ─── Multi-Cast FCM Push Core Engine ──────────────────────────────────────────

  /**
   * Send FCM push notification to multiple device registration tokens.
   */
  async sendPushToTokens(
    tokens: string[],
    notification: {
      title: string;
      body: string;
      imageUrl?: string;
      actionUrl?: string;
    },
    data?: Record<string, string>,
    priority: 'normal' | 'high' = 'high',
  ): Promise<PushSendResult> {
    return this.sendPushToTokensSync(tokens, notification, data, priority);
  }

  private async sendPushToTokensSync(
    tokens: string[],
    notification: {
      title: string;
      body: string;
      imageUrl?: string;
      actionUrl?: string;
    },
    data?: Record<string, string>,
    priority: 'normal' | 'high' = 'high',
    onProgress?: (result: PushSendResult) => void,
  ): Promise<PushSendResult> {
    if (!tokens || tokens.length === 0) {
      const result: PushSendResult = {
        success: false,
        totalTokens: 0,
        successCount: 0,
        failureCount: 0,
        tokenResults: [],
      };
      onProgress?.(result);
      return result;
    }

    const title = this.queue ? this.queue.sanitizeText(notification.title) : notification.title;
    const body = this.queue ? this.queue.sanitizeText(notification.body) : notification.body;
    const { imageUrl, actionUrl } = notification;

    const stringData: Record<string, string> = {
      title,
      body,
      actionUrl: actionUrl || '',
      route: actionUrl || '',
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
      imageUrl: imageUrl || '',
      timestamp: new Date().toISOString(),
      ...(data || {}),
    };
    if (actionUrl) {
      if (!stringData.actionUrl) stringData.actionUrl = actionUrl;
      if (!stringData.route) stringData.route = actionUrl;
    }
    if (!stringData.click_action) stringData.click_action = 'FLUTTER_NOTIFICATION_CLICK';

    if (!this.fcmInitialized || !getApps().length) {
      this.logger.log(`🔔 [FCM NOT CONFIGURED] ${tokens.length} token(s) remain pending; no provider request was made.`);
      const result: PushSendResult = {
        success: false,
        totalTokens: tokens.length,
        successCount: 0,
        failureCount: 0,
        tokenResults: tokens.map((token) => ({
          token,
          status: 'PENDING',
          providerAccepted: false,
        })),
      };
      onProgress?.(result);
      return result;
    }

    const simulatedTokens = tokens.filter(
      (t) => t.startsWith('fcm_tok_') || t.startsWith('sim_') || t.startsWith('mock_') || t.startsWith('test_'),
    );
    const realTokens = tokens.filter(
      (t) => !t.startsWith('fcm_tok_') && !t.startsWith('sim_') && !t.startsWith('mock_') && !t.startsWith('test_'),
    );

    let successCount = 0;
    let failureCount = 0;
    const failedTokens: string[] = [];
    const staleTokens: string[] = [];
    const tokenResults: PushTokenResult[] = simulatedTokens.map((token) => ({
      token,
      status: 'PENDING',
      providerAccepted: false,
    }));

    if (simulatedTokens.length > 0) {
      this.logger.log(`📱 [SIMULATED TOKENS] ${simulatedTokens.length} test token(s) remain pending; they were not sent to FCM.`);
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
            icon: 'adhocx_notification_mark',
            color: '#5728b2',
            sound: isUrgentDispatch ? 'adhocx_dispatch_alert' : 'default',
            channelId: isUrgentDispatch ? 'adhocx_trip_dispatch_urgent' : 'adhocx_operational_alerts',
            clickAction: 'FLUTTER_NOTIFICATION_CLICK',
            ...(imageUrl ? { imageUrl } : {}),
          },
        },
        apns: {
          headers: {
            'apns-priority': isUrgentDispatch ? '10' : '5',
            'apns-push-type': 'alert',
            ...(isUrgentDispatch
              ? {
                  'apns-expiration': String(Math.floor(Date.now() / 1000) + 30),
                }
              : {}),
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
        const attemptedAt = new Date();

        response.responses.forEach((resp, idx: number) => {
          const token = chunk[idx];
          if (resp.success) {
            tokenResults.push({
              token,
              status: 'PENDING',
              providerAccepted: true,
              providerMessageId: resp.messageId,
              attemptedAt,
            });
          } else {
            failedTokens.push(token);
            const errorCode = resp.error?.code;
            if (errorCode === 'messaging/registration-token-not-registered' || errorCode === 'messaging/invalid-registration-token') {
              staleTokens.push(token);
            }
            const failureReason =
              resp.error?.code && resp.error.message
                ? `${resp.error.code}: ${resp.error.message}`
                : resp.error?.message || resp.error?.code || 'FCM returned a failed response without an error message.';
            tokenResults.push({
              token,
              status: 'FAILED',
              providerAccepted: false,
              attemptedAt,
              failureReason,
            });
            this.logger.warn(`Push delivery failed for token ${token.substring(0, 10)}... : ${failureReason}`);
          }
        });
      } catch (err: any) {
        this.logger.error(`Error sending FCM multicast chunk: ${err.message}`);
        failureCount += chunk.length;
        const attemptedAt = new Date();
        const failureReason = err instanceof Error ? err.message : String(err);
        chunk.forEach((token) => {
          failedTokens.push(token);
          tokenResults.push({
            token,
            status: 'FAILED',
            providerAccepted: false,
            attemptedAt,
            failureReason,
          });
        });
      }
      onProgress?.({
        success: successCount > 0,
        totalTokens: tokens.length,
        successCount,
        failureCount,
        failedTokens: [...failedTokens],
        tokenResults: [...tokenResults],
      });
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

    this.logger.log(`🔔 [FCM PUSH DISPATCHED] Total: ${tokens.length} | Success: ${successCount} | Failed: ${failureCount}`);

    return {
      success: successCount > 0,
      totalTokens: tokens.length,
      successCount,
      failureCount,
      failedTokens,
      tokenResults,
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
        return {
          success: true,
          totalTokens: 0,
          successCount: 0,
          failureCount: 0,
        };
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
    const effectiveActionUrl = actionUrl || (data && (data.actionUrl || data.route)) || '';

    // Check user notification preferences if DB available
    let allowPush = true;
    if (this.db) {
      try {
        const pref = await this.db.notificationPreference.findUnique({
          where: { userId },
        });
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
            data: {
              ...(data ? JSON.parse(JSON.stringify(data)) : {}),
              actionUrl: effectiveActionUrl || '',
              route: effectiveActionUrl || '',
            },
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
      return {
        success: true,
        totalTokens: 0,
        successCount: 0,
        failureCount: 0,
      };
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
      return {
        success: true,
        totalTokens: 0,
        successCount: 0,
        failureCount: 0,
      };
    }

    // 4. Send FCM Multicast
    const stringData: Record<string, string> = {};
    for (const [k, v] of Object.entries(data)) {
      stringData[k] = typeof v === 'string' ? v : JSON.stringify(v);
    }
    if (effectiveActionUrl) {
      if (!stringData.actionUrl) stringData.actionUrl = effectiveActionUrl;
      if (!stringData.route) stringData.route = effectiveActionUrl;
    }
    if (!stringData.click_action) stringData.click_action = 'FLUTTER_NOTIFICATION_CLICK';

    return this.sendPushToTokensSync(tokens, { title, body, imageUrl, actionUrl: effectiveActionUrl }, stringData, 'high');
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
    notification: {
      title: string;
      body: string;
      imageUrl?: string;
      actionUrl?: string;
    },
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
  private buildAudienceWhere(filter?: AudienceFilterDto): {
    userWhere: any;
    driverWhere?: any;
  } {
    const userWhere: any = { status: 'ACTIVE' };

    if (!filter) return { userWhere };

    if (filter.role && filter.role !== 'ALL') {
      userWhere.role = filter.role as UserRole;
    }

    const audienceConditions: any[] = [];
    if (filter.userIds && filter.userIds.length > 0) {
      audienceConditions.push({ id: { in: filter.userIds } });
    }

    if (filter.phones && filter.phones.length > 0) {
      const variants: string[] = [];
      filter.phones.forEach((p) => {
        const clean = p.trim();
        if (!clean) return;
        variants.push(clean);
        if (!clean.startsWith('+')) {
          variants.push(`+91${clean.replace(/^0+/, '')}`);
        }
        const digits = clean.replace(/\D/g, '');
        if (digits.length >= 10) {
          variants.push(digits.slice(-10));
        }
      });
      audienceConditions.push({ phone: { in: Array.from(new Set(variants)) } });
    }

    if (audienceConditions.length === 1) {
      Object.assign(userWhere, audienceConditions[0]);
    } else if (audienceConditions.length > 1) {
      userWhere.AND = [{ OR: audienceConditions }];
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
      driverConditions.vehicleType = { in: filter.vehicleTypes };
    }

    if (Object.keys(driverConditions).length > 0) {
      if (filter.role === UserRole.DRIVER) {
        userWhere.driver = driverConditions;
      } else if (!filter.role || filter.role === 'ALL') {
        // If targeting ALL, non-drivers match unconditionally OR drivers match driverConditions
        const existingAnd = Array.isArray(userWhere.AND) ? userWhere.AND : [];
        userWhere.AND = [
          ...existingAnd,
          {
            OR: [{ role: { not: UserRole.DRIVER } }, { role: UserRole.DRIVER, driver: driverConditions }],
          },
        ];
      }
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
  async broadcastPush(
    dto: BroadcastPushDto,
    adminId?: string,
    requestedOperationId?: string,
  ) {
    if (!this.db) throw new BadRequestException('Database service unavailable');

    const operationId = requestedOperationId?.trim() || randomUUID();
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        operationId,
      )
    ) {
      throw new BadRequestException('Invalid notification operation ID');
    }

    this.pruneBroadcastProgress();
    if (this.broadcastProgressById.has(operationId)) {
      throw new BadRequestException(
        'This notification operation ID has already been used',
      );
    }
    const now = new Date().toISOString();
    const hasSpecificAudience = Boolean(
      dto.filter?.userIds?.length || dto.filter?.phones?.length,
    );
    this.broadcastProgressById.set(operationId, {
      operationId,
      phase: 'PREPARING',
      title: dto.title,
      audience: hasSpecificAudience ? 'SPECIFIC' : dto.filter?.role || 'ALL',
      startedAt: now,
      updatedAt: now,
      campaignId: null,
      failureMessage: null,
      recipientDetailsPersisted: null,
      counts: {
        targetedUsers: 0,
        targetedDevices: 0,
        providerResponses: 0,
        providerNotAttempted: 0,
        providerAccepted: 0,
        providerFailed: 0,
        awaitingProviderResponse: 0,
        usersWithAcceptedDevice: 0,
        usersFullyFailed: 0,
        usersWithoutActiveDevice: 0,
        confirmedDelivered: 0,
      },
      recipients: [],
    });

    try {
      const result = await this.dispatchBroadcastPush(
        dto,
        adminId,
        operationId,
      );
      this.setBroadcastProgress(operationId, {
        phase: 'COMPLETED',
        campaignId: result.campaignId,
        recipientDetailsPersisted: result.recipientDetailsPersisted,
      });
      return { ...result, operationId };
    } catch (error) {
      this.setBroadcastProgress(operationId, {
        phase: 'FAILED',
        failureMessage:
          error instanceof Error
            ? error.message
            : 'The notification broadcast failed unexpectedly.',
      });
      throw error;
    }
  }

  private async dispatchBroadcastPush(
    dto: BroadcastPushDto,
    adminId: string | undefined,
    operationId: string,
  ) {
    if (!this.db) throw new BadRequestException('Database service unavailable');
    const recipientTrackingAvailable = await this.hasCampaignRecipientTracking();

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
        driver: {
          select: {
            fullName: true,
            phone: true,
            verificationStatus: true,
            availabilityStatus: true,
            vehicleType: true,
            vehicleModel: true,
            vehiclePlate: true,
          },
        },
        vendor: {
          select: {
            fullName: true,
            phone: true,
            organizationName: true,
            verificationStatus: true,
          },
        },
        corporateEmployee: {
          select: { fullName: true, phoneNumber: true },
        },
      },
    });

    const targetUsers = users.filter((u) => !u.notificationPreference || u.notificationPreference.pushEnabled);
    const targetUserIds = targetUsers.map((u) => u.id);
    const allTokens = targetUsers.flatMap((u) => u.deviceTokens.map((token) => token.token));

    if (dryRun) {
      return {
        dryRun: true,
        totalTargetedUsers: targetUsers.length,
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
      route: actionUrl || '',
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
      imageUrl: imageUrl || '',
      ...(data || {}),
    };

    const providerConfigured = this.fcmInitialized && getApps().length > 0;
    const buildProgressRecipients = (
      results: PushTokenResult[],
      sending: boolean,
    ): BroadcastProgressRecipient[] => {
      const outcomesByToken = new Map(
        results.map((result) => [result.token, result]),
      );

      return targetUsers.map((user) => {
        const devices: CampaignDeviceDetail[] = user.deviceTokens.map(
          (device) => {
            const outcome = outcomesByToken.get(device.token);
            const isSimulatedToken =
              device.token.startsWith('fcm_tok_') ||
              device.token.startsWith('sim_') ||
              device.token.startsWith('mock_') ||
              device.token.startsWith('test_');
            const failureReason =
              outcome?.failureReason ??
              (!providerConfigured
                ? 'FCM provider is not configured; no provider request was made.'
                : isSimulatedToken
                  ? 'Test/simulated device token was excluded from provider sends.'
                  : null);

            return {
              deviceTokenId: device.id,
              platform: device.platform,
              model: device.deviceModel,
              appVersion: device.appVersion,
              maskedToken:
                device.token.length > 6
                  ? `••••${device.token.slice(-6)}`
                  : '••••',
              isActive: device.isActive,
              lastActiveAt: device.lastActiveAt?.toISOString() ?? null,
              createdAt: device.createdAt.toISOString(),
              updatedAt: device.updatedAt.toISOString(),
              status:
                outcome?.status === 'FAILED'
                  ? 'FAILED'
                  : outcome?.providerAccepted
                    ? 'PENDING'
                    : outcome || !sending
                      ? 'PENDING'
                      : 'SENDING',
              providerAccepted:
                outcome?.attemptedAt != null
                  ? outcome.providerAccepted
                  : null,
              providerMessageId: outcome?.providerMessageId ?? null,
              attemptedAt: outcome?.attemptedAt?.toISOString() ?? null,
              failureReason,
            };
          },
        );
        const acceptedCount = devices.filter(
          (device) => device.providerAccepted === true,
        ).length;
        const failedDevices = devices.filter(
          (device) => device.status === 'FAILED',
        );
        const isSending = devices.some(
          (device) => device.status === 'SENDING',
        );
        const status = isSending
          ? 'SENDING'
          : devices.length > 0 && failedDevices.length === devices.length
            ? 'FAILED'
            : acceptedCount > 0 && failedDevices.length > 0
              ? 'PARTIAL'
              : 'PENDING';
        const failureReasons = Array.from(
          new Set(
            failedDevices
              .map((device) => device.failureReason)
              .filter((reason): reason is string => Boolean(reason)),
          ),
        );
        const profile: CampaignRecipientProfile = {
          accountStatus: user.status ?? null,
          createdAt: user.createdAt?.toISOString() ?? null,
          ...(user.driver
            ? {
                driver: {
                  verificationStatus: user.driver.verificationStatus,
                  availabilityStatus: user.driver.availabilityStatus,
                  vehicleType: user.driver.vehicleType,
                  vehicleModel: user.driver.vehicleModel,
                  vehiclePlate: user.driver.vehiclePlate,
                },
              }
            : {}),
          ...(user.vendor
            ? {
                vendor: {
                  organizationName: user.vendor.organizationName,
                  verificationStatus: user.vendor.verificationStatus,
                },
              }
            : {}),
          ...(user.corporateEmployee
            ? {
                corporateEmployee: {
                  fullName: user.corporateEmployee.fullName,
                  phoneNumber: user.corporateEmployee.phoneNumber,
                },
              }
            : {}),
        };

        return {
          userId: user.id,
          name:
            user.fullName ??
            user.driver?.fullName ??
            user.vendor?.fullName ??
            user.corporateEmployee?.fullName ??
            null,
          email: user.email ?? null,
          phone:
            user.phone ??
            user.driver?.phone ??
            user.vendor?.phone ??
            user.corporateEmployee?.phoneNumber ??
            null,
          role: user.role,
          status,
          deviceCount: devices.length,
          providerAcceptedCount: acceptedCount,
          providerFailedCount: failedDevices.length,
          failureReason:
            failureReasons.length > 0
              ? failureReasons.join('\n')
              : devices.length === 0
                ? 'No active push device tokens were registered.'
                : null,
          profile,
          devices,
        };
      });
    };

    const initialProgressRecipients = buildProgressRecipients([], true);
    this.setBroadcastProgress(operationId, {
      phase: allTokens.length > 0 ? 'SENDING' : 'SAVING',
      counts: summarizeBroadcastProgress(
        initialProgressRecipients,
        allTokens.length,
      ),
      recipients: initialProgressRecipients,
    });

    const pushResult = await this.sendPushToTokensSync(
      allTokens,
      { title, body, imageUrl, actionUrl },
      stringData,
      priority,
      (snapshot) => {
        const recipients = buildProgressRecipients(
          snapshot.tokenResults ?? [],
          true,
        );
        this.setBroadcastProgress(operationId, {
          phase: 'SENDING',
          counts: summarizeBroadcastProgress(recipients, allTokens.length),
          recipients,
        });
      },
    );
    const progressRecipients = buildProgressRecipients(
      pushResult.tokenResults ?? [],
      false,
    );
    const recipientRows = progressRecipients.map((recipient) => {
      const failedDevices = recipient.devices.filter(
        (device) => device.status === 'FAILED',
      );
      const latestAttempt = recipient.devices.reduce<Date | undefined>(
        (latest, device) => {
          if (!device.attemptedAt) return latest;
          const attemptedAt = new Date(device.attemptedAt);
          return !latest || attemptedAt > latest ? attemptedAt : latest;
        },
        undefined,
      );

      return {
        userId: recipient.userId,
        recipientName: recipient.name,
        recipientPhone: recipient.phone,
        status: (recipient.status === 'FAILED'
          ? 'FAILED'
          : 'PENDING') as CampaignRecipientStatus,
        deviceCount: recipient.deviceCount,
        providerAcceptedCount: recipient.providerAcceptedCount,
        providerFailedCount: recipient.providerFailedCount,
        providerMessageIds: recipient.devices.flatMap((device) =>
          device.providerMessageId ? [device.providerMessageId] : [],
        ),
        attemptedAt: latestAttempt,
        failedAt:
          recipient.status === 'FAILED' ? latestAttempt : undefined,
        failureReason:
          failedDevices.length > 0
            ? failedDevices
                .map((device) => device.failureReason)
                .filter((reason): reason is string => Boolean(reason))
                .join('\n')
            : recipient.deviceCount === 0
              ? recipient.failureReason ?? undefined
              : undefined,
      };
    });
    const recipientCounts = summarizeCampaignRecipients(recipientRows);
    this.setBroadcastProgress(operationId, {
      phase: 'SAVING',
      counts: summarizeBroadcastProgress(progressRecipients, allTokens.length),
      recipients: progressRecipients,
    });

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
    const status =
      pushResult.successCount > 0
        ? pushResult.failureCount > 0
          ? 'PARTIAL'
          : recipientTrackingAvailable
            ? 'SENT'
            : 'PENDING'
        : pushResult.failureCount > 0
          ? 'FAILED'
          : 'PENDING';
    const targetFilter = audienceFilter ? JSON.parse(JSON.stringify(audienceFilter)) : undefined;
    let campaign: { id: string; status: string };

    if (recipientTrackingAvailable) {
      campaign = await this.db.notificationCampaign.create({
        data: {
          title,
          body,
          imageUrl,
          actionUrl,
          targetRole: audienceFilter?.role || 'ALL',
          targetFilter,
          totalTargeted: allTokens.length,
          successCount: pushResult.successCount,
          failureCount: pushResult.failureCount,
          status,
          sentBy: adminId || 'ADMIN',
          recipientTrackingEnabled: true,
          ...(recipientRows.length > 0
            ? {
                recipients: {
                  createMany: {
                    data: recipientRows,
                    skipDuplicates: true,
                  },
                },
              }
            : {}),
        },
      });
    } else {
      const campaignId = randomUUID();
      const targetFilterJson = targetFilter ? JSON.stringify(targetFilter) : null;
      const savedCampaign = await this.db.$queryRaw<Array<{ id: string; status: string }>>`
        INSERT INTO notification_campaigns (
          id, title, body, image_url, action_url, target_role, target_filter,
          total_targeted, success_count, failure_count, status, sent_by
        )
        VALUES (
          ${campaignId}::uuid, ${title}, ${body}, ${imageUrl ?? null},
          ${actionUrl ?? null}, ${audienceFilter?.role || 'ALL'},
          ${targetFilterJson}::jsonb, ${allTokens.length},
          ${pushResult.successCount}, ${pushResult.failureCount}, ${status},
          ${adminId || 'ADMIN'}
        )
        RETURNING id::text AS id, status
      `;
      campaign = savedCampaign[0];
      if (!campaign) {
        throw new BadRequestException('Campaign could not be saved');
      }
    }
    this.setBroadcastProgress(operationId, { campaignId: campaign.id });

    let recipientDetailsPersisted = recipientTrackingAvailable;
    if (recipientTrackingAvailable && progressRecipients.length > 0) {
      const detailRows = progressRecipients.map((recipient) => ({
        userId: recipient.userId,
        role: recipient.role,
        email: recipient.email,
        profile: recipient.profile,
        devices: recipient.devices,
      }));
      try {
        await this.db.$executeRaw`
          UPDATE notification_campaign_recipients AS stored
          SET
            recipient_role = details.role,
            recipient_email = details.email,
            recipient_profile = details.profile,
            device_details = details.devices
          FROM jsonb_to_recordset(${JSON.stringify(detailRows)}::jsonb) AS details(
            "userId" UUID,
            role TEXT,
            email TEXT,
            profile JSONB,
            devices JSONB
          )
          WHERE stored.campaign_id = ${campaign.id}::uuid
            AND stored.user_id = details."userId"
        `;
      } catch (error) {
        recipientDetailsPersisted = false;
        this.logger.error(
          `Campaign ${campaign.id} was saved but recipient device details could not be persisted: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    this.logger.log(`📢 [ADMIN CAMPAIGN DISPATCHED] Campaign ID: ${campaign.id} | Recipients: ${targetUsers.length}`);

    return {
      campaignId: campaign.id,
      totalTargetedUsers: targetUsers.length,
      totalTargetedDevices: allTokens.length,
      successCount: pushResult.successCount,
      failureCount: pushResult.failureCount,
      recipientCounts,
      status: campaign.status,
      recipientDetailsPersisted,
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
        {
          actionUrl: actionUrl || '',
          route: actionUrl || '',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          ...(data || {}),
        },
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
          OR: [{ phone: cleanPhone }, { phone: normalizedWithPlus }, ...(tenDigits ? [{ phone: { endsWith: tenDigits } }] : [])],
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

    let pref = await this.db.notificationPreference.findUnique({
      where: { userId },
    });
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

  /**
   * Delete a single in-app notification belonging to a user.
   */
  async deleteNotification(userId: string, notificationId: string) {
    if (!this.db) return { success: true, unreadCount: 0 };
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(notificationId)) {
      const unreadCount = await this.db.notification.count({ where: { userId, isRead: false } }).catch(() => 0);
      return { success: true, deletedCount: 0, unreadCount };
    }
    try {
      const res = await this.db.notification.deleteMany({
        where: { id: notificationId, userId },
      });
      const unreadCount = await this.db.notification.count({
        where: { userId, isRead: false },
      });
      return { success: true, deletedCount: res.count, unreadCount };
    } catch (err: any) {
      this.logger.warn(`Failed to delete notification ${notificationId}: ${err.message}`);
      return { success: false, deletedCount: 0 };
    }
  }

  /**
   * Clear (delete) all in-app notifications for a user.
   */
  async clearAllNotifications(userId: string) {
    if (!this.db) return { success: true, deletedCount: 0, unreadCount: 0 };
    try {
      const res = await this.db.notification.deleteMany({
        where: { userId },
      });
      return { success: true, deletedCount: res.count, unreadCount: 0 };
    } catch (err: any) {
      this.logger.warn(`Failed to clear notifications for user ${userId}: ${err.message}`);
      return { success: false, deletedCount: 0 };
    }
  }

  // ─── Admin Campaigns & Metrics ───────────────────────────────────────────────

  private async hasCampaignRecipientTracking(): Promise<boolean> {
    const [schemaState] = await this.db!.$queryRaw<CampaignTrackingSchemaState[]>`
      SELECT
        EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'notification_campaigns'
            AND column_name = 'recipient_tracking_enabled'
        ) AS "hasTrackingColumn",
        EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = current_schema()
            AND table_name = 'notification_campaign_recipients'
        ) AS "hasRecipientTable",
        (
          SELECT COUNT(*) = 4
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'notification_campaign_recipients'
            AND column_name IN (
              'recipient_role',
              'recipient_email',
              'recipient_profile',
              'device_details'
            )
        ) AS "hasRecipientDetails"
    `;

    return Boolean(
      schemaState?.hasTrackingColumn &&
        schemaState?.hasRecipientTable &&
        schemaState?.hasRecipientDetails,
    );
  }

  /**
   * Get past notification broadcast campaigns list for Admin Portal.
   */
  async getCampaigns(query?: { page?: number; limit?: number }) {
    if (!this.db) throw new BadRequestException('Database service unavailable');

    const page = Math.max(1, Math.floor(Number(query?.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(Number(query?.limit) || 20)));
    const skip = (page - 1) * limit;

    if (!(await this.hasCampaignRecipientTracking())) {
      const [campaigns, totalRows] = await Promise.all([
        this.db.$queryRaw<LegacyCampaignHistoryRow[]>`
          SELECT
            id::text AS id,
            title,
            body,
            image_url AS "imageUrl",
            action_url AS "actionUrl",
            target_role AS "targetRole",
            target_filter AS "targetFilter",
            total_targeted AS "totalTargeted",
            success_count AS "successCount",
            failure_count AS "failureCount",
            status,
            sent_by AS "sentBy",
            created_at AS "createdAt"
          FROM notification_campaigns
          ORDER BY created_at DESC
          LIMIT ${limit}
          OFFSET ${skip}
        `,
        this.db.$queryRaw<Array<{ total: number }>>`
          SELECT COUNT(*)::int AS total
          FROM notification_campaigns
        `,
      ]);

      return {
        campaigns: campaigns.map((campaign) => ({
          id: campaign.id,
          title: campaign.title,
          body: campaign.body,
          imageUrl: campaign.imageUrl || undefined,
          actionUrl: campaign.actionUrl || undefined,
          targetRole: campaign.targetRole || 'ALL',
          targetFilter: (campaign.targetFilter as Record<string, any> | null) || undefined,
          totalTargeted: campaign.totalTargeted,
          successCount: campaign.successCount,
          failureCount: campaign.failureCount,
          status: campaign.status,
          sentBy: campaign.sentBy || 'ADMIN',
          recipientTrackingEnabled: false,
          recipientCounts: undefined,
          createdAt: campaign.createdAt.toISOString(),
        })),
        total: totalRows[0]?.total ?? 0,
        page,
        limit,
      };
    }

    const [campaigns, total] = await Promise.all([
      this.db.notificationCampaign.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.db.notificationCampaign.count(),
    ]);
    const recipientGroups = campaigns.length
      ? await this.db.notificationCampaignRecipient.groupBy({
          by: ['campaignId', 'status'],
          where: {
            campaignId: { in: campaigns.map((campaign) => campaign.id) },
          },
          _count: { _all: true },
        })
      : [];
    const recipientCountsByCampaign = new Map<string, CampaignRecipientCounts>();

    recipientGroups.forEach((group) => {
      const counts = recipientCountsByCampaign.get(group.campaignId) ?? {
        sent: 0,
        delivered: 0,
        failed: 0,
        pending: 0,
      };
      const count = group._count._all;
      counts.sent += count;
      if (group.status === 'DELIVERED') counts.delivered += count;
      else if (group.status === 'FAILED') counts.failed += count;
      else counts.pending += count;
      recipientCountsByCampaign.set(group.campaignId, counts);
    });

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
        recipientTrackingEnabled: c.recipientTrackingEnabled,
        recipientCounts: c.recipientTrackingEnabled
          ? (recipientCountsByCampaign.get(c.id) ?? {
              sent: 0,
              delivered: 0,
              failed: 0,
              pending: 0,
            })
          : undefined,
        createdAt: c.createdAt.toISOString(),
      })),
      total,
      page,
      limit,
    };
  }

  /**
   * Get stored per-user delivery results for one campaign.
   */
  async getCampaignRecipients(campaignId: string) {
    if (!this.db) throw new BadRequestException('Database service unavailable');

    if (!(await this.hasCampaignRecipientTracking())) {
      const [campaign] = await this.db.$queryRaw<Array<{ exists: boolean }>>`
        SELECT EXISTS (
          SELECT 1
          FROM notification_campaigns
          WHERE id = ${campaignId}::uuid
        ) AS "exists"
      `;
      if (!campaign?.exists) {
        throw new NotFoundException('Notification campaign not found');
      }

      return {
        campaignId,
        trackingAvailable: false,
        counts: null,
        recipients: [],
      };
    }

    const campaign = await this.db.notificationCampaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        recipientTrackingEnabled: true,
      },
    });
    if (!campaign) {
      throw new NotFoundException('Notification campaign not found');
    }

    const recipients = campaign.recipientTrackingEnabled
      ? await this.db.notificationCampaignRecipient.findMany({
          where: { campaignId },
          orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            userId: true,
            recipientName: true,
            recipientPhone: true,
            status: true,
            deviceCount: true,
            providerAcceptedCount: true,
            providerFailedCount: true,
            attemptedAt: true,
            deliveredAt: true,
            failedAt: true,
            failureReason: true,
            createdAt: true,
          },
        })
      : [];
    const detailRows = campaign.recipientTrackingEnabled
      ? await this.db.$queryRaw<
          Array<{
            userId: string | null;
            role: string | null;
            email: string | null;
            profile: CampaignRecipientProfile | null;
            devices: CampaignDeviceDetail[] | null;
          }>
        >`
          SELECT
            user_id::text AS "userId",
            recipient_role AS role,
            recipient_email AS email,
            recipient_profile AS profile,
            device_details AS devices
          FROM notification_campaign_recipients
          WHERE campaign_id = ${campaignId}::uuid
        `
      : [];
    const detailsByUserId = new Map(
      detailRows.map((details) => [details.userId, details]),
    );

    return {
      campaignId,
      trackingAvailable: campaign.recipientTrackingEnabled,
      counts: campaign.recipientTrackingEnabled ? summarizeCampaignRecipients(recipients) : null,
      recipients: recipients.map((recipient) => ({
        id: recipient.id,
        userId: recipient.userId,
        name: recipient.recipientName,
        phone: recipient.recipientPhone,
        role: detailsByUserId.get(recipient.userId)?.role ?? null,
        email: detailsByUserId.get(recipient.userId)?.email ?? null,
        profile:
          detailsByUserId.get(recipient.userId)?.profile ?? null,
        devices: detailsByUserId.get(recipient.userId)?.devices ?? [],
        status: recipient.status as CampaignRecipientStatus,
        deviceCount: recipient.deviceCount,
        providerAcceptedCount: recipient.providerAcceptedCount,
        providerFailedCount: recipient.providerFailedCount,
        timestamp: (recipient.deliveredAt ?? recipient.failedAt ?? recipient.attemptedAt ?? recipient.createdAt).toISOString(),
        deliveredAt: recipient.deliveredAt?.toISOString() ?? null,
        failedAt: recipient.failedAt?.toISOString() ?? null,
        failureReason: recipient.failureReason,
      })),
    };
  }

  /**
   * Get push notification metrics summary for Admin Portal.
   */
  async getMetrics() {
    if (!this.db) {
      return {
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        totalPending: 0,
        totalCampaigns: 0,
        activeDevicesCount: 0,
        devicesByPlatform: { android: 0, ios: 0, web: 0 },
        deliverySuccessRate: 0,
        inAppNotificationsCount: 0,
      };
    }

    const recipientTrackingAvailable = await this.hasCampaignRecipientTracking();
    const [totalCampaigns, devices, inAppCount] = await Promise.all([
      this.db.notificationCampaign.count(),
      this.db.deviceToken.findMany({ where: { isActive: true } }),
      this.db.notification.count(),
    ]);

    let android = 0;
    let ios = 0;
    let web = 0;
    devices.forEach((d) => {
      if (d.platform === DevicePlatform.ANDROID) android++;
      else if (d.platform === DevicePlatform.IOS) ios++;
      else if (d.platform === DevicePlatform.WEB) web++;
    });

    if (!recipientTrackingAvailable) {
      const [legacyCounts] = await this.db.$queryRaw<Array<{ successCount: number; failureCount: number }>>`
        SELECT
          COALESCE(SUM(success_count), 0)::int AS "successCount",
          COALESCE(SUM(failure_count), 0)::int AS "failureCount"
        FROM notification_campaigns
      `;
      const totalFailed = legacyCounts?.failureCount ?? 0;
      const totalPending = legacyCounts?.successCount ?? 0;

      return {
        totalSent: totalPending + totalFailed,
        totalDelivered: 0,
        totalFailed,
        totalPending,
        totalCampaigns,
        activeDevicesCount: devices.length,
        devicesByPlatform: { android, ios, web },
        deliverySuccessRate: 0,
        inAppNotificationsCount: inAppCount,
      };
    }

    const recipientGroups = await this.db.notificationCampaignRecipient.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const recipientCounts = recipientGroups.reduce(
      (counts, group) => {
        const count = group._count._all;
        if (group.status === 'DELIVERED') counts.delivered += count;
        else if (group.status === 'FAILED') counts.failed += count;
        else counts.pending += count;
        return counts;
      },
      { delivered: 0, failed: 0, pending: 0 },
    );

    const totalAttempted = recipientCounts.delivered + recipientCounts.failed;
    const deliverySuccessRate = totalAttempted > 0 ? Number(((recipientCounts.delivered / totalAttempted) * 100).toFixed(1)) : 0;

    return {
      totalSent: recipientCounts.delivered + recipientCounts.failed + recipientCounts.pending,
      totalDelivered: recipientCounts.delivered,
      totalFailed: recipientCounts.failed,
      totalPending: recipientCounts.pending,
      totalCampaigns,
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
        `Your AdhocX verification code is: ${otp}\n\nUse this verification code to complete your sign up or log in to your AdhocX account. This code expires in 5 minutes.\n\nIf you did not request this verification code, please ignore this email.\n\n© 2026 AdhocX Technologies Inc.`,
      );

      return {
        success: !!emailMessageId,
        channel: 'EMAIL',
        messageId: emailMessageId || messageId,
      };
    }

    if (phone) {
      if (this.msg91Service) {
        const smsResult = await this.msg91Service.sendOtp(phone, otp);
        return {
          success: smsResult.success,
          channel: 'SMS',
          messageId: smsResult.messageId,
        };
      }

      const smsText = `[AdhocX] Your authentication OTP is ${otp}. Valid for 5 minutes. Never share OTP with anyone.`;
      this.logger.log(`📱 [NOTIFICATION DISPATCH - SMS] To: ${phone} | Body: "${smsText}" | MsgID: ${messageId}`);
      return { success: true, channel: 'SMS', messageId };
    }

    throw new Error('Either phone or email must be provided to send OTP');
  }

  // ─── KYC Status Alerts ──────────────────────────────────────────────────────

  /**
   * KYC Verification Status Alerts (Approved or Declined) — sends real email + FCM push + in-app
   */
  async sendKycStatusNotification(payload: SendKycNotificationPayload): Promise<{ success: boolean }> {
    const { userId, phone, email, fullName, status, reason } = payload;
    const name = fullName || 'User';

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
    const name = fullName || (role === 'DRIVER' ? 'Driver' : 'User');

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
        actionUrl: '/verifications',
        data: { route: '/verifications' },
        saveInApp: true,
      });
    }

    const recipient = email || phone || 'User';
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
    const events$ = this.eventBus.asObservable().pipe(
      filter((evt) => evt.channel === channel || evt.channel === 'broadcast:all'),
      map((evt) => ({ data: evt })),
    );

    const heartbeat$ = interval(15000).pipe(
      map(() => ({
        data: {
          channel,
          event: 'heartbeat',
          payload: { timestamp: new Date().toISOString() },
          timestamp: new Date().toISOString(),
        } as RealtimeEvent,
      })),
    );

    return merge(events$, heartbeat$);
  }
}
