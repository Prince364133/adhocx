import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Msg91SendOtpResult {
  success: boolean;
  messageId: string;
  response?: any;
  simulated?: boolean;
  error?: string;
}

export interface Msg91FlowPayload {
  template_id: string;
  short_url?: string;
  sender?: string;
  recipients: Array<{
    mobiles: string;
    [key: string]: string | undefined;
  }>;
}

@Injectable()
export class Msg91Service {
  private readonly logger = new Logger(Msg91Service.name);

  private readonly flowUrl = 'https://control.msg91.com/api/v5/flow/';
  private readonly otpUrl = 'https://control.msg91.com/api/v5/otp';
  private readonly defaultOtpTemplateId = '6aecb09fbde8179f65068242';
  private readonly defaultSenderId = 'ADHOCX';

  constructor(private readonly configService: ConfigService) {}

  /**
   * Normalize any phone input to E.164 without leading plus (e.g. 919876543210)
   * which is the strict requirement for MSG91 recipients.
   */
  public normalizePhone(rawPhone: string): string {
    const cleaned = rawPhone.replace(/[\s\-()+]/g, '');

    // 10-digit Indian standard mobile number -> prefix with 91
    if (cleaned.length === 10 && /^[6-9]\d{9}$/.test(cleaned)) {
      return `91${cleaned}`;
    }

    // 11-digit starting with 0 (e.g. 09876543210)
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return `91${cleaned.substring(1)}`;
    }

    // Already 12 digits starting with 91 (e.g. 919876543210)
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
      return cleaned;
    }

    // Return cleaned digits for other international codes
    return cleaned;
  }

  /**
   * Get current MSG91 AuthKey from environment or config
   */
  public getAuthKey(): string {
    return (
      this.configService.get<string>('MSG91_AUTH_KEY') ||
      process.env.MSG91_AUTH_KEY ||
      this.configService.get<string>('MSG091_AUTH_KEY') ||
      process.env.MSG091_AUTH_KEY ||
      ''
    ).trim();
  }

  /**
   * Get DLT / MSG91 Approved Sender ID (e.g. ADHOCX)
   */
  public getSenderId(): string {
    return (
      this.configService.get<string>('MSG91_SENDER_ID') ||
      process.env.MSG91_SENDER_ID ||
      this.defaultSenderId
    ).trim();
  }

  /**
   * Check if MSG91 is enabled and configured with an AuthKey
   */
  public isConfigured(): boolean {
    const key = this.getAuthKey();
    const enabled =
      this.configService.get<string>('MSG91_ENABLED', 'true') !== 'false' &&
      process.env.MSG91_ENABLED !== 'false';

    return Boolean(key && key !== 'your_msg91_auth_key_here' && enabled);
  }

  /**
   * Get OTP Template ID (defaults to user's registered OTP_ADHOCX template: 6aec3196704f112ad8019976)
   */
  public getOtpTemplateId(): string {
    return (
      this.configService.get<string>('MSG91_OTP_TEMPLATE_ID') ||
      process.env.MSG91_OTP_TEMPLATE_ID ||
      this.configService.get<string>('TEMPLATE_ID') ||
      process.env.TEMPLATE_ID ||
      this.defaultOtpTemplateId
    ).trim();
  }

  /**
   * Send OTP via MSG91 Flow API.
   * Matches DLT template `OTP_ADHOCX` with variable `##num##`.
   */
  async sendOtp(rawPhone: string, otp: string): Promise<Msg91SendOtpResult> {
    const mobile = this.normalizePhone(rawPhone);
    const authKey = this.getAuthKey();
    const templateId = this.getOtpTemplateId();
    const sender = this.getSenderId();
    const isProd = process.env.NODE_ENV === 'production';

    // 1. Fallback to simulation if AuthKey is not yet configured
    if (!this.isConfigured()) {
      this.logger.warn(
        `⚠️ [MSG91 SIMULATED] AuthKey not set or MSG91 disabled. Simulating SMS dispatch to: ${mobile} | OTP: ${otp} | Template: ${templateId}`,
      );
      return {
        success: true,
        messageId: `msg91_sim_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        simulated: true,
      };
    }

    // 2. Dispatch real SMS via MSG91 Flow API
    const isTest = process.env.NODE_ENV === 'test';
    const payload: Msg91FlowPayload = {
      template_id: templateId,
      short_url: '0',
      ...(sender ? { sender } : {}),
      recipients: [
        {
          mobiles: mobile,
          num: otp, // matches template ##num##
          otp,      // fallback alias
          code: otp, // fallback alias
        },
      ],
    };

    try {
      this.logger.log(
        `📤 [MSG91 SENDING] Dispatching OTP SMS to: ${mobile} using template: ${templateId}`,
      );

      const response = await fetch(this.flowUrl, {
        method: 'POST',
        headers: {
          authkey: authKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData: any = await response.json().catch(() => null);

      // Trigger dedicated MSG91 high-priority OTP route as well to guarantee immediate cellular carrier delivery
      if (!isTest) {
        try {
          const otpEndpoint = `${this.otpUrl}?template_id=${encodeURIComponent(templateId)}&mobile=${encodeURIComponent(mobile)}&otp=${encodeURIComponent(otp)}&otp_expiry=10`;
          await fetch(otpEndpoint, {
            method: 'POST',
            headers: {
              authkey: authKey,
              'content-type': 'application/json',
              accept: 'application/json',
            },
            body: JSON.stringify({ otp, num: otp }),
          }).catch(() => null);
        } catch (_) {}
      }

      if (response.ok && responseData?.type !== 'error') {
        const messageId =
          responseData?.message ||
          `msg91_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        this.logger.log(
          `✅ [MSG91 SENT] OTP SMS delivered successfully to ${mobile} | MsgID: ${messageId}`,
        );

        return {
          success: true,
          messageId,
          response: responseData,
          simulated: false,
        };
      }

      // Handle MSG91 error response (e.g. IP whitelist rejection, unapproved template, insufficient balance)
      const errorMsg =
        responseData?.message ||
        `MSG91 HTTP ${response.status}: ${response.statusText}`;

      this.logger.error(
        `❌ [MSG91 DISPATCH FAILED] To: ${mobile} | Status: ${response.status} | Error: ${JSON.stringify(responseData || errorMsg)}`,
      );

      // In non-production or test environments, always log the OTP code to allow developer login
      if (!isProd) {
        this.logger.warn(
          `📱 [MSG91 DEV FALLBACK] Mobile: ${mobile} | Generated OTP: ${otp} (Use this code to test login)`,
        );
      }

      return {
        success: false,
        messageId: `msg91_err_${Date.now()}`,
        response: responseData,
        error: typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg),
        simulated: false,
      };
    } catch (err: any) {
      this.logger.error(
        `❌ [MSG91 EXCEPTION] Failed to connect to MSG91 API: ${err.message}`,
      );

      if (!isProd) {
        this.logger.warn(
          `📱 [MSG91 DEV FALLBACK] Mobile: ${mobile} | Generated OTP: ${otp} (Use this code to test login)`,
        );
      }

      return {
        success: false,
        messageId: `msg91_exc_${Date.now()}`,
        error: err.message,
        simulated: false,
      };
    }
  }

  /**
   * Send custom transactional flow template via MSG91
   */
  async sendFlow(
    rawPhone: string,
    templateId: string,
    variables: Record<string, string>,
  ): Promise<Msg91SendOtpResult> {
    const mobile = this.normalizePhone(rawPhone);
    const authKey = this.getAuthKey();
    const sender = this.getSenderId();

    if (!this.isConfigured()) {
      this.logger.warn(
        `⚠️ [MSG91 SIMULATED] Custom flow template ${templateId} to: ${mobile}`,
      );
      return {
        success: true,
        messageId: `msg91_flow_sim_${Date.now()}`,
        simulated: true,
      };
    }

    const payload: Msg91FlowPayload = {
      template_id: templateId,
      short_url: '0',
      ...(sender ? { sender } : {}),
      recipients: [
        {
          mobiles: mobile,
          ...variables,
        },
      ],
    };

    try {
      const response = await fetch(this.flowUrl, {
        method: 'POST',
        headers: {
          authkey: authKey,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData: any = await response.json().catch(() => null);

      if (response.ok && responseData?.type !== 'error') {
        return {
          success: true,
          messageId: responseData?.message || `msg91_${Date.now()}`,
          response: responseData,
        };
      }

      return {
        success: false,
        messageId: `msg91_err_${Date.now()}`,
        response: responseData,
        error: responseData?.message || `HTTP ${response.status}`,
      };
    } catch (err: any) {
      return {
        success: false,
        messageId: `msg91_exc_${Date.now()}`,
        error: err.message,
      };
    }
  }
}
