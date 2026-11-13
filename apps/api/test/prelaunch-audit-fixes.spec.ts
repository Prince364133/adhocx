import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthService } from '../src/modules/auth/auth.service';
import { PricingService } from '../src/modules/pricing/pricing.service';
import { UpdatePolicyConfigDto } from '../src/modules/pricing/update-policy-config.dto';

/**
 * Pre-launch audit (2026-11-13):
 *  - the admin escort-fee / policy PATCH validates its body and writes an audit row
 *  - signing in never rewrites a driver / vendor / admin into a corporate admin just because their
 *    phone or email matches a corporate tenant's contact
 */

describe('UpdatePolicyConfigDto (admin escort fee editor)', () => {
  const errorsFor = async (body: Record<string, unknown>) =>
    (await validate(plainToInstance(UpdatePolicyConfigDto, body))).map((e) => e.property);

  it('accepts a normal escort fee', async () => {
    expect(await errorsFor({ escortFee: 350 })).toEqual([]);
    expect(await errorsFor({ escortFee: 0 })).toEqual([]);
  });

  it('rejects strings, negatives, NaN and absurd values', async () => {
    expect(await errorsFor({ escortFee: '350' })).toContain('escortFee');
    expect(await errorsFor({ escortFee: -1 })).toContain('escortFee');
    expect(await errorsFor({ escortFee: Number.NaN })).toContain('escortFee');
    expect(await errorsFor({ escortFee: 1_000_000 })).toContain('escortFee');
    expect(await errorsFor({ commissionPercent: 150 })).toContain('commissionPercent');
    expect(await errorsFor({ driverTrialDays: 2.5 })).toContain('driverTrialDays');
  });
});

describe('PricingService.updatePolicyConfig', () => {
  function build() {
    const row = {
      key: 'GLOBAL_POLICY',
      commissionPercent: 10,
      driverMonthlyFee: 499,
      driverTrialDays: 15,
      minWithdrawalAmount: 1000,
      escortFee: 300,
      updatedAt: new Date('2026-11-13T04:00:00Z'),
    };
    const db: any = {
      systemPolicyConfig: {
        findUnique: jest.fn(async () => ({ ...row })),
        upsert: jest.fn(async ({ update }: any) => Object.assign(row, update, { updatedAt: new Date() })),
      },
      pricingAudit: { create: jest.fn(async () => ({})) },
    };
    return { svc: new PricingService(db), db };
  }

  it('saves the escort fee and records old -> new in the pricing audit', async () => {
    const { svc, db } = build();
    const res = await svc.updatePolicyConfig({ escortFee: 450 }, { id: 'admin-1', name: 'Ops Admin' });
    expect(res.escortFee).toBe(450);
    expect(db.systemPolicyConfig.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { escortFee: 450 } }));
    expect(db.pricingAudit.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: 'admin-1',
        action: 'UPDATE_POLICY',
        entityType: 'PLATFORM_POLICY',
        entityId: 'GLOBAL_POLICY',
        oldValueJson: { escortFee: 300 },
        newValueJson: { escortFee: 450 },
      }),
    });
  });

  it('rejects invalid values without touching the database', async () => {
    const { svc, db } = build();
    await expect(svc.updatePolicyConfig({ escortFee: -5 })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.updatePolicyConfig({ escortFee: Number.NaN })).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.updatePolicyConfig({})).rejects.toBeInstanceOf(BadRequestException);
    expect(db.systemPolicyConfig.upsert).not.toHaveBeenCalled();
  });

  it('still saves when the audit write fails', async () => {
    const { svc, db } = build();
    db.pricingAudit.create.mockRejectedValueOnce(new Error('audit down'));
    await expect(svc.updatePolicyConfig({ escortFee: 320 })).resolves.toEqual(expect.objectContaining({ escortFee: 320 }));
  });
});

describe('AuthService.linkCorporateTenantContact', () => {
  const tenant = { id: 't1', name: 'Acme', code: 'ACME', status: 'ACTIVE' };
  function build() {
    const db: any = {
      corporateTenant: { findFirst: jest.fn(async () => tenant) },
      user: { update: jest.fn(async ({ data }: any) => ({ id: 'u1', phone: '+919876543210', ...data })) },
    };
    const config = { get: jest.fn(() => null) };
    const svc = new AuthService(db, {} as any, config as any, {} as any, { sendOtp: jest.fn() } as any);
    return { svc, db };
  }

  it.each([
    ['DRIVER', { driver: { id: 'd1' } }],
    ['VENDOR', { vendor: { id: 'v1' } }],
    ['ADMIN', {}],
    ['OPS', {}],
    ['EMPLOYEE', {}],
    ['CORPORATE_MANAGER', {}],
  ])('never converts a %s account', async (role, extra) => {
    const { svc, db } = build();
    const user = { id: 'u1', role, phone: '+919876543210', ...extra };
    const out = await svc.linkCorporateTenantContact(user);
    expect(out).toBe(user);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('does not touch a driver profile even if the role field drifted', async () => {
    const { svc, db } = build();
    const user = { id: 'u1', role: 'CORPORATE_ADMIN', phone: '+919876543210', driver: { id: 'd1' } };
    await svc.linkCorporateTenantContact(user);
    expect(db.user.update).not.toHaveBeenCalled();
  });

  it('links a corporate admin that has no tenant yet', async () => {
    const { svc, db } = build();
    const out = await svc.linkCorporateTenantContact({ id: 'u1', role: 'CORPORATE_ADMIN', phone: '+919876543210' });
    expect(db.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ corporateTenantId: 't1', corporateRole: 'CORP_SUPER_ADMIN' }) }),
    );
    expect(out.corporateTenantId).toBe('t1');
  });

  it('leaves an already-linked user alone', async () => {
    const { svc, db } = build();
    const user = { id: 'u1', role: 'CORPORATE_ADMIN', corporateTenantId: 'other' };
    expect(await svc.linkCorporateTenantContact(user)).toBe(user);
    expect(db.corporateTenant.findFirst).not.toHaveBeenCalled();
  });
});
