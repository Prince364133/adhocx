import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VendorsService } from '../src/modules/vendors/vendors.service';
import { DatabaseService } from '../src/database/database.service';
import { VerificationStatus } from '@adhocx/contracts';

describe('VendorsService', () => {
  let service: VendorsService;
  let mockDb: {
    vendor: { upsert: jest.Mock; findUnique: jest.Mock };
    user: { findUnique: jest.Mock; update: jest.Mock };
  };

  beforeEach(async () => {
    mockDb = {
      vendor: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VendorsService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<VendorsService>(VendorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create or update a vendor profile', async () => {
    const mockVendor = {
      id: 'vnd-1',
      userId: 'usr-1',
      organizationName: 'Fleet Corp',
      fullName: 'Aarav Gupta',
      phone: '+919988776655',
      gstNumber: '07AAAAA0000A1Z5',
      address: 'Connaught Place, Delhi',
      verificationStatus: VerificationStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockDb.vendor.upsert.mockResolvedValue(mockVendor);

    const result = await service.createProfile(
      'usr-1',
      {
        organizationName: 'Fleet Corp',
        fullName: 'Aarav Gupta',
        gstNumber: '07AAAAA0000A1Z5',
        address: 'Connaught Place, Delhi',
      },
      '+919988776655',
    );

    expect(result.id).toBe('vnd-1');
    expect(result.organizationName).toBe('Fleet Corp');
    expect(result.verificationStatus).toBe(VerificationStatus.PENDING);
  });

  it('should get vendor profile by user id', async () => {
    const mockVendor = {
      id: 'vnd-1',
      userId: 'usr-1',
      organizationName: 'Fleet Corp',
      fullName: 'Aarav Gupta',
      phone: '+919988776655',
      verificationStatus: VerificationStatus.VERIFIED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockDb.vendor.findUnique.mockResolvedValue(mockVendor);

    const result = await service.getProfile('usr-1');
    expect(result.id).toBe('vnd-1');
    expect(result.verificationStatus).toBe(VerificationStatus.VERIFIED);
  });

  it('should throw NotFoundException when vendor profile does not exist', async () => {
    mockDb.vendor.findUnique.mockResolvedValue(null);

    await expect(service.getProfile('non-existent')).rejects.toThrow(
      NotFoundException,
    );
  });
});
