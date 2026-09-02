import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from '../src/modules/users/users.service';
import { DatabaseService } from '../src/database/database.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockDb: { user: { findUnique: jest.Mock } };

  beforeEach(async () => {
    mockDb = {
      user: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should find user by id with profiles included', async () => {
    const mockUser = {
      id: 'usr-1',
      phone: '+919876543210',
      role: 'DRIVER',
      driver: { id: 'drv-1' },
      vendor: null,
    };
    mockDb.user.findUnique.mockResolvedValue(mockUser);

    const result = await service.findById('usr-1');
    expect(result).toEqual(mockUser);
    expect(mockDb.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'usr-1' },
      include: { vendor: true, driver: true },
    });
  });

  it('should find user by phone with profiles included', async () => {
    const mockUser = {
      id: 'usr-2',
      phone: '+919988776655',
      role: 'VENDOR',
      driver: null,
      vendor: { id: 'vnd-1' },
    };
    mockDb.user.findUnique.mockResolvedValue(mockUser);

    const result = await service.findByPhone('+919988776655');
    expect(result).toEqual(mockUser);
    expect(mockDb.user.findUnique).toHaveBeenCalledWith({
      where: { phone: '+919988776655' },
      include: { vendor: true, driver: true },
    });
  });
});
