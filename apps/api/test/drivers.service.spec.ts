import { Test, TestingModule } from '@nestjs/testing';
import { DriversService } from '../src/modules/drivers/drivers.service';
import { DatabaseService } from '../src/database/database.service';
import { StorageService } from '../src/common/storage/storage.service';
import { AuditService } from '../src/modules/audit/audit.service';
import {
  DriverAvailability,
  VerificationStatus,
  InvalidStateTransitionError,
} from '@adhocx/contracts';

describe('DriversService Unit Tests', () => {
  let service: DriversService;
  let db: any;
  let storage: any;
  let audit: any;

  beforeEach(async () => {
    db = {
      driver: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
        upsert: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
    };

    storage = {
      saveFile: jest.fn().mockResolvedValue({
        url: '/uploads/sample.pdf',
        filename: 'sample.pdf',
        size: 1024,
        checksum: 'sha256_mock',
      }),
    };

    audit = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DriversService,
        { provide: DatabaseService, useValue: db },
        { provide: StorageService, useValue: storage },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<DriversService>(DriversService);
  });

  it('should update availability status when transition is legal', async () => {
    db.driver.findUnique
      .mockResolvedValueOnce({
        id: 'drv-1',
        userId: 'usr-1',
        availabilityStatus: DriverAvailability.OFFLINE,
      })
      .mockResolvedValueOnce({
        id: 'drv-1',
        userId: 'usr-1',
        fullName: 'John Driver',
        phone: '+919876543210',
        verificationStatus: VerificationStatus.VERIFIED,
        availabilityStatus: DriverAvailability.AVAILABLE,
        walletBalance: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    db.driver.update.mockResolvedValue({ userId: 'usr-1' });

    const result = await service.updateAvailability('usr-1', {
      status: DriverAvailability.AVAILABLE,
    });

    expect(result.availabilityStatus).toBe(DriverAvailability.AVAILABLE);
    expect(db.driver.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'usr-1' },
        data: expect.objectContaining({ availabilityStatus: DriverAvailability.AVAILABLE }),
      }),
    );
  });

  it('should reject illegal availability jump (e.g. OFFLINE directly to BUSY)', async () => {
    db.driver.findUnique.mockResolvedValue({
      id: 'drv-1',
      userId: 'usr-1',
      availabilityStatus: DriverAvailability.OFFLINE,
    });

    await expect(
      service.updateAvailability('usr-1', {
        status: DriverAvailability.BUSY,
      }),
    ).rejects.toThrow(InvalidStateTransitionError);
  });

  it('should submit KYC and transition status to UNDER_REVIEW with audit log', async () => {
    db.driver.findUnique
      .mockResolvedValueOnce({
        id: 'drv-1',
        userId: 'usr-1',
        verificationStatus: VerificationStatus.PENDING,
      })
      .mockResolvedValueOnce({
        id: 'drv-1',
        userId: 'usr-1',
        fullName: 'John Driver',
        phone: '+919876543210',
        verificationStatus: VerificationStatus.UNDER_REVIEW,
        availabilityStatus: DriverAvailability.OFFLINE,
        walletBalance: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

    db.driver.update.mockResolvedValue({ id: 'drv-1' });

    const result = await service.submitKyc('usr-1', {
      idNumber: '123456789012',
      dlNumber: 'DL-12345',
      panNumber: 'ABCDE1234F',
      rcNumber: 'DL01AB1234',
    });

    expect(result.verificationStatus).toBe(VerificationStatus.UNDER_REVIEW);
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'usr-1',
        action: 'DRIVER_KYC_SUBMITTED',
      }),
    );
  });

  it('should upload document via storage service and log audit', async () => {
    const result = await service.uploadDocument('usr-1', {
      filename: 'dl_front.pdf',
      mimeType: 'application/pdf',
      contentBase64: Buffer.from('dummy content').toString('base64'),
    });

    expect(result.url).toBe('/uploads/sample.pdf');
    expect(storage.saveFile).toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'DRIVER_DOCUMENT_UPLOADED',
      }),
    );
  });
});
