import { FeatureFlagsService } from '../src/modules/feature-flags/feature-flags.service';

describe('FeatureFlagsService (Dual-Platform Controls)', () => {
  let service: FeatureFlagsService;
  let mockPrisma: any;
  let mockFlagStore: Map<string, any>;

  beforeEach(() => {
    mockFlagStore = new Map();

    mockPrisma = {
      featureFlag: {
        findUnique: jest.fn().mockImplementation(({ where }: { where: { key: string } }) => {
          return Promise.resolve(mockFlagStore.get(where.key) || null);
        }),
        findMany: jest.fn().mockImplementation(() => {
          return Promise.resolve(Array.from(mockFlagStore.values()));
        }),
        create: jest.fn().mockImplementation(({ data }: { data: any }) => {
          const item = { ...data, id: 'flag-uuid-1', createdAt: new Date(), updatedAt: new Date() };
          mockFlagStore.set(data.key, item);
          return Promise.resolve(item);
        }),
        update: jest.fn().mockImplementation(({ where, data }: { where: { key: string }; data: any }) => {
          const existing = mockFlagStore.get(where.key);
          if (!existing) throw new Error('Not found');
          const updated = {
            ...existing,
            ...data,
            updatedAt: new Date(),
          };
          mockFlagStore.set(where.key, updated);
          return Promise.resolve(updated);
        }),
        delete: jest.fn().mockImplementation(({ where }: { where: { key: string } }) => {
          const existing = mockFlagStore.get(where.key);
          mockFlagStore.delete(where.key);
          return Promise.resolve(existing);
        }),
      },
    };

    service = new FeatureFlagsService(mockPrisma);
  });

  it('should seed default vendor_wallet with dual platform android and web enabled', async () => {
    await service.seedDefaultFlags();
    const flag = mockFlagStore.get('vendor_wallet');
    expect(flag).toBeDefined();
    expect(flag.isEnabled).toBe(true);
    expect(flag.metadata).toEqual({
      android: true,
      web: true,
    });
  });

  it('should return platform-specific flag keys in getActiveFlags()', async () => {
    await service.seedDefaultFlags();
    const active = await service.getActiveFlags();

    expect(active.flags['vendor_wallet']).toBe(true);
    expect(active.flags['vendor_wallet_android']).toBe(true);
    expect(active.flags['vendor_wallet_web']).toBe(true);
  });

  it('should independently toggle Android platform while leaving Web active', async () => {
    await service.seedDefaultFlags();

    // Turn Android OFF
    const updated: any = await service.toggleFlag('vendor_wallet', false, 'admin@adhocx.com', 'android');
    expect(updated.metadata?.android).toBe(false);
    expect(updated.metadata?.web).toBe(true);
    // Overall flag remains true because web is still enabled
    expect(updated.isEnabled).toBe(true);

    // Verify platform checks
    expect(await service.isEnabled('vendor_wallet', false, 'android')).toBe(false);
    expect(await service.isEnabled('vendor_wallet', false, 'web')).toBe(true);

    const active = await service.getActiveFlags();
    expect(active.flags['vendor_wallet_android']).toBe(false);
    expect(active.flags['vendor_wallet_web']).toBe(true);
  });

  it('should independently toggle Web platform while leaving Android active', async () => {
    await service.seedDefaultFlags();

    // Turn Web OFF
    const updated: any = await service.toggleFlag('vendor_wallet', false, 'admin@adhocx.com', 'web');
    expect(updated.metadata?.android).toBe(true);
    expect(updated.metadata?.web).toBe(false);
    expect(updated.isEnabled).toBe(true);

    expect(await service.isEnabled('vendor_wallet', false, 'android')).toBe(true);
    expect(await service.isEnabled('vendor_wallet', false, 'web')).toBe(false);

    const active = await service.getActiveFlags();
    expect(active.flags['vendor_wallet_android']).toBe(true);
    expect(active.flags['vendor_wallet_web']).toBe(false);
  });

  it('should set overall isEnabled to false when both Android and Web are toggled off', async () => {
    await service.seedDefaultFlags();

    // Toggle both off sequentially
    await service.toggleFlag('vendor_wallet', false, 'admin@adhocx.com', 'android');
    const updated: any = await service.toggleFlag('vendor_wallet', false, 'admin@adhocx.com', 'web');

    expect(updated.metadata?.android).toBe(false);
    expect(updated.metadata?.web).toBe(false);
    expect(updated.isEnabled).toBe(false);

    expect(await service.isEnabled('vendor_wallet', false, 'android')).toBe(false);
    expect(await service.isEnabled('vendor_wallet', false, 'web')).toBe(false);
  });

  it('should toggle all platforms when no platform specified', async () => {
    await service.seedDefaultFlags();

    const updated: any = await service.toggleFlag('vendor_wallet', false, 'admin@adhocx.com');
    expect(updated.metadata?.android).toBe(false);
    expect(updated.metadata?.web).toBe(false);
    expect(updated.isEnabled).toBe(false);
  });
});
