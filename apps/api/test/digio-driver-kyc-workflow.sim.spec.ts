import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as crypto from 'crypto';
import request from 'supertest';
import { AuthUserDto, UserRole, VerificationStatus } from '@adhocx/contracts';
import { JwtAuthGuard, RolesGuard } from '../src/common';
import { DatabaseService } from '../src/database/database.service';
import { StorageService } from '../src/common/storage/storage.service';
import { DigioClient } from '../src/modules/digio/digio.client';
import { DigioController } from '../src/modules/digio/digio.controller';
import { DigioService } from '../src/modules/digio/digio.service';
import { DriversService } from '../src/modules/drivers/drivers.service';
import { AdminService } from '../src/modules/admin/admin.service';
import { AuditService } from '../src/modules/audit/audit.service';

describe('Digio Driver KYC, DL & Vehicle RC End-to-End Workflow Simulations (HTTP + Service World)', () => {
  const webhookSecret = 'digio-e2e-sim-secret';

  const makeActor = (overrides: Partial<AuthUserDto>): AuthUserDto =>
    ({
      id: 'usr-driver-1',
      phone: '+919876543210',
      email: 'driver1@adhocx.com',
      fullName: 'Vikram Singh',
      role: UserRole.DRIVER,
      ...overrides,
    }) as AuthUserDto;

  let currentActor: AuthUserDto = makeActor({});

  const createStatefulWorld = () => {
    const users = new Map<string, any>([
      [
        'usr-driver-1',
        {
          id: 'usr-driver-1',
          phone: '+919876543210',
          email: 'driver1@adhocx.com',
          fullName: 'Vikram Singh',
          role: 'DRIVER',
        },
      ],
      [
        'usr-driver-2',
        {
          id: 'usr-driver-2',
          phone: '+919811112222',
          email: 'driver2@adhocx.com',
          fullName: 'Ajay Sharma',
          role: 'DRIVER',
        },
      ],
    ]);

    const drivers = new Map<string, any>([
      [
        'drv-1',
        {
          id: 'drv-1',
          userId: 'usr-driver-1',
          fullName: 'Vikram Singh',
          phone: '+919876543210',
          verificationStatus: VerificationStatus.PENDING,
          availabilityStatus: 'OFFLINE',
          vehiclePlate: 'DL01AB1234',
          vehicleType: 'SEDAN',
          vehicleModel: 'Maruti Dzire',
          walletBalance: 0,
          dlFrontUrl: '/uploads/dl-front.jpg',
          rcDocUrl: '/uploads/rc-front.jpg',
          aadharFrontUrl: '/uploads/aadhaar-front.jpg',
          aadharBackUrl: '/uploads/aadhaar-back.jpg',
          panDocUrl: '/uploads/pan.jpg',
          kycDocuments: {
            profilePhotoUrl: '/uploads/selfie.jpg',
            bankAccountNumber: '123456789012',
            bankIfsc: 'SBIN0000300',
            bankAccountName: 'Vikram Singh',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      [
        'drv-2',
        {
          id: 'drv-2',
          userId: 'usr-driver-2',
          fullName: 'Ajay Sharma',
          phone: '+919811112222',
          verificationStatus: VerificationStatus.PENDING,
          availabilityStatus: 'OFFLINE',
          vehiclePlate: 'HR26XY9999',
          kycDocuments: { profilePhotoUrl: '/uploads/selfie2.jpg' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    ]);

    const vehicles = new Map<string, any>([
      [
        'veh-1',
        {
          id: 'veh-1',
          driverId: 'drv-1',
          registrationNumber: 'DL01AB1234',
          vehicleType: 'SEDAN',
          model: 'Maruti Dzire',
          verificationStatus: VerificationStatus.PENDING,
        },
      ],
    ]);

    const digioRecords: any[] = [];
    const auditLogs: any[] = [];

    const db: any = {
      user: {
        findUnique: jest.fn(async ({ where }: any) => {
          if (where.id) return users.get(where.id) || null;
          if (where.email) return [...users.values()].find((u) => u.email === where.email) || null;
          if (where.phone) return [...users.values()].find((u) => u.phone === where.phone) || null;
          return null;
        }),
        findFirst: jest.fn(async ({ where }: any) => {
          if (where?.phone?.in) {
            return [...users.values()].find((u) => where.phone.in.includes(u.phone)) || null;
          }
          return null;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const u = users.get(where.id);
          if (!u) return null;
          Object.assign(u, data);
          return u;
        }),
      },
      driver: {
        findUnique: jest.fn(async ({ where, include }: any) => {
          const drv = where.id
            ? drivers.get(where.id)
            : [...drivers.values()].find((d) => d.userId === where.userId);
          if (!drv) return null;
          if (!include) return drv;
          return {
            ...drv,
            ...(include.user ? { user: users.get(drv.userId) } : {}),
            ...(include.vehicles
              ? { vehicles: [...vehicles.values()].filter((v) => v.driverId === drv.id) }
              : {}),
          };
        }),
        findFirst: jest.fn(async ({ where }: any) => {
          if (where?.phone?.in) {
            return [...drivers.values()].find((d) => where.phone.in.includes(d.phone)) || null;
          }
          if (where?.vehiclePlate) {
            return [...drivers.values()].find((d) => d.vehiclePlate === where.vehiclePlate) || null;
          }
          return null;
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const drv = where.id ? drivers.get(where.id) : [...drivers.values()].find((d) => d.userId === where.userId);
          if (!drv) return null;
          Object.assign(drv, data, { updatedAt: new Date() });
          return drv;
        }),
      },
      vendor: {
        findUnique: jest.fn(async () => null),
        findFirst: jest.fn(async () => null),
      },
      vehicle: {
        findFirst: jest.fn(async ({ where }: any) => {
          return (
            [...vehicles.values()].find(
              (v) =>
                (where.driverId ? v.driverId === where.driverId : true) &&
                (!where.OR ||
                  where.OR.some(
                    (c: any) =>
                      (c.registrationNumber && v.registrationNumber === c.registrationNumber) ||
                      (c.rcNumber && v.rcNumber === c.rcNumber),
                  )),
            ) || null
          );
        }),
        findUnique: jest.fn(async ({ where }: any) => vehicles.get(where.id) || null),
        update: jest.fn(async ({ where, data }: any) => {
          const v = vehicles.get(where.id);
          if (v) Object.assign(v, data);
          return v;
        }),
        create: jest.fn(async ({ data }: any) => {
          const v = { id: `veh_${vehicles.size + 1}`, ...data };
          vehicles.set(v.id, v);
          return v;
        }),
      },
      digioVerification: {
        // Same filter semantics as Prisma for the fields DigioService queries (consent, reuse).
        findFirst: jest.fn(async ({ where }: any) => {
          const ok = (r: any, w: any): boolean =>
            Object.entries(w || {}).every(([k, v]: [string, any]) => {
              if (k === 'OR') return (v as any[]).some((c) => ok(r, c));
              if (v && typeof v === 'object' && !(v instanceof Date) && 'gte' in v) return r[k] >= v.gte;
              return r[k] === v;
            });
          return digioRecords.filter((r) => ok(r, where)).slice().reverse()[0] ?? null;
        }),
        create: jest.fn(async ({ data }: any) => {
          const rec = {
            id: `dv_${digioRecords.length + 1}`,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          digioRecords.push(rec);
          return rec;
        }),
        findMany: jest.fn(async ({ where }: any) => {
          return digioRecords
            .filter((r) => {
              if (where?.OR) {
                return where.OR.some(
                  (c: any) =>
                    (c.driverId && r.driverId === c.driverId) ||
                    (c.userId && r.userId === c.userId),
                );
              }
              return true;
            })
            .slice()
            .reverse();
        }),
        findUnique: jest.fn(async ({ where }: any) => {
          return (
            digioRecords.find(
              (r) =>
                (where.id && r.id === where.id) ||
                (where.digioRequestId && r.digioRequestId === where.digioRequestId) ||
                (where.uniqueRequestId && r.uniqueRequestId === where.uniqueRequestId),
            ) || null
          );
        }),
        update: jest.fn(async ({ where, data }: any) => {
          const idx = digioRecords.findIndex((r) => r.id === where.id);
          if (idx === -1) return null;
          digioRecords[idx] = { ...digioRecords[idx], ...data, updatedAt: new Date() };
          return digioRecords[idx];
        }),
      },
    };

    return { users, drivers, vehicles, digioRecords, auditLogs, db };
  };

  let app: INestApplication;
  let world: ReturnType<typeof createStatefulWorld>;
  let digioClient: DigioClient;
  let driversService: DriversService;
  let adminService: AdminService;

  beforeEach(async () => {
    currentActor = makeActor({});
    world = createStatefulWorld();

    const auditMock = {
      log: jest.fn(async (entry: any) => {
        world.auditLogs.push(entry);
      }),
    };

    const storageMock = {
      getFileBuffer: jest.fn(async (url: string) => ({
        buffer: Buffer.from(`mock-binary-bytes:${url}`),
        mimeType: 'image/jpeg',
        filename: 'doc.jpg',
      })),
      saveFile: jest.fn(async (file: any) => ({
        url: `/uploads/${file.originalname || `saved_${Date.now()}.jpg`}`,
        filename: file.originalname || 'saved.jpg',
      })),
    };

    const configMock = {
      get: jest.fn((key: string) => {
        const map: Record<string, any> = {
          'digio.env': 'production',
          'digio.baseUrl': 'https://api.digio.in',
          'digio.gatewayUrl': 'https://app.digio.in',
          'digio.clientId': 'ACK_SIM_CLIENT',
          'digio.clientSecret': 'SIM_SECRET_KEY',
          'digio.webhookSecret': webhookSecret,
          'digio.digilockerTemplateName': 'DIGILOCKER_AADHAAR_PAN',
          'digio.timeoutMs': 10000,
          'digio.allowedWebhookIps': ['13.126.198.236', '52.66.66.81'],
        };
        return map[key];
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DigioController],
      providers: [
        DigioClient,
        DigioService,
        DriversService,
        AdminService,
        { provide: ConfigService, useValue: configMock },
        { provide: DatabaseService, useValue: world.db },
        { provide: StorageService, useValue: storageMock },
        { provide: AuditService, useValue: auditMock },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const req = ctx.switchToHttp().getRequest();
          req.user = currentActor;
          return true;
        },
      })
      .overrideGuard(RolesGuard)
      .useValue({
        canActivate: (ctx: any) => {
          const roles = Reflect.getMetadata('roles', ctx.getHandler()) as UserRole[] | undefined;
          if (!roles?.length) return true;
          return roles.includes(currentActor.role);
        },
      })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    digioClient = module.get(DigioClient);
    driversService = module.get(DriversService);
    adminService = module.get(AdminService);
  });

  afterEach(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  it('Simulation 1: Complete Happy-Path Driver KYC Lifecycle (Selfie -> Aadhaar Mask -> PAN -> DL -> RC -> Bank -> FaceMatch -> Submit -> Admin Suite & Approval)', async () => {
    jest.spyOn(digioClient, 'checkLiveness').mockResolvedValue({ score: 0.98, result: 'PASS' });
    jest.spyOn(digioClient, 'analyzeIdCard').mockImplementation(async (params: any) => {
      if (params.expectedIds?.includes('AADHAAR')) {
        return {
          details: { status: 'SUCCESS' },
          detections: [
            {
              id_type: 'AADHAAR',
              id_attributes: { name: 'VIKRAM SINGH', id_no: '991122334455', dob: '14/05/1992' },
              output_images: {
                front_part: Buffer.from('masked-aadhaar-jpeg-binary-stream-for-sim').toString('base64'),
              },
              front_image_checks_result: { blur: false, black_and_white: false },
              verification_result: { verified: true },
            },
          ],
        };
      }
      return {
        details: { status: 'SUCCESS' },
        detections: [
          {
            id_type: 'DRIVING_LICENCE',
            id_attributes: { name: 'VIKRAM SINGH', id_no: 'DL0120200012345', dob: '14/05/1992' },
            output_images: {},
            front_image_checks_result: { blur: false },
            verification_result: { verified: true },
          },
        ],
      };
    });
    jest.spyOn(digioClient, 'fetchIdData').mockImplementation(async (type: any) => {
      if (type === 'PAN') {
        return { status: 'VALID', name: 'VIKRAM SINGH', aadhaar_seeding_status: 'Y' };
      }
      if (type === 'DRIVING_LICENSE') {
        return {
          "Holder's Name": 'VIKRAM SINGH',
          'Current Status': 'ACTIVE',
          Transport: { From: '01/01/2021', To: '31/12/2035' },
        };
      }
      return {};
    });
    jest.spyOn(digioClient, 'verifyVehicleRc').mockResolvedValue({
      user_details: { owner_name: 'VIKRAM SINGH' },
      vehicle_details: {
        rc_number: 'DL01AB1234',
        rc_status: 'ACTIVE',
        maker_description: 'MARUTI SUZUKI',
        maker_model: 'DZIRE TOUR S',
        fit_up_to: '2032-12-31',
      },
      finance_details: { insurance_company: 'ICICI LOMBARD', insurance_upto: '2029-10-01' },
      permit_details: { permit_type: 'ALL INDIA', permit_valid_upto: '2030-01-01', blacklist_status: 'NA', pucc_upto: '2028-11-01' },
    });
    jest.spyOn(digioClient, 'verifyIfsc').mockResolvedValue({
      verified: true,
      data: { ifsc: 'SBIN0000300', bank: 'State Bank of India', branch: 'MUMBAI MAIN' },
    });
    jest.spyOn(digioClient, 'verifyBankAccount').mockResolvedValue({
      verified: true,
      beneficiary_name_with_bank: 'VIKRAM SINGH',
      fuzzy_match_score: 99,
      validation_mode: 'PENNY_LESS',
    });
    jest.spyOn(digioClient, 'faceMatch').mockResolvedValue({ confidence: 92.5, result: 'MATCHED' });
    jest.spyOn(digioClient, 'fuzzyMatch').mockResolvedValue({ matched: true, match_score: 98 });

    // 0. UIDAI / DPDP: Aadhaar processing is refused until the driver consents in the app.
    await request(app.getHttpServer())
      .post('/kyc/digio/id-card/analyze-stored')
      .send({ frontDocUrl: '/uploads/aadhaar-front.jpg', expectedIds: ['AADHAAR'], saveMaskedToDriver: true })
      .expect(400);
    await request(app.getHttpServer()).post('/kyc/digio/consent').send({ accepted: true, textVersion: 'AADHAAR_CONSENT_V1' }).expect(201);

    // 1. Selfie Liveness
    await request(app.getHttpServer()).post('/kyc/digio/biometric/liveness-stored').send({}).expect(201);

    // 2. Aadhaar OCR + Auto Masking
    const aadhaarOcr = await request(app.getHttpServer())
      .post('/kyc/digio/id-card/analyze-stored')
      .send({ frontDocUrl: '/uploads/aadhaar-front.jpg', expectedIds: ['AADHAAR'], saveMaskedToDriver: true })
      .expect(201);
    expect(aadhaarOcr.body.identifier).toBe('XXXX-XXXX-4455');

    // 3. DL OCR & PAN/DL/RC Govt verification
    await request(app.getHttpServer())
      .post('/kyc/digio/id-card/analyze-stored')
      .send({ frontDocUrl: '/uploads/dl-front.jpg', expectedIds: ['DRIVING_LICENCE'] })
      .expect(201);
    await request(app.getHttpServer()).post('/kyc/digio/pan').send({ panNumber: 'ABCDE1234F', name: 'Vikram Singh' }).expect(201);
    await request(app.getHttpServer())
      .post('/kyc/digio/dl')
      .send({ dlNumber: 'DL0120200012345', dob: '1992-05-14', name: 'Vikram Singh' })
      .expect(201);
    await request(app.getHttpServer()).post('/kyc/digio/vehicle-rc').send({ registrationNumber: 'DL01AB1234' }).expect(201);
    await request(app.getHttpServer())
      .post('/kyc/digio/bank/verify')
      .send({ accountNumber: '123456789012', ifsc: 'SBIN0000300', saveToDriverProfile: true })
      .expect(201);

    // Verify scanning DL OCR did NOT erase Aadhaar OCR sub-key
    const drvState = world.drivers.get('drv-1');
    expect(drvState.kycDocuments.digioVerifications.ID_OCR_AADHAAR?.verified).toBe(true);
    expect(drvState.kycDocuments.digioVerifications.ID_OCR_DL?.verified).toBe(true);
    expect(drvState.kycDocuments.digioVerifications.AADHAAR_MASK?.verified).toBe(true);

    // 4. Driver submits final KYC
    await driversService.submitKyc('usr-driver-1', {
      licenseNumber: 'DL0120200012345',
      dlNumber: 'DL0120200012345',
      panNumber: 'ABCDE1234F',
      rcNumber: 'DL01AB1234',
      licenseExpiry: '2035-12-31T00:00:00Z',
      documentUrls: ['/uploads/dl-front.jpg', '/uploads/rc-front.jpg'],
      vehicle: { type: 'SEDAN', model: 'Maruti Dzire', color: 'White', registrationNumber: 'DL01AB1234' },
    } as any);
    expect(world.drivers.get('drv-1').kycDocuments.dlNumber).toBe('DL0120200012345');

    // 5. Switch to Admin: run 1-click Suite + Approve
    currentActor = makeActor({ id: 'adm-1', role: UserRole.ADMIN, fullName: 'Admin Ops' });
    const suiteRes = await request(app.getHttpServer())
      .post('/kyc/digio/admin/driver/drv-1/run-suite')
      .send({})
      .expect(201);
    expect(suiteRes.body.executedChecks).toEqual(
      expect.arrayContaining(['PAN', 'DRIVING_LICENSE', 'VEHICLE_RC', 'LIVENESS', 'FACE_MATCH', 'FUZZY_MATCH']),
    );
    expect(suiteRes.body.complianceAlerts).toEqual([]);

    const approved = await adminService.verifyDriver('drv-1', 'adm-1', { notes: 'Digio verified cleanly' });
    expect(approved.verificationStatus).toBe(VerificationStatus.VERIFIED);
    expect(world.auditLogs.at(-1)?.metadata?.digioChecksSummary?.DRIVING_LICENSE?.verified).toBe(true);
  });

  it('Simulation 2 & 3: Flags Spoofed Selfie, Low Face Match, Expired DL & Blacklisted RC in Compliance Alerts', async () => {
    jest.spyOn(digioClient, 'checkLiveness').mockResolvedValue({ score: 0.12, result: 'FAIL' });
    jest.spyOn(digioClient, 'faceMatch').mockResolvedValue({ confidence: 28.5, result: 'NOT_MATCHED' });
    jest.spyOn(digioClient, 'fetchIdData').mockResolvedValue({
      "Holder's Name": 'VIKRAM SINGH',
      'Current Status': 'EXPIRED',
      Transport: { From: '01/01/2014', To: '01/01/2020' },
    });
    jest.spyOn(digioClient, 'verifyVehicleRc').mockResolvedValue({
      user_details: { owner_name: 'VIKRAM SINGH' },
      vehicle_details: { rc_number: 'DL01AB1234', rc_status: 'ACTIVE', fit_up_to: '2022-01-01' },
      finance_details: { insurance_upto: '2022-02-01' },
      permit_details: { blacklist_status: 'THEFT_REPORTED' },
    });

    await request(app.getHttpServer()).post('/kyc/digio/biometric/liveness-stored').send({}).expect(201);
    await request(app.getHttpServer()).post('/kyc/digio/biometric/face-match-stored').send({}).expect(201);
    const dlRes = await request(app.getHttpServer())
      .post('/kyc/digio/dl')
      .send({ dlNumber: 'DL01201400001', dob: '1992-05-14' })
      .expect(201);
    const rcRes = await request(app.getHttpServer())
      .post('/kyc/digio/vehicle-rc')
      .send({ registrationNumber: 'DL01AB1234' })
      .expect(201);

    expect(dlRes.body.status).toBe('PARTIAL');
    expect(rcRes.body.status).toBe('PARTIAL');
    expect(rcRes.body.complianceNotes).toContain('THEFT_REPORTED');

    currentActor = makeActor({ id: 'adm-1', role: UserRole.ADMIN });
    const adminView = await request(app.getHttpServer()).get('/kyc/digio/admin/driver/drv-1').expect(200);
    const codes = adminView.body.complianceAlerts.map((a: any) => a.code);
    expect(codes).toEqual(
      expect.arrayContaining(['DL_COMPLIANCE_ISSUE', 'RC_COMPLIANCE_ISSUE', 'FACE_MATCH_FAILED', 'LIVENESS_FAILED']),
    );
  });

  it('Simulation 4, 5 & 6: DigiLocker Flow, Tampered Webhook Rejection, Valid Webhook Sync & Media Attachment', async () => {
    jest.spyOn(digioClient, 'createKycRequestWithTemplate').mockResolvedValue({
      id: 'KID_SIM_DLKR',
      status: 'requested',
      access_token: { id: 'GWT_SIM_1' },
    });

    await request(app.getHttpServer()).post('/kyc/digio/consent').send({ accepted: true, textVersion: 'AADHAAR_CONSENT_V1' }).expect(201);
    const sessionRes = await request(app.getHttpServer())
      .post('/kyc/digio/digilocker/request')
      .send({ redirectUrl: 'https://adhocx.com/kyc' })
      .expect(201);
    expect(sessionRes.body.digioRequestId).toBe('KID_SIM_DLKR');

    jest.spyOn(digioClient, 'getKycRequestResponse').mockResolvedValue({
      id: 'KID_SIM_DLKR',
      status: 'approved',
      actions: [
        {
          type: 'digilocker',
          status: 'approved',
          details: {
            aadhaar: { name: 'VIKRAM SINGH', id_number: '112233445566', file_id: 'f_adh_1' },
            pan: { name: 'VIKRAM SINGH', id_number: 'ABCDE1234F', file_id: 'f_pan_1' },
            driving_licence: { name: 'VIKRAM SINGH', id_number: 'DL0120200012345', file_id: 'f_dl_1' },
          },
        },
      ],
    });
    jest.spyOn(digioClient, 'downloadKycMedia').mockResolvedValue({
      contentType: 'application/pdf',
      data: null,
      buffer: Buffer.from('%PDF-1.4 simulated digilocker media'),
    });

    // Tampered checksum -> 401
    await request(app.getHttpServer())
      .post('/kyc/digio/webhooks')
      .set('x-digio-checksum', 'tampered-hmac')
      .send({ event: 'kyc.request.approved', payload: { kyc_request: { id: 'KID_SIM_DLKR' } } })
      .expect(401);

    // Valid webhook using service directly (since Nest rawBody in full express runtime holds exact bytes)
    const bodyStr = JSON.stringify({ event: 'kyc.request.approved', payload: { kyc_request: { id: 'KID_SIM_DLKR' } } });
    const sig = crypto.createHmac('sha256', webhookSecret).update(bodyStr).digest('hex');
    const digioSvc = app.get(DigioService);
    const wh = await digioSvc.handleWebhook({ rawBody: bodyStr, checksumHeader: sig, payload: JSON.parse(bodyStr) });
    expect((wh as any).queued).toBe(true);
    const synced: any = await digioSvc.reconcileWebhookRequest(String(JSON.parse(bodyStr)?.payload?.kyc_request?.id));
    expect(synced?.verified).toBe(true);
    expect((synced?.summary as any)?.maskedAadhaar).toBe('XXXX-XXXX-5566');

    const mediaRes = await request(app.getHttpServer())
      .post('/kyc/digio/digilocker/request/KID_SIM_DLKR/sync-media')
      .expect(201);
    expect(mediaRes.body.attachedCount).toBe(3);
  });

  it('Simulation 7 & 8: Blocks Cross-Driver IDOR (403) and Supports Rejection -> Resubmission -> Approval', async () => {
    // Driver 1 attempting to run PAN verification on Driver 2 -> 403 Forbidden
    await request(app.getHttpServer())
      .post('/kyc/digio/pan')
      .send({ panNumber: 'ABCDE1234F', targetDriverId: 'drv-2' })
      .expect(403);

    // Move drv-1 to UNDER_REVIEW -> REJECTED -> Resubmit -> VERIFIED
    world.drivers.get('drv-1').verificationStatus = VerificationStatus.UNDER_REVIEW;
    await adminService.rejectDriver('drv-1', 'adm-1', { reason: 'Blurry DL front photo' });
    expect(world.drivers.get('drv-1').verificationStatus).toBe(VerificationStatus.REJECTED);

    await driversService.submitKyc('usr-driver-1', {
      licenseNumber: 'DL0120200012345',
      dlNumber: 'DL0120200012345',
      licenseExpiry: '2035-12-31T00:00:00Z',
      documentUrls: ['/uploads/dl-clear.jpg'],
      vehicle: { type: 'SEDAN', model: 'Maruti Dzire', color: 'White', registrationNumber: 'DL01AB1234' },
    } as any);
    expect(world.drivers.get('drv-1').verificationStatus).toBe(VerificationStatus.UNDER_REVIEW);

    // Even before Digio checks run on the resubmitted DL/RC, an admin can approve anyway (override audited),
    // or wait for Digio DL/RC re-verification so approval proceeds with zero blockers.
    const overrideApproved = await adminService.verifyDriver('drv-1', 'adm-1', { notes: 'Resubmitted manual check' });
    expect(overrideApproved.verificationStatus).toBe(VerificationStatus.VERIFIED);

    // Move back through REJECTED -> UNDER_REVIEW and re-verify DL/RC with Digio to confirm clean path too.
    await adminService.rejectDriver('drv-1', 'adm-1', { reason: 'Re-check requested' });
    await driversService.submitKyc('usr-driver-1', {
      licenseNumber: 'DL0120200012345',
      dlNumber: 'DL0120200012345',
      licenseExpiry: '2035-12-31T00:00:00Z',
      documentUrls: ['/uploads/dl-clear.jpg'],
      vehicle: { type: 'SEDAN', model: 'Maruti Dzire', color: 'White', registrationNumber: 'DL01AB1234' },
    } as any);

    // Admin re-verifies the new DL and RC with Digio; both pass, so approval needs no override.
    jest.spyOn(digioClient, 'fetchIdData').mockResolvedValue({
      "Holder's Name": 'VIKRAM SINGH',
      'Current Status': 'ACTIVE',
      Transport: { From: '01/01/2021', To: '31/12/2035' },
    } as any);
    jest.spyOn(digioClient, 'verifyVehicleRc').mockResolvedValue({
      user_details: { owner_name: 'VIKRAM SINGH' },
      vehicle_details: { rc_number: 'DL01AB1234', rc_status: 'ACTIVE', fit_up_to: '2032-12-31' },
      finance_details: { insurance_upto: '2029-10-01' },
      permit_details: { permit_valid_upto: '2030-01-01', blacklist_status: 'NA', pucc_upto: '2028-11-01' },
    } as any);
    currentActor = makeActor({ id: 'adm-1', role: UserRole.ADMIN });
    await request(app.getHttpServer())
      .post('/kyc/digio/dl')
      .send({ dlNumber: 'DL0120200012345', dob: '1992-05-14', targetDriverId: 'drv-1' })
      .expect(201);
    await request(app.getHttpServer())
      .post('/kyc/digio/vehicle-rc')
      .send({ registrationNumber: 'DL01AB1234', targetDriverId: 'drv-1' })
      .expect(201);

    const reApproved = await adminService.verifyDriver('drv-1', 'adm-1', { notes: 'Resubmitted DL clear & verified' });
    expect(reApproved.verificationStatus).toBe(VerificationStatus.VERIFIED);
  });
});

