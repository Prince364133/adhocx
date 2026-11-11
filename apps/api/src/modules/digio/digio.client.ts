import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { DigioIdCardType } from '@adhocx/contracts';

export interface DigioFilePart {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

@Injectable()
export class DigioClient {
  private readonly logger = new Logger(DigioClient.name);

  constructor(private readonly configService: ConfigService) {}

  get env(): string {
    return this.configService.get<string>('digio.env') || 'production';
  }

  get baseUrl(): string {
    return (
      this.configService.get<string>('digio.baseUrl') || 'https://api.digio.in'
    ).replace(/\/+$/, '');
  }

  get gatewayUrl(): string {
    return (
      this.configService.get<string>('digio.gatewayUrl') ||
      'https://app.digio.in'
    ).replace(/\/+$/, '');
  }

  get digilockerTemplateName(): string {
    return (
      this.configService.get<string>('digio.digilockerTemplateName') ||
      'DIGILOCKER_AADHAAR_PAN'
    );
  }

  get allowedWebhookIps(): string[] {
    return (
      this.configService.get<string[]>('digio.allowedWebhookIps') || [
        '13.126.198.236',
        '52.66.66.81',
      ]
    );
  }

  get hasWebhookSecret(): boolean {
    return Boolean(this.configService.get<string>('digio.webhookSecret'));
  }

  isConfigured(): boolean {
    const clientId = this.configService.get<string>('digio.clientId');
    const clientSecret = this.configService.get<string>('digio.clientSecret');
    return Boolean(clientId && clientSecret);
  }

  generateUniqueRequestId(prefix = 'ADHOCX'): string {
    const cleanPrefix = prefix.replace(/[^A-Za-z0-9_]/g, '').slice(0, 12) || 'ADHOCX';
    return `${cleanPrefix}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  private getAuthHeader(): string {
    const clientId = this.configService.get<string>('digio.clientId') || '';
    const clientSecret =
      this.configService.get<string>('digio.clientSecret') || '';
    if (!clientId || !clientSecret) {
      throw new ServiceUnavailableException(
        'DigiLocker / Govt KYC verification service is not configured on this server',
      );
    }
    return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
  }

  private get timeoutMs(): number {
    return this.configService.get<number>('digio.timeoutMs') || 30000;
  }

  verifyWebhookChecksum(
    rawBody: Buffer | string | undefined,
    checksumHeader?: string,
  ): boolean {
    const secret = this.configService.get<string>('digio.webhookSecret') || '';
    if (!secret || !rawBody || !checksumHeader) return false;

    const payload = Buffer.isBuffer(rawBody)
      ? rawBody
      : Buffer.from(rawBody, 'utf8');
    const expectedHex = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    const provided = checksumHeader.trim();
    const expectedBuf = Buffer.from(expectedHex, 'utf8');
    const providedLowerBuf = Buffer.from(provided.toLowerCase(), 'utf8');
    if (expectedBuf.length === providedLowerBuf.length) {
      return crypto.timingSafeEqual(expectedBuf, providedLowerBuf);
    }

    const expectedB64 = Buffer.from(
      crypto.createHmac('sha256', secret).update(payload).digest('base64'),
      'utf8',
    );
    const providedBuf = Buffer.from(provided, 'utf8');
    return (
      expectedB64.length === providedBuf.length &&
      crypto.timingSafeEqual(expectedB64, providedBuf)
    );
  }

  private extractErrorMessage(parsed: unknown, status: number): string {
    if (typeof parsed === 'string' && parsed.trim()) return parsed.trim();
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, any>;
      const errObj = obj.error && typeof obj.error === 'object' ? obj.error : undefined;
      const candidates = [
        obj.message,
        obj.error_description,
        errObj?.error_message,
        errObj?.message,
        typeof obj.error === 'string' ? obj.error : undefined,
        typeof obj.details === 'string' ? obj.details : undefined,
        obj.code,
      ];
      for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
          return candidate.trim();
        }
      }
      try {
        const serialized = JSON.stringify(parsed);
        if (serialized && serialized !== '{}') return serialized.slice(0, 300);
      } catch (_) {}
    }
    return `KYC verification service HTTP ${status}`;
  }

  private extractErrorCode(parsed: unknown): string | undefined {
    if (!parsed || typeof parsed !== 'object') return undefined;
    const obj = parsed as Record<string, any>;
    const code = obj.code ?? obj.error?.code ?? obj.error?.status;
    return typeof code === 'string' && code.trim() ? code.trim() : undefined;
  }

  private async executeRequest<T = any>(
    endpointPath: string,
    init: RequestInit,
  ): Promise<T> {
    const authHeader = this.getAuthHeader();
    const url = `${this.baseUrl}${endpointPath.startsWith('/') ? endpointPath : `/${endpointPath}`}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        headers: {
          Authorization: authHeader,
          ...(init.headers || {}),
        },
        signal: controller.signal,
      });

      const contentType = response.headers.get('content-type') || '';
      const rawText = await response.text();
      let parsed: any = rawText;

      if (contentType.includes('application/json') || rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
        try {
          parsed = JSON.parse(rawText);
        } catch {
          parsed = rawText;
        }
      }

      if (!response.ok) {
        const message = this.extractErrorMessage(parsed, response.status);
        const digioCode = this.extractErrorCode(parsed);
        this.logger.warn(
          `Digio call ${endpointPath} failed (${response.status}): ${message}`,
        );

        if (response.status >= 400 && response.status < 500 && response.status !== 401 && response.status !== 403) {
          throw new BadRequestException({
            message,
            digioCode,
            digioStatus: response.status,
          });
        }
        throw new BadGatewayException({
          message: `KYC verification error (${response.status}): ${message}`,
          digioCode,
        });
      }

      return parsed as T;
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new BadGatewayException('Verification service request timed out');
      }
      if (
        err instanceof BadRequestException ||
        err instanceof BadGatewayException ||
        err instanceof ServiceUnavailableException
      ) {
        throw err;
      }
      this.logger.error(
        `Digio network error on ${endpointPath}: ${err?.message || String(err)}`,
      );
      throw new BadGatewayException(
        `Unable to reach verification service: ${err?.message || 'Network error'}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private postJson<T = any>(
    endpointPath: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    return this.executeRequest<T>(endpointPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  private getBinaryOrJson(
    endpointPath: string,
  ): Promise<{ contentType: string; data: any; buffer?: Buffer }> {
    const authHeader = this.getAuthHeader();
    const url = `${this.baseUrl}${endpointPath}`;
    return fetch(url, {
      method: 'GET',
      headers: { Authorization: authHeader },
      signal: AbortSignal.timeout(this.timeoutMs),
    }).then(async (res) => {
      const contentType = res.headers.get('content-type') || 'application/octet-stream';
      const arr = await res.arrayBuffer();
      const buffer = Buffer.from(arr);
      if (!res.ok) {
        throw new BadGatewayException(
          `KYC verification media fetch failed (${res.status}): ${buffer.toString('utf8').slice(0, 200)}`,
        );
      }
      if (contentType.includes('application/json')) {
        return {
          contentType,
          data: JSON.parse(buffer.toString('utf8')),
        };
      }
      return { contentType, data: null, buffer };
    });
  }

  private postMultipart<T = any>(
    endpointPath: string,
    form: FormData,
  ): Promise<T> {
    return this.executeRequest<T>(endpointPath, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: form,
    });
  }

  private toBlob(part: DigioFilePart): Blob {
    return new Blob([new Uint8Array(part.buffer)], {
      type: part.mimeType || 'image/jpeg',
    });
  }

  // ---------------------------------------------------------------------------
  // 1. Govt ID & Business Data Verification (/v3/client/kyc/fetch_id_data/*)
  // ---------------------------------------------------------------------------

  async fetchIdData<T = any>(
    idCardType: DigioIdCardType,
    payload: {
      id_no: string;
      name?: string;
      dob?: string;
      file_no?: string;
      unique_request_id?: string;
      is_advanced?: boolean;
      listing_type?: 'LIST_ONLY' | 'BASIC';
    },
  ): Promise<T> {
    return this.postJson<T>(`/v3/client/kyc/fetch_id_data/${idCardType}`, {
      ...payload,
      unique_request_id:
        payload.unique_request_id || this.generateUniqueRequestId(idCardType),
    });
  }

  async getKraPanStatus(payload: {
    pan_no: string;
    dob?: string;
    fetch_type?: 'I' | 'E' | 'B';
    mobile?: string;
    unique_request_id?: string;
  }) {
    return this.postJson('/v3/client/kyc/kra/v2/get_pan_status', {
      ...payload,
      unique_request_id:
        payload.unique_request_id || this.generateUniqueRequestId('KRA'),
    });
  }

  // ---------------------------------------------------------------------------
  // 2. Vehicle RC Verification (/client/v4/apis/verify/vehicle_rc)
  // ---------------------------------------------------------------------------

  async verifyVehicleRc(payload: { id: string; unique_request_id?: string }) {
    return this.postJson('/client/v4/apis/verify/vehicle_rc', {
      id: payload.id,
      unique_request_id:
        payload.unique_request_id || this.generateUniqueRequestId('RC'),
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Document AI OCR + Verification + Aadhaar Masking
  // ---------------------------------------------------------------------------

  async analyzeIdCard(params: {
    front: DigioFilePart;
    back?: DigioFilePart;
    expectedIds?: string[];
    features?: string[];
    additionalChecks?: string[];
    uniqueRequestId?: string;
  }) {
    const form = new FormData();
    form.append('front_part', this.toBlob(params.front), params.front.filename || 'front.jpg');
    const backPart = params.back || params.front;
    form.append('back_part', this.toBlob(backPart), backPart.filename || 'back.jpg');
    form.append(
      'unique_request_id',
      params.uniqueRequestId || this.generateUniqueRequestId('OCR'),
    );

    const additionalReq: Record<string, unknown> = {
      features: params.features?.length
        ? params.features
        : ['MASK', 'CROP_ALIGN', 'VERIFY', 'FACE_EXTRACT'],
      expected_ids: params.expectedIds?.length
        ? params.expectedIds
        : ['AADHAAR', 'PAN', 'DRIVING_LICENCE', 'VOTER_ID', 'PASSPORT', 'RC'],
      additional_checks: params.additionalChecks?.length
        ? params.additionalChecks
        : ['BLUR_IMAGE', 'BLACK_AND_WHITE_IMAGE'],
    };
    form.append('additional_request', JSON.stringify(additionalReq));

    return this.postMultipart('/v4/client/kyc/analyze/file/idcard', form);
  }

  async maskAadhaarFile(params: {
    file: DigioFilePart;
    uniqueRequestId?: string;
  }) {
    const form = new FormData();
    form.append(
      'file',
      this.toBlob(params.file),
      params.file.filename || 'aadhaar.jpg',
    );
    form.append('consent', 'yes');
    form.append('file_name', params.file.filename || 'aadhaar.jpg');
    form.append(
      'unique_request_id',
      params.uniqueRequestId || this.generateUniqueRequestId('MASK'),
    );

    return this.postMultipart('/v4/client/kyc/aadhaar/file/mask', form);
  }

  // ---------------------------------------------------------------------------
  // 4. Biometrics: Face Match & Selfie Liveness
  // ---------------------------------------------------------------------------

  async faceMatch(params: {
    file1: DigioFilePart;
    file2: DigioFilePart;
    minimumMatch?: number;
    uniqueRequestId?: string;
  }) {
    const form = new FormData();
    form.append('file1', this.toBlob(params.file1), params.file1.filename || 'selfie.jpg');
    form.append('file2', this.toBlob(params.file2), params.file2.filename || 'id_photo.jpg');
    if (params.minimumMatch !== undefined) {
      form.append('minimum_match', String(params.minimumMatch));
    }
    form.append(
      'unique_request_id',
      params.uniqueRequestId || this.generateUniqueRequestId('FACE'),
    );

    return this.postMultipart('/v3/client/kyc/facematch', form);
  }

  async checkLiveness(params: {
    image: DigioFilePart;
    uniqueRequestId?: string;
  }) {
    const form = new FormData();
    form.append(
      'image',
      this.toBlob(params.image),
      params.image.filename || 'selfie.jpg',
    );
    form.append(
      'unique_request_id',
      params.uniqueRequestId || this.generateUniqueRequestId('LIVE'),
    );

    return this.postMultipart('/v3/client/kyc/analyze/file/liveness', form);
  }

  // ---------------------------------------------------------------------------
  // 5. Banking & UPI Verification
  // ---------------------------------------------------------------------------

  async verifyIfsc(ifsc: string) {
    return this.postJson('/v3/client/kyc/verify/IFSC', {
      identifier: ifsc.trim().toUpperCase(),
    });
  }

  async verifyBankAccount(payload: {
    beneficiary_account_no: string;
    beneficiary_ifsc: string;
    beneficiary_name?: string;
    validation_mode?: 'PENNY_LESS' | 'PENNY_DROP' | 'AUTO';
    amount?: number;
    narration?: string;
    unique_request_id?: string;
  }) {
    return this.postJson('/v4/client/verify/bank_account', {
      ...payload,
      beneficiary_ifsc: payload.beneficiary_ifsc.trim().toUpperCase(),
      validation_mode: payload.validation_mode || 'PENNY_LESS',
      unique_request_id:
        payload.unique_request_id || this.generateUniqueRequestId('BANK'),
    });
  }

  async checkUpiVpa(payload: {
    virtual_address: string;
    name?: string;
    reference_id?: string;
    unique_request_id?: string;
  }) {
    return this.postJson('/v3/client/public/upi/check_vpa', {
      ...payload,
      unique_request_id:
        payload.unique_request_id || this.generateUniqueRequestId('UPI'),
    });
  }

  async searchUpiVpa(payload: {
    handlePrefix: string;
    referenceId?: string;
    uniqueRequestId?: string;
  }) {
    return this.postJson('/v3/client/public/upi/search_vpa', {
      handlePrefix: payload.handlePrefix,
      referenceId: payload.referenceId,
      uniqueRequestId:
        payload.uniqueRequestId || this.generateUniqueRequestId('UPIS'),
    });
  }

  // ---------------------------------------------------------------------------
  // 6. Fuzzy Match & UAN Employment Check
  // ---------------------------------------------------------------------------

  async fuzzyMatch(payload: {
    source: { text: string };
    target: { text: string };
    context: 'name' | 'address';
    confidence?: number;
    unique_request_id?: string;
  }) {
    return this.postJson('/v3/client/kyc/fuzzy_match', {
      ...payload,
      unique_request_id:
        payload.unique_request_id || this.generateUniqueRequestId('FUZZY'),
    });
  }

  async verifyUan(payload: {
    type: 'UAN' | 'MOBILE';
    identifier: string;
    uan_history?: 'YES' | 'NO';
    unique_request_id?: string;
  }) {
    return this.postJson('/client/v4/apis/verify/uan', {
      ...payload,
      unique_request_id:
        payload.unique_request_id || this.generateUniqueRequestId('UAN'),
    });
  }

  // ---------------------------------------------------------------------------
  // 7. DigiLocker / Guided KYC Template Workflow (/client/kyc/v2/*)
  // ---------------------------------------------------------------------------

  async createKycRequestWithTemplate(payload: {
    customer_identifier: string;
    customer_name?: string;
    template_name?: string;
    generate_access_token?: boolean;
    notify_customer?: boolean;
    reference_id?: string;
    transaction_id?: string;
    preset_values?: Record<string, unknown>;
  }) {
    return this.postJson('/client/kyc/v2/request/with_template', {
      customer_identifier: payload.customer_identifier,
      customer_name: payload.customer_name,
      template_name: payload.template_name || this.digilockerTemplateName,
      generate_access_token: payload.generate_access_token ?? true,
      notify_customer: payload.notify_customer ?? false,
      reference_id: payload.reference_id,
      transaction_id:
        payload.transaction_id || this.generateUniqueRequestId('DLKR'),
      ...(payload.preset_values ? { preset_values: payload.preset_values } : {}),
    });
  }

  async getKycRequestResponse(digioRequestId: string) {
    return this.postJson(
      `/client/kyc/v2/${encodeURIComponent(digioRequestId)}/response?detail_response=true`,
      {},
    );
  }

  async downloadKycMedia(fileId: string, docType?: string) {
    const qs = docType ? `?doc_type=${encodeURIComponent(docType)}` : '';
    return this.getBinaryOrJson(
      `/client/kyc/v2/media/${encodeURIComponent(fileId)}${qs}`,
    );
  }

  async manageKycApproval(
    digioRequestId: string,
    status: 'approved' | 'rejected',
    reason?: string,
  ) {
    return this.postJson(
      `/client/kyc/v2/request/${encodeURIComponent(digioRequestId)}/manage_approval`,
      {
        status,
        ...(reason ? { reason } : {}),
      },
    );
  }

  async reattemptKycRequest(digioRequestId: string) {
    return this.postJson(
      `/client/kyc/v2/request/${encodeURIComponent(digioRequestId)}/reattempt`,
      {},
    );
  }

  buildGatewayUrl(params: {
    requestId: string;
    transactionId: string;
    customerIdentifier: string;
    tokenId: string;
    redirectUrl?: string;
  }): string {
    const base = `${this.gatewayUrl}/#/gateway/login/${encodeURIComponent(
      params.requestId,
    )}/${encodeURIComponent(params.transactionId)}/${encodeURIComponent(
      params.customerIdentifier,
    )}`;
    const qs = new URLSearchParams({ token_id: params.tokenId });
    if (params.redirectUrl) {
      qs.set('redirect_url', params.redirectUrl);
    }
    return `${base}?${qs.toString()}`;
  }
}

