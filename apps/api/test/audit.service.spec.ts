import { Test, TestingModule } from '@nestjs/testing';
import { AuditService } from '../src/modules/audit/audit.service';
import { DatabaseService } from '../src/database/database.service';

describe('AuditService', () => {
  let service: AuditService;
  let mockDb: { auditLog: { create: jest.Mock; findMany: jest.Mock } };

  beforeEach(async () => {
    mockDb = {
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'log-1' }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: DatabaseService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create an audit log entry', async () => {
    await service.log({
      userId: 'usr-1',
      action: 'ADMIN_DRIVER_VERIFIED',
      entityType: 'DRIVER',
      entityId: 'drv-1',
      metadata: { reason: 'Docs approved' },
    });

    expect(mockDb.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'usr-1',
        action: 'ADMIN_DRIVER_VERIFIED',
        entityName: 'DRIVER',
        entityId: 'drv-1',
        payload: { reason: 'Docs approved' },
      },
    });
  });

  it('should not throw error if audit log creation fails (non-blocking)', async () => {
    mockDb.auditLog.create.mockRejectedValue(new Error('DB write failed'));

    await expect(
      service.log({
        userId: 'usr-1',
        action: 'ADMIN_DRIVER_VERIFIED',
        entityType: 'DRIVER',
        entityId: 'drv-1',
      }),
    ).resolves.not.toThrow();
  });

  it('should fetch audit logs for an entity', async () => {
    const logs = [
      { id: 'log-1', entityName: 'DRIVER', entityId: 'drv-1', action: 'STATUS_CHANGED' },
    ];
    mockDb.auditLog.findMany.mockResolvedValue(logs);

    const result = await service.getLogsForEntity('DRIVER', 'drv-1');
    expect(result).toEqual(logs);
    expect(mockDb.auditLog.findMany).toHaveBeenCalledWith({
      where: { entityName: 'DRIVER', entityId: 'drv-1' },
      orderBy: { createdAt: 'desc' },
    });
  });
});
