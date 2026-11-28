import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FleetAdminRole } from '@adhocx/contracts';
import { FLEET_PERMISSIONS_KEY, FLEET_ROLES_KEY } from './fleet.decorators';

@Injectable()
export class FleetRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<FleetAdminRole[]>(
      FLEET_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      FLEET_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest();
    const fleetCtx = request.fleetContext;

    if (!fleetCtx) {
      throw new ForbiddenException({
        errorCode: 'FLEET_CONTEXT_MISSING',
        message: 'Fleet context could not be verified.',
      });
    }

    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(fleetCtx.role as FleetAdminRole)) {
        throw new ForbiddenException({
          errorCode: 'INSUFFICIENT_FLEET_ROLE',
          message: 'You do not have the required fleet role for this action.',
        });
      }
    }

    if (
      requiredPermissions &&
      requiredPermissions.length > 0 &&
      fleetCtx.role !== FleetAdminRole.FLEET_OWNER
    ) {
      const userPerms = new Set<string>(fleetCtx.permissions || []);
      const hasAll = requiredPermissions.every((p) => userPerms.has(p));
      if (!hasAll) {
        throw new ForbiddenException({
          errorCode: 'INSUFFICIENT_FLEET_PERMISSION',
          message: 'You do not have permission to perform this fleet operation.',
        });
      }
    }

    return true;
  }
}
