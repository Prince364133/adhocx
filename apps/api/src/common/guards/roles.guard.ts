import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@adhocx/contracts';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.role) {
      throw new ForbiddenException('Access denied: unauthenticated or invalid user role');
    }

    const userRoleStr = String(user.role).trim().toUpperCase();
    
    // ADMIN has unrestricted superuser access
    if (userRoleStr === 'ADMIN' || userRoleStr === UserRole.ADMIN) {
      return true;
    }

    // Normalize user role synonyms: USER / VENDOR / CUSTOMER / BOOKER
    const isUserVendor = userRoleStr === 'VENDOR' || userRoleStr === 'USER' || userRoleStr === 'CUSTOMER' || userRoleStr === 'BOOKER';
    const isDriver = userRoleStr === 'DRIVER';

    const hasRole = requiredRoles.some((reqRole) => {
      const reqRoleStr = String(reqRole).trim().toUpperCase();
      if (reqRoleStr === userRoleStr) return true;
      if ((reqRoleStr === 'VENDOR' || reqRoleStr === 'USER') && isUserVendor) return true;
      if (reqRoleStr === 'DRIVER' && isDriver) return true;
      return false;
    });

    if (!hasRole) {
      throw new ForbiddenException(`Access denied: required role (${requiredRoles.join(', ')})`);
    }

    return true;
  }
}

