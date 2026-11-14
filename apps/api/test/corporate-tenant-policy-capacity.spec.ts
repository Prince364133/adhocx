import { BadRequestException } from '@nestjs/common';
import {
  CorporateTenantPolicyService,
  DEFAULT_TENANT_POLICY,
  validateTenantPolicyValues,
} from '../src/domains/corporate/tenants/corporate-tenant-policy.service';

describe('Corporate tenant vehicle capacity policy', () => {
  it.each([
    ['CUSTOM_VAN', 8],
    ['ALL', 12],
  ])('accepts %s within the generic policy bounds', (defaultVehicleCategory, defaultCapacity) => {
    expect(() =>
      validateTenantPolicyValues({ defaultVehicleCategory, defaultCapacity }),
    ).not.toThrow();
  });

  it.each([
    ['CUSTOM_VAN', 13],
    ['', 4],
  ])('rejects invalid category policy values %#', (defaultVehicleCategory, defaultCapacity) => {
    expect(() =>
      validateTenantPolicyValues({ defaultVehicleCategory, defaultCapacity }),
    ).toThrow(BadRequestException);
  });

  it('rejects a stored capacity exceeding its active database category', async () => {
    const policy = {
      ...DEFAULT_TENANT_POLICY,
      version: 1,
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      defaultVehicleCategory: 'CUSTOM_VAN',
      defaultCapacity: 10,
    };
    const database = {
      corporateTenantPolicy: { findFirst: jest.fn().mockResolvedValue(policy) },
      vehiclePricingTier: {
        findMany: jest.fn().mockResolvedValue([{ vehicleType: 'CUSTOM_VAN', seatingCapacity: '8 seats', isActive: true }]),
      },
    };
    const service = new CorporateTenantPolicyService(database as any, {} as any);

    await expect(service.getEffectivePolicy('tenant-1', new Date('2026-11-12T00:00:00.000Z')))
      .rejects.toThrow(/capacity exceeds the active category capacity of 8/);
  });

  it('rejects a stored category that is no longer active', async () => {
    const policy = {
      ...DEFAULT_TENANT_POLICY,
      version: 1,
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      defaultVehicleCategory: 'RETIRED_VAN',
      defaultCapacity: 4,
    };
    const service = new CorporateTenantPolicyService(
      {
        corporateTenantPolicy: { findFirst: jest.fn().mockResolvedValue(policy) },
        vehiclePricingTier: {
          findMany: jest.fn().mockResolvedValue([{ vehicleType: 'CURRENT_VAN', seatingCapacity: '8 seats', isActive: true }]),
        },
      } as any,
      {} as any,
    );

    await expect(service.getEffectivePolicy('tenant-1')).rejects.toThrow(
      "defaultVehicleCategory 'RETIRED_VAN' is not active in the vehicle catalogue",
    );
  });
});
