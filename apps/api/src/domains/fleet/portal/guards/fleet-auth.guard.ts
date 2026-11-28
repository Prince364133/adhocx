import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { resolveJwtSecret } from '../../../../config/auth.config';
import { DatabaseService } from '../../../../database/database.service';

@Injectable()
export class FleetAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly db: DatabaseService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        errorCode: 'MISSING_AUTH_TOKEN',
        message: 'Authorization Bearer token is required.',
      });
    }

    const token = authHeader.slice('Bearer '.length).trim();
    if (!token) {
      throw new UnauthorizedException({
        errorCode: 'INVALID_AUTH_TOKEN',
        message: 'Authorization Bearer token is empty.',
      });
    }

    const secret =
      this.configService.get<string>('auth.jwtAccessSecret') ||
      resolveJwtSecret('access');

    let payload: { sub?: string; fleetId?: string; role?: string; tokenType?: string };
    try {
      payload = await this.jwtService.verifyAsync(token, { secret });
    } catch {
      throw new UnauthorizedException({
        errorCode: 'INVALID_OR_EXPIRED_TOKEN',
        message: 'Your session token is invalid or has expired.',
      });
    }

    if (!payload.sub || !payload.fleetId) {
      throw new UnauthorizedException({
        errorCode: 'INVALID_FLEET_TOKEN',
        message: 'Token does not carry a valid fleet identity.',
      });
    }

    const adminUser = await this.db.fleetAdminUser.findUnique({
      where: { id: payload.sub },
      include: { fleet: { select: { id: true, status: true } } },
    });

    if (!adminUser || adminUser.fleetId !== payload.fleetId) {
      throw new UnauthorizedException({
        errorCode: 'FLEET_USER_NOT_FOUND',
        message: 'Fleet account is invalid or no longer exists.',
      });
    }

    if (adminUser.status !== 'ACTIVE') {
      throw new ForbiddenException({
        errorCode: 'FLEET_USER_INACTIVE',
        message: 'Your fleet user account is inactive.',
      });
    }

    if (adminUser.fleet.status !== 'ACTIVE') {
      throw new ForbiddenException({
        errorCode: 'FLEET_INACTIVE',
        message: 'This fleet account is currently inactive.',
      });
    }

    request.fleetContext = {
      userId: adminUser.id,
      fleetId: adminUser.fleetId,
      role: adminUser.role,
      permissions: Array.isArray(adminUser.permissions)
        ? (adminUser.permissions as string[])
        : [],
      fullName: adminUser.fullName,
    };

    return true;
  }
}
