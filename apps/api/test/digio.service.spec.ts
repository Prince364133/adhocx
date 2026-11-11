import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import { AuthUserDto, UserRole } from '@adhocx/contracts';
import { DigioClient } from '../src/modules/digio/digio.client';
import { DigioService } from '../src/modules/digio/digio.service';
import { DatabaseService } from '../src/database/database.service';
import { StorageService } from '../src/common/storage/storage.service';

describe('DigioClient & DigioService', () => {
  let digioClient: DigioClient;
  let digioService: DigioService;
  let dbMock: any;
  let storageMock: any;

  const driverActor: AuthUserDto = {
    id: 'user-drv-1',
    phone: '+919876543210',
    fullName: 'Ramesh Kumar',
    role: UserRole.DRIVER,
  } as AuthUserDto;

  const vendorActor: AuthUserDto = {
    id: 'user-vnd-1',
    phone: '+919988776655',
    fullName: 'Acme Logistics',
    role: UserRole.VENDOR,
  } as AuthUserDto;

  const adminActor: AuthUserDto = {
    id: 'user-adm-1',
    phone: '+919000000001',
    fullName: 'Super Admin',
    role: UserRole.ADMIN,
  } as AuthUserDto;

  const webhookSecret = 'digio-test-webhook-secret-2026';

  beforeEach(async () => {
    dbMock = {
      digioVerification: {
        create: jest.fn(async ({ data }: any) => ({
          id: `dv_${Math.random().toString(36).slice(2, 10)}`,
          ...data,
          createdAt: new Date('2026-11-10T08:00:00Z'),
          updatedAt: new Date('2026-11-10T08:00:00Z'),
        })),
        findUnique: jest.fn(),
        findMany: jest.fn(async () => []),
        // Unit scope: the driver has a recorded Aadhaar consent; no earlier result to reuse.
        // (Consent enforcement and reuse are covered by digio-contract.spec.ts.)
        findFirst: jest.fn(async ({ where }: any) =>
          where?.verificationType === 'AADHAAR_CONSENT'
            ? { id: 'consent-1', verificationType: 'AADHAAR_CONSENT', verified: true, summary: { textVersion: 'AADHAAR_CONSENT_V1' }, createdAt: new Date() }
            : null,
        ),
        update: jest.fn(async ({ where, data }: any) => ({
          id: where.id || 'dv_updated',
          verificationType: 'DIGILOCKER',
          category: 'DIGILOCKER',
          uniqueRequestId: 'DLKR_123',
          digioRequestId: 'KID_TEST_1',
          ...data,
          createdAt: new Date('2026-11-10T08:00:00Z'),
          updatedAt: new Date('2026-11-10T08:05:00Z'),
        })),
      },
      driver: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.userId === driverActor.id || where.id === 'drv-1') {
            return {
              id: 'drv-1',
              userId: driverActor.id,
              fullName: 'Ramesh Kumar',
              vehiclePlate: 'TS09AB1234',
              dlFrontUrl: '/uploads/dl-front.jpg',
              aadharFrontUrl: '/uploads/aadhaar-front.jpg',
              kycDocuments: { profilePhotoUrl: '/uploads/selfie.jpg' },
            };
          }
          return null;
        }),
        update: jest.fn(async ({ data }: any) => data),
      },
      vendor: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.userId === vendorActor.id || where.id === 'vnd-1') {
            return {
              id: 'vnd-1',
              userId: vendorActor.id,
              organizationName: 'Acme Logistics',
              kycDocuments: {},
            };
          }
          return null;
        }),
        update: jest.fn(async ({ data }: any) => data),
      },
      vehicle: {
        findFirst: jest.fn(async () => ({ id: 'veh-1' })),
        findUnique: jest.fn(async () => ({ driverId: 'drv-1' })),
        update: jest.fn(async ({ data }: any) => data),
      },
      user: {
        findUnique: jest.fn(async () => ({
          phone: '+919876543210',
          email: 'ramesh@example.com',
          fullName: 'Ramesh Kumar',
        })),
      },
    };

    storageMock = {
      getFileBuffer: jest.fn(async (url: string) => ({
        buffer: Buffer.from(`bytes-of-${url}`),
        mimeType: 'image/jpeg',
        filename: 'doc.jpg',
      })),
      saveFile: jest.fn(async () => ({
        url: '/uploads/masked-aadhaar.jpg',
        filename: 'masked-aadhaar.jpg',
      })),
    };

    const configMock = {
      get: jest.fn((key: string) => {
        const map: Record<string, any> = {
          'digio.env': 'production',
          'digio.baseUrl': 'https://api.digio.in',
          'digio.gatewayUrl': 'https://app.digio.in',
          'digio.clientId': 'ACK_TEST_CLIENT',
          'digio.clientSecret': 'TEST_SECRET_VALUE',
          'digio.webhookSecret': webhookSecret,
          'digio.digilockerTemplateName': 'DIGILOCKER_AADHAAR_PAN',
          'digio.timeoutMs': 10000,
          'digio.allowedWebhookIps': ['13.126.198.236', '52.66.66.81'],
        };
        return map[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DigioClient,
        DigioService,
        { provide: ConfigService, useValue: configMock },
        { provide: DatabaseService, useValue: dbMock },
        { provide: StorageService, useValue: storageMock },
      ],
    }).compile();

    digioClient = module.get(DigioClient);
    digioService = module.get(DigioService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('verifies X-Digio-Checksum HMAC-SHA256 signatures accurately', () => {
    const body = JSON.stringify({ event: 'kyc.request.approved', id: 'KID123' });
    const validHex = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    expect(digioClient.verifyWebhookChecksum(body, validHex)).toBe(true);
    expect(digioClient.verifyWebhookChecksum(body, 'bad-signature')).toBe(false);
    expect(digioClient.verifyWebhookChecksum(undefined, validHex)).toBe(false);
  });

  it('builds proper Digio Gateway redirect URL', () => {
    const url = digioClient.buildGatewayUrl({
      requestId: 'KID2611',
      transactionId: 'DLKR_99',
      customerIdentifier: '+919876543210',
      tokenId: 'GWT2611',
      redirectUrl: 'https://adhocx.com/kyc-done',
    });
    expect(url).toContain('https://app.digio.in/#/gateway/login/KID2611/DLKR_99/%2B919876543210');
    expect(url).toContain('token_id=GWT2611');
    expect(url).toContain('redirect_url=https%3A%2F%2Fadhocx.com%2Fkyc-done');
  });

  it('verifies PAN and syncs driver metadata without leaking raw Aadhaar digits', async () => {
    jest.spyOn(digioClient, 'fetchIdData').mockResolvedValue({
      status: 'VALID',
      name: 'RAMESH KUMAR',
      category: 'Individual',
      aadhaar_seeding_status: 'Y',
      note_with_accidental_aadhaar: '1234 5678 9012',
    });

    const result = await digioService.verifyPan(driverActor, {
      panNumber: 'abcde1234f',
      name: 'Ramesh Kumar',
    });

    expect(result.verified).toBe(true);
    expect(result.identifier).toBe('ABCDE1234F');
    expect(result.verifiedName).toBe('RAMESH KUMAR');
    const savedCall = dbMock.digioVerification.create.mock.calls[0][0].data;
    expect(JSON.stringify(savedCall.rawResponse)).not.toContain('1234 5678 9012');
    expect(JSON.stringify(savedCall.rawResponse)).toContain('XXXX-XXXX-9012');
    expect(dbMock.driver.update).toHaveBeenCalled();
  });

  it('normalizes DL DOB to dd/mm/yyyy and detects expired DL', async () => {
    const fetchSpy = jest
      .spyOn(digioClient, 'fetchIdData')
      .mockResolvedValueOnce({
        "Holder's Name": 'RAMESH KUMAR',
        'Current Status': 'ACTIVE',
        Transport: { From: '01/01/2020', To: '31/12/2032' },
        'Non-Transport': { From: '01/01/2018', To: '31/12/2038' },
      })
      .mockResolvedValueOnce({
        "Holder's Name": 'RAMESH KUMAR',
        'Current Status': 'EXPIRED',
        Transport: { From: '01/01/2015', To: '01/01/2020' },
      });

    const validRes = await digioService.verifyDrivingLicense(driverActor, {
      dlNumber: 'TS09 20200012345',
      dob: '1992-05-14',
    });
    expect(fetchSpy).toHaveBeenCalledWith(
      'DRIVING_LICENSE',
      expect.objectContaining({
        id_no: 'TS0920200012345',
        dob: '14/05/1992',
      }),
    );
    expect(validRes.verified).toBe(true);
    expect(validRes.complianceOk).toBe(true);
    expect(validRes.status).toBe('VERIFIED');

    const expiredRes = await digioService.verifyDrivingLicense(driverActor, {
      dlNumber: 'TS09201500001',
      dob: '1992-05-14',
    });
    expect(expiredRes.complianceOk).toBe(false);
    expect(expiredRes.status).toBe('PARTIAL');
    expect(expiredRes.complianceNotes).toContain('EXPIRED');
  });

  it('calls verifyVehicleRc using `id` field and evaluates compliance & blacklist', async () => {
    const rcSpy = jest.spyOn(digioClient, 'verifyVehicleRc').mockResolvedValue({
      user_details: { owner_name: 'RAMESH KUMAR' },
      vehicle_details: {
        rc_number: 'TS09AB1234',
        rc_status: 'ACTIVE',
        vehicle_category: 'LMV',
        maker_description: 'MARUTI SUZUKI',
        maker_model: 'DZIRE TOUR S',
        fit_up_to: '2030-12-31',
      },
      finance_details: {
        insurance_company: 'HDFC ERGO',
        insurance_upto: '2029-05-01',
      },
      permit_details: {
        permit_type: 'ALL INDIA TOURIST',
        permit_valid_upto: '2029-06-01',
        blacklist_status: 'NA',
        pucc_upto: '2028-01-01',
      },
    });

    const result = await digioService.verifyVehicleRc(driverActor, {
      registrationNumber: 'ts-09-ab-1234',
    });

    expect(rcSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'TS09AB1234' }),
    );
    expect(result.verified).toBe(true);
    expect(result.complianceOk).toBe(true);
    expect(result.summary?.makerModel).toBe('MARUTI SUZUKI DZIRE TOUR S');
    expect(dbMock.vehicle.update).toHaveBeenCalled();
  });

  it('verifies bank account via Penny-Less & masks account number in storage', async () => {
    jest.spyOn(digioClient, 'verifyBankAccount').mockResolvedValue({
      verified: true,
      beneficiary_name_with_bank: 'RAMESH KUMAR',
      fuzzy_match_score: 98,
      validation_mode: 'PENNY_LESS',
    });
    jest.spyOn(digioClient, 'verifyIfsc').mockResolvedValue({
      verified: true,
      data: { ifsc: 'SBIN0000300', bank: 'State Bank of India' },
    });

    const result = await digioService.verifyBankAccount(driverActor, {
      accountNumber: '12345678901234',
      ifsc: 'sbin0000300',
      accountHolderName: 'Ramesh Kumar',
      saveToDriverProfile: true,
    });

    expect(result.verified).toBe(true);
    expect(result.identifier).toBe('XXXXXXXXXX1234@SBIN0000300');
    expect(result.matchScore).toBe(98);
    expect(dbMock.driver.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          kycDocuments: expect.objectContaining({
            bankIfsc: 'SBIN0000300',
            bankName: 'State Bank of India',
            bankVerified: true,
          }),
        }),
      }),
    );
  });

  it('runs biometric Face Match and Selfie Liveness using stored driver documents', async () => {
    jest.spyOn(digioClient, 'faceMatch').mockResolvedValue({
      confidence: 89.4,
      result: 'MATCHED',
    });
    jest.spyOn(digioClient, 'checkLiveness').mockResolvedValue({
      score: 0.96,
      result: 'PASS',
    });

    const faceRes = await digioService.faceMatchStored(driverActor, {});
    const liveRes = await digioService.checkStoredLiveness(driverActor, {});

    expect(faceRes.verified).toBe(true);
    expect(faceRes.matchScore).toBe(89.4);
    expect(liveRes.verified).toBe(true);
    expect(liveRes.complianceOk).toBe(true);
  });

  it('analyzes stored Aadhaar OCR and persists masked copy via StorageService', async () => {
    jest.spyOn(digioClient, 'analyzeIdCard').mockResolvedValue({
      details: { status: 'SUCCESS' },
      detections: [
        {
          id_type: 'AADHAAR',
          detected_part: 'FRONT',
          id_attributes: {
            name: 'RAMESH KUMAR',
            id_no: '998877665544',
            dob: '14/05/1992',
          },
          output_images: {
            front_part: Buffer.from('masked-aadhaar-jpeg-binary-payload-data-for-unit-test').toString('base64'),
          },
          front_image_checks_result: { blur: false, black_and_white: false },
          verification_result: { verified: true },
        },
      ],
    });

    const ocrRes = await digioService.analyzeStoredIdCard(driverActor, {
      frontDocUrl: '/uploads/aadhaar-front.jpg',
      saveMaskedToDriver: true,
      aadhaarSide: 'FRONT',
    });

    expect(ocrRes.verified).toBe(true);
    expect(ocrRes.identifier).toBe('XXXX-XXXX-5544');
    expect(storageMock.saveFile).toHaveBeenCalled();
    expect(dbMock.driver.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { aadharFrontUrl: '/uploads/masked-aadhaar.jpg' },
      }),
    );
  });

  it('verifies GSTIN for vendor KYB and updates Vendor profile', async () => {
    jest.spyOn(digioClient, 'fetchIdData').mockResolvedValue({
      lgnm: 'ACME LOGISTICS PRIVATE LIMITED',
      tradeNam: 'ACME LOGISTICS',
      sts: 'Active',
      ctb: 'Private Limited Company',
    });

    const gstRes = await digioService.verifyGst(vendorActor, {
      gstin: '36aabcu9603r1zm',
      saveToVendorProfile: true,
    });

    expect(gstRes.verified).toBe(true);
    expect(gstRes.complianceOk).toBe(true);
    expect(gstRes.identifier).toBe('36AABCU9603R1ZM');
    expect(dbMock.vendor.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'vnd-1' },
        data: { gstNumber: '36AABCU9603R1ZM', organizationName: 'ACME LOGISTICS' },
      }),
    );
  });

  it('initiates DigiLocker KYC Gateway request and syncs completion on webhook', async () => {
    jest.spyOn(digioClient, 'createKycRequestWithTemplate').mockResolvedValue({
      id: 'KID_TEST_1',
      status: 'requested',
      access_token: { id: 'GWT_TOKEN_1', valid_till: '2026-11-11T00:00:00Z' },
    });

    const session = await digioService.createDigilockerSession(driverActor, {
      redirectUrl: 'https://adhocx.com/kyc-return',
    });
    expect(session.digioRequestId).toBe('KID_TEST_1');
    expect(session.accessToken).toBe('GWT_TOKEN_1');
    expect(session.gatewayUrl).toContain('KID_TEST_1');

    dbMock.digioVerification.findUnique.mockResolvedValue({
      id: 'dv_1',
      digioRequestId: 'KID_TEST_1',
      userId: driverActor.id,
      driverId: 'drv-1',
      summary: {},
    });
    jest.spyOn(digioClient, 'getKycRequestResponse').mockResolvedValue({
      id: 'KID_TEST_1',
      status: 'approved',
      actions: [
        {
          type: 'digilocker',
          status: 'approved',
          details: {
            aadhaar: { name: 'RAMESH KUMAR', id_number: '112233445566' },
            pan: { id_number: 'ABCDE1234F', name: 'RAMESH KUMAR' },
          },
        },
      ],
    });

    const rawBody = JSON.stringify({
      event: 'kyc.request.approved',
      payload: { kyc_request: { id: 'KID_TEST_1' } },
    });
    const checksum = crypto
      .createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    await expect(
      digioService.handleWebhook({
        rawBody,
        checksumHeader: 'wrong',
        payload: JSON.parse(rawBody),
      }),
    ).rejects.toThrow(UnauthorizedException);

    const whRes = await digioService.handleWebhook({
      rawBody,
      checksumHeader: checksum,
      payload: JSON.parse(rawBody),
    });
    expect(whRes.acknowledged).toBe(true);
    expect((whRes as any).queued).toBe(true);
    // The webhook only acknowledges; the authoritative state is pulled from Digio in the background.
    const synced: any = await digioService.reconcileWebhookRequest('KID_TEST_1');
    expect(synced?.verified).toBe(true);
    expect((synced?.summary as any)?.maskedAadhaar).toBe('XXXX-XXXX-5566');
  });

  it('prevents non-admin from targeting another driverId', async () => {
    await expect(
      digioService.verifyPan(driverActor, {
        panNumber: 'ABCDE1234F',
        targetDriverId: 'other-driver-id',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows admin to run full 1-click verification suite for a driver', async () => {
    jest.spyOn(digioClient, 'analyzeIdCard').mockResolvedValue({
      details: { status: 'SUCCESS' },
      detections: [
        {
          id_type: 'AADHAAR',
          id_attributes: { name: 'RAMESH KUMAR', id_no: '998877665544' },
          output_images: {},
          verification_result: { verified: true },
        },
      ],
    });
    jest.spyOn(digioClient, 'verifyVehicleRc').mockResolvedValue({
      user_details: { owner_name: 'RAMESH KUMAR' },
      vehicle_details: { rc_number: 'TS09AB1234', rc_status: 'ACTIVE' },
      finance_details: {},
      permit_details: { blacklist_status: 'NA' },
    });
    jest.spyOn(digioClient, 'checkLiveness').mockResolvedValue({ score: 0.9, result: 'PASS' });
    jest.spyOn(digioClient, 'faceMatch').mockResolvedValue({ confidence: 91, result: 'MATCHED' });
    jest.spyOn(digioClient, 'fuzzyMatch').mockResolvedValue({ matched: true, match_score: 97 });

    const suite = await digioService.runAdminDriverSuite(adminActor, 'drv-1', {
      includePan: false,
      includeDl: false,
      includeBank: false,
    });

    expect(suite.driverId).toBe('drv-1');
    expect(suite.executedChecks).toEqual(
      expect.arrayContaining([
        'AADHAAR_OCR_AND_MASK',
        'VEHICLE_RC',
        'LIVENESS',
        'FACE_MATCH',
        'FUZZY_MATCH',
      ]),
    );
    expect(suite.errors).toEqual({});
    expect(Array.isArray(suite.complianceAlerts)).toBe(true);
  });

  it('downloads DigiLocker media files and attaches URLs to driver profile', async () => {
    dbMock.digioVerification.findUnique.mockResolvedValue({
      id: 'dv_media_1',
      digioRequestId: 'KID_MEDIA_1',
      userId: driverActor.id,
      driverId: 'drv-1',
    });
    jest.spyOn(digioClient, 'getKycRequestResponse').mockResolvedValue({
      id: 'KID_MEDIA_1',
      status: 'approved',
      actions: [
        {
          type: 'digilocker',
          status: 'approved',
          details: {
            aadhaar: { file_id: 'file_aadhaar_1' },
            driving_licence: { file_id: 'file_dl_1' },
          },
        },
      ],
    });
    jest.spyOn(digioClient, 'downloadKycMedia').mockResolvedValue({
      contentType: 'application/pdf',
      data: null,
      buffer: Buffer.from('%PDF-1.4 mock document'),
    });

    const synced = await digioService.syncDigilockerMedia(driverActor, 'KID_MEDIA_1');
    expect(synced.attachedCount).toBe(2);
    expect(storageMock.saveFile).toHaveBeenCalledTimes(2);
    expect(dbMock.driver.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'drv-1' },
        data: expect.objectContaining({
          aadharFrontUrl: '/uploads/masked-aadhaar.jpg',
          dlFrontUrl: '/uploads/masked-aadhaar.jpg',
        }),
      }),
    );
  });

  it('extracts modelYear, make, model, color, and insuranceActive in Parivahan RC lookup', async () => {
    jest.spyOn(digioClient, 'verifyVehicleRc').mockResolvedValue({
      user_details: { owner_name: 'RAMESH KUMAR' },
      vehicle_details: {
        rc_number: 'TS07FX4667',
        rc_status: 'ACTIVE',
        vehicle_category: 'LMV',
        maker_description: 'HYUNDAI MOTOR INDIA LTD',
        maker_model: 'I20 SPORTZ',
        manufacturing_date_formatted: '2023-04',
        color: 'TITAN GREY',
        fit_up_to: '2038-05-01',
      },
      finance_details: {
        insurance_company: 'ICICI LOMBARD',
        insurance_policy_number: 'POL-HY-998877',
        insurance_upto: '2029-12-31',
      },
      permit_details: { blacklist_status: 'NA' },
    });

    const res = await digioService.verifyVehicleRc(driverActor, {
      registrationNumber: 'TS07FX4667',
    });

    expect(res.verified).toBe(true);
    expect(res.summary?.modelYear).toBe('2023');
    expect(res.summary?.make).toBe('HYUNDAI MOTOR INDIA LTD');
    expect(res.summary?.model).toBe('I20 SPORTZ');
    expect(res.summary?.color).toBe('TITAN GREY');
    expect(res.summary?.insurancePolicyNumber).toBe('POL-HY-998877');
    expect(res.summary?.insuranceActive).toBe(true);
  });

  it('maps upstream Parivahan RC failure to PARIVAHAN_LOOKUP_UNAVAILABLE instead of opaque 500 text', async () => {
    jest.spyOn(digioClient, 'verifyVehicleRc').mockRejectedValue(
      new Error('Internal failure'),
    );

    await expect(
      digioService.verifyVehicleRc(driverActor, { registrationNumber: 'TG07FX4667' }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({
        code: 'PARIVAHAN_LOOKUP_UNAVAILABLE',
      }),
    });
  });

  it('verifies commercial insurance policy number against Parivahan RC records and falls back gracefully on mismatch', async () => {
    jest.spyOn(digioClient, 'verifyVehicleRc').mockResolvedValue({
      user_details: { owner_name: 'RAMESH KUMAR' },
      vehicle_details: {
        rc_number: 'TS07FX4667',
        rc_status: 'ACTIVE',
      },
      finance_details: {
        insurance_company: 'HDFC ERGO',
        insurance_policy_number: 'POL-12345-ABC',
        insurance_upto: '2029-05-01',
      },
      permit_details: { blacklist_status: 'NA' },
    });

    const ok = await digioService.verifyVehicleInsurance(driverActor, {
      registrationNumber: 'TS07FX4667',
      policyNumber: 'pol 12345 abc',
    });
    expect(ok.verified).toBe(true);
    expect(ok.complianceOk).toBe(true);
    expect(ok.verificationType).toBe('VEHICLE_INSURANCE');

    const mismatch = await digioService.verifyVehicleInsurance(driverActor, {
      registrationNumber: 'TS07FX4667',
      policyNumber: 'OTHER-99999',
    });
    expect(mismatch.verified).toBe(false);
    expect(mismatch.complianceOk).toBe(false);
  });
});
