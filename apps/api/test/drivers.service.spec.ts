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

  it('should return empty scoreHistory for rookie driver with no activity', async () => {
    db.driver.findUnique.mockResolvedValue({
      id: 'drv-new',
      userId: 'usr-new',
      fullName: 'New Driver',
      trustScore: 100.0,
      averageRating: 5.0,
      totalTrips: 0,
      acceptanceRate: 100.0,
      trips: [],
      reviewsReceived: [],
      lastCooldownAt: null,
    });

    const breakdown = await service.getTrustScoreBreakdown('usr-new');
    expect(breakdown.isRookieProtected).toBe(true);
    expect(breakdown.scoreHistory).toEqual([]);
    expect(breakdown.currentScore).toBe(100.0);
  });

  it('should populate scoreHistory from real reviews, completed trips and cooldowns', async () => {
    const now = new Date();
    db.driver.findUnique.mockResolvedValue({
      id: 'drv-active',
      userId: 'usr-active',
      fullName: 'Pro Driver',
      trustScore: 92.5,
      averageRating: 4.8,
      totalTrips: 12,
      acceptanceRate: 90.0,
      trips: [
        {
          id: 'trip-1',
          status: 'COMPLETED',
          pickupAddress: 'Connaught Place, New Delhi',
          dropAddress: 'Gurgaon Cyber City',
          completedAt: new Date(now.getTime() - 3600000),
          createdAt: new Date(now.getTime() - 7200000),
        },
      ],
      reviewsReceived: [
        {
          id: 'rev-1',
          rating: 5,
          feedback: 'Smooth ride',
          tripId: 'trip-1',
          createdAt: new Date(now.getTime() - 1800000),
        },
      ],
      lastCooldownAt: new Date(now.getTime() - 86400000),
      cooldownLevel: 1,
      createdAt: new Date(now.getTime() - 100000000),
    });

    const breakdown = await service.getTrustScoreBreakdown('usr-active');
    expect(breakdown.scoreHistory.length).toBeGreaterThanOrEqual(3);
    const revEntry = breakdown.scoreHistory.find((h) => h.id === 'rev_rev-1');
    expect(revEntry).toBeDefined();
    expect(revEntry?.delta).toBe('+2.0 pts');
    expect(revEntry?.title).toContain('Smooth ride');

    const tripEntry = breakdown.scoreHistory.find((h) => h.id === 'trip_trip-1');
    expect(tripEntry).toBeDefined();
    expect(tripEntry?.delta).toBe('+0.5 pts');
    expect(tripEntry?.title).toContain('Connaught Place → Gurgaon Cyber City');
  });
});

