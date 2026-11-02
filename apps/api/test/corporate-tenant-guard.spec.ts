import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { CorporateTenantGuard } from '../src/common/guards/corporate-tenant.guard';

describe('CorporateTenantGuard (Multi-Tenant Isolation)', () => {
  let guard: CorporateTenantGuard;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      corporateTenant: {
        findUnique: jest.fn(),
      },
    };
    guard = new CorporateTenantGuard(mockDb);
  });

  function createMockContext(headers: any = {}, query: any = {}, body: any = {}, user: any = null): ExecutionContext {
    const request = {
      headers,
      query,
      body,
      user,
      corporateTenant: null as any,
    };

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('should throw UnauthorizedException when no tenant ID is present in headers, query, or body', async () => {
    const context = createMockContext();
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw ForbiddenException when tenant is not found in database', async () => {
    const context = createMockContext({ 'x-corporate-tenant-id': 'tenant-invalid' });
    mockDb.corporateTenant.findUnique.mockResolvedValue(null);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when tenant is SUSPENDED or INACTIVE', async () => {
    const context = createMockContext({ 'x-corporate-tenant-id': 'tenant-suspended' });
    mockDb.corporateTenant.findUnique.mockResolvedValue({
      id: 'tenant-suspended',
      name: 'Suspended Corp',
      status: 'SUSPENDED',
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should allow access and bind tenant to request when tenant is ACTIVE', async () => {
    const context = createMockContext({ 'x-corporate-tenant-id': 'tenant-active' });
    const mockTenant = {
      id: 'tenant-active',
      name: 'Acme Technologies',
      status: 'ACTIVE',
      offices: [{ id: 'off-1', code: 'HYD-HQ', name: 'Cyber Towers' }],
    };
    mockDb.corporateTenant.findUnique.mockResolvedValue(mockTenant);

    const canActivate = await guard.canActivate(context);
    expect(canActivate).toBe(true);

    const req = context.switchToHttp().getRequest();
    expect(req.corporateTenant).toEqual(mockTenant);
  });
});
