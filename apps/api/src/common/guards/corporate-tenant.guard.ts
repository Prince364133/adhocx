import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

/**
 * CorporateTenantGuard enforces multi-tenant boundary isolation.
 * Resolves tenant ID from request headers, query parameters, or JWT claims,
 * validates tenant active status, and binds the tenant to request.corporateTenant.
 */
@Injectable()
export class CorporateTenantGuard implements CanActivate {
  constructor(private readonly db: DatabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 1. Resolve tenant ID candidate
    const tenantIdHeader = request.headers['x-corporate-tenant-id'];
    const tenantIdQuery = request.query?.tenantId;
    const tenantIdBody = request.body?.tenantId;
    const tenantIdUser = user?.tenantId;

    const tenantId = tenantIdHeader || tenantIdQuery || tenantIdBody || tenantIdUser;

    if (!tenantId) {
      throw new UnauthorizedException(
        'Missing corporate tenant context. Provide X-Corporate-Tenant-ID header or tenantId param.',
      );
    }

    // 2. Fetch and validate tenant status
    const tenant = await this.db.corporateTenant.findUnique({
      where: { id: tenantId },
      include: {
        offices: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    if (!tenant) {
      throw new ForbiddenException(`Corporate tenant ${tenantId} not found`);
    }

    if (tenant.status !== 'ACTIVE') {
      throw new ForbiddenException(`Corporate tenant ${tenant.name} is ${tenant.status}`);
    }

    // 3. Bind validated tenant to request
    request.corporateTenant = tenant;
    return true;
  }
}
