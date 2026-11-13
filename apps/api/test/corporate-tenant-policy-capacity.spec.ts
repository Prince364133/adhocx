import { BadRequestException } from '@nestjs/common';
import {
  CorporateTenantPolicyService,
  DEFAULT_TENANT_POLICY,
  validateTenantPolicyValues,
} from '../src/domains/corporate/tenants/corporate-tenant-policy.service';

describe('Corporate tenant vehicle capacity policy', () => {
  it.each([
    ['SEDAN', 4],
    ['SUV', 6],
  ])('accepts the canonical %s capacity boundary', (defaultVehicleCategory, defaultCapacity) => {
    expect(() =>
      validateTenantPolicyValues({ defaultVehicleCategory, defaultCapacity }),
    ).not.toThrow();
  });

  it.each([
    ['SEDAN', 5],
    ['SUV', 7],
  ])('rejects %s capacities above the vehicle limit', (defaultVehicleCategory, defaultCapacity) => {
    expect(() =>
      validateTenantPolicyValues({ defaultVehicleCategory, defaultCapacity }),
    ).toThrow(BadRequestException);
  });

  it('caps an out-of-range persisted Sedan capacity to the 4-seat limit when reading a policy', async () => {
    const policy = {
      ...DEFAULT_TENANT_POLICY,
      version: 1,
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      defaultVehicleCategory: 'SEDAN',
      defaultCapacity: 6,
    };
    const database = {
      corporateTenantPolicy: { findFirst: jest.fn().mockResolvedValue(policy) },
    };
    const service = new CorporateTenantPolicyService(database as any, {} as any);

    const result = await service.getEffectivePolicy('tenant-1', new Date('2026-11-12T00:00:00.000Z'));

    expect(result.defaultCapacity).toBe(4);
    expect(result.defaultVehicleCategory).toBe('SEDAN');
  });

  it('rejects legacy policy rows with an unsupported vehicle category', async () => {
    const policy = {
      ...DEFAULT_TENANT_POLICY,
      version: 1,
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      defaultVehicleCategory: 'VAN',
      defaultCapacity: 4,
    };
    const service = new CorporateTenantPolicyService(
      { corporateTenantPolicy: { findFirst: jest.fn().mockResolvedValue(policy) } } as any,
      {} as any,
    );

    await expect(service.getEffectivePolicy('tenant-1')).rejects.toThrow(
      'Stored tenant policy has an unsupported defaultVehicleCategory',
    );
  });
});
