import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Subject, Observable, filter, map } from 'rxjs';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// ── Public Types ──────────────────────────────────────────────────────────────

export interface SendOtpPayload {
  phone?: string;
  email?: string;
  otp: string;
  channel?: 'SMS' | 'EMAIL';
  fullName?: string;
}

export interface SendKycNotificationPayload {
  phone?: string;
  email?: string;
  fullName?: string;
  status: 'VERIFIED' | 'REJECTED';
  reason?: string;
}

export interface SendWelcomeNotificationPayload {
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

// ── HTML Email Templates ──────────────────────────────────────────────────────

function otpEmailTemplate(otp: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 900; color: #6366f1; letter-spacing: -0.5px;">AdhocX</h1>
              <p style="margin: 4px 0 0; font-size: 13px; color: #64748b;">Smart Logistics & On-Demand Cab Dispatch</p>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 40px 32px; text-align: center;">
              <p style="margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #f1f5f9;">Verification Code</p>
              <p style="margin: 0 0 24px; font-size: 14px; color: #94a3b8;">Enter this code to verify your identity</p>
              <div style="display: inline-block; background: #0f172a; border: 2px solid #334155; border-radius: 12px; padding: 16px 36px;">
                <span style="font-size: 40px; font-weight: 900; letter-spacing: 10px; color: #10b981; font-family: 'Courier New', monospace;">${otp}</span>
              </div>
              <p style="margin: 24px 0 0; font-size: 13px; color: #64748b;">This code expires in <strong style="color: #f59e0b;">5 minutes</strong>. Do not share it with anyone.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 28px;">
              <p style="margin: 0; font-size: 12px; color: #475569;">If you didn't request this code, please ignore this email.</p>
              <p style="margin: 8px 0 0; font-size: 11px; color: #334155;">© 2026 AdhocX Enterprise Mobility. All rights reserved.</p>
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
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 900; color: #6366f1;">AdhocX</h1>
            </td>
          </tr>
          <tr>
            <td style="background: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 40px 32px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
              <p style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #10b981;">Verification Approved!</p>
              <p style="margin: 0 0 16px; font-size: 15px; color: #cbd5e1;">Congratulations ${fullName},</p>
              <p style="margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
                Your KYC verification has been approved. You now have full access to the AdhocX platform.
                Log in to start accepting trips and earning.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 28px;">
              <p style="margin: 0; font-size: 11px; color: #334155;">© 2026 AdhocX Enterprise Mobility</p>
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
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 900; color: #6366f1;">AdhocX</h1>
            </td>
          </tr>
          <tr>
            <td style="background: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 40px 32px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
              <p style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #f59e0b;">Verification Declined</p>
              <p style="margin: 0 0 16px; font-size: 15px; color: #cbd5e1;">Hello ${fullName},</p>
              <p style="margin: 0 0 16px; font-size: 14px; color: #94a3b8; line-height: 1.6;">
                Unfortunately, your verification could not be approved at this time.
              </p>
              <div style="background: #0f172a; border-radius: 8px; padding: 16px; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; font-size: 13px; color: #fbbf24; font-weight: 600;">Reason:</p>
                <p style="margin: 4px 0 0; font-size: 14px; color: #e2e8f0;">${reason}</p>
              </div>
              <p style="margin: 20px 0 0; font-size: 13px; color: #64748b;">Please re-submit your documents in the app to try again.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 28px;">
              <p style="margin: 0; font-size: 11px; color: #334155;">© 2026 AdhocX Enterprise Mobility</p>
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
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width: 560px; width: 100%;">
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <h1 style="margin: 0; font-size: 32px; font-weight: 900; color: #6366f1;">AdhocX</h1>
            </td>
          </tr>
          <tr>
            <td style="background: #1e293b; border-radius: 16px; border: 1px solid #334155; padding: 40px 32px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">🌟</div>
              <p style="margin: 0 0 8px; font-size: 20px; font-weight: 700; color: #f1f5f9;">Welcome to AdhocX!</p>
              <p style="margin: 0 0 16px; font-size: 15px; color: #cbd5e1;">Hello ${fullName},</p>
              <p style="margin: 0; font-size: 14px; color: #94a3b8; line-height: 1.6;">
                You've successfully registered as <strong style="color: #6366f1;">${role}</strong> on AdhocX.
                Complete your profile setup and start your journey with smart logistics.
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top: 28px;">
              <p style="margin: 0; font-size: 11px; color: #334155;">© 2026 AdhocX Enterprise Mobility</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Centralized Notification Service ──────────────────────────────────────────

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter!: Transporter;
  private fromAddress!: string;

  /** RxJS subject backing the SSE event stream */
  private readonly eventBus = new Subject<RealtimeEvent>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const host = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
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

    // Verify connection at startup
    try {
      await this.transporter.verify();
      this.logger.log(`📧 SMTP connected successfully to ${host}:${port} as ${user}`);
    } catch (err: any) {
      this.logger.warn(`⚠️ SMTP connection failed (emails will be logged only): ${err.message}`);
    }
  }

  // ─── Private Email Sender ────────────────────────────────────────────────────

  private async sendEmail(to: string, subject: string, html: string): Promise<string | null> {
    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html,
      });
      this.logger.log(`📧 [EMAIL SENT] To: ${to} | Subject: "${subject}" | MessageId: ${info.messageId}`);
      return info.messageId;
    } catch (err: any) {
      this.logger.error(`❌ [EMAIL FAILED] To: ${to} | Subject: "${subject}" | Error: ${err.message}`);
      return null;
    }
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
        'Your AdhocX Verification Code',
        otpEmailTemplate(otp),
      );

      return {
        success: !!emailMessageId,
        channel: 'EMAIL',
        messageId: emailMessageId || messageId,
      };
    }

    if (phone) {
      // SMS dispatch — log for now; plug in Twilio/AWS SNS for production
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

  // ─── Push Notification ───────────────────────────────────────────────────────

  /**
   * Send a push notification to a specific device/user.
   */
  async sendPush(userId: string, title: string, body: string, _data?: Record<string, any>): Promise<void> {
    this.logger.log(
      `🔔 [PUSH NOTIFICATION] To: ${userId} | Title: "${title}" | Body: "${body}"`,
    );
  }

  // ─── KYC Status Alerts ──────────────────────────────────────────────────────

  /**
   * KYC Verification Status Alerts (Approved or Declined) — sends real email
   */
  async sendKycStatusNotification(payload: SendKycNotificationPayload): Promise<{ success: boolean }> {
    const { phone, email, fullName, status, reason } = payload;
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

    // Also log for SMS fallback / push
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
   * Welcome Notification upon Successful Registration — sends real email
   */
  async sendWelcomeNotification(payload: SendWelcomeNotificationPayload): Promise<{ success: boolean }> {
    const { phone, email, fullName, role } = payload;
    const name = fullName || 'Partner';

    if (email) {
      await this.sendEmail(email, '🌟 Welcome to AdhocX!', welcomeEmailTemplate(name, role));
    }

    const recipient = email || phone || 'Partner';
    this.logger.log(`🌟 [WELCOME] ${recipient} — ${name} as ${role}`);

    return { success: true };
  }

  // ─── Realtime Event Bus (SSE) ───────────────────────────────────────────────

  /**
   * Emit a realtime event on a named channel (e.g. `driver:abc`, `vendor:xyz`).
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
      filter((evt) => evt.channel === channel),
      map((evt) => ({ data: evt })),
    );
  }
}
