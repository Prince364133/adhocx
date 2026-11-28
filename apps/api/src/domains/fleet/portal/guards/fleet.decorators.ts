import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { FleetAdminRole } from '@adhocx/contracts';

export const FLEET_ROLES_KEY = 'fleet_roles';
export const FleetRoles = (...roles: FleetAdminRole[]) =>
  SetMetadata(FLEET_ROLES_KEY, roles);

export const FLEET_PERMISSIONS_KEY = 'fleet_permissions';
export const FleetPermissions = (...permissions: string[]) =>
  SetMetadata(FLEET_PERMISSIONS_KEY, permissions);

export interface FleetRequestContext {
  userId: string;
  fleetId: string;
  role: string;
  permissions: string[];
  fullName: string;
}

export const CurrentFleetUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): FleetRequestContext | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.fleetContext;
  },
);
