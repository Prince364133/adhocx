import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  FleetAdminRole,
  FleetAuthResponseDto,
  FleetAuthUserDto,
  FleetLoginDto,
} from '@adhocx/contracts';
import { verifyPassword } from '../../../../common/utils/password.util';
import { resolveJwtSecret } from '../../../../config/auth.config';
import { DatabaseService } from '../../../../database/database.service';
import { FleetRequestContext } from '../guards/fleet.decorators';

@Injectable()
export class FleetAuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(dto: FleetLoginDto): Promise<FleetAuthResponseDto> {
    const raw = dto.identifier.trim();
    const cleanPhone = raw.replace(/\s+/g, '');
    const digits = cleanPhone.replace(/\D/g, '');
    const phoneVariants = Array.from(
      new Set([
        cleanPhone,
        ...(digits.length >= 10 ? [digits.slice(-10), `+91${digits.slice(-10)}`] : []),
      ]),
    );

    const user = await this.db.fleetAdminUser.findFirst({
      where: {
        OR: [
          { email: raw.toLowerCase() },
          { phone: { in: phoneVariants } },
        ],
      },
      include: { fleet: true },
    });

    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException({
        errorCode: 'INVALID_CREDENTIALS',
        message: 'Invalid email/phone or password.',
      });
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException({
        errorCode: 'FLEET_USER_INACTIVE',
        message: 'Your fleet administrator account is inactive.',
      });
    }

    if (user.fleet.status !== 'ACTIVE') {
      throw new ForbiddenException({
        errorCode: 'FLEET_INACTIVE',
        message: 'This fleet account is currently inactive.',
      });
    }

    await this.db.fleetAdminUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const secret =
      this.configService.get<string>('auth.jwtAccessSecret') ||
      resolveJwtSecret('access');

    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        fleetId: user.fleetId,
        role: user.role,
        tokenType: 'FLEET_PORTAL',
      },
      { secret },
    );

    const userDto: FleetAuthUserDto = {
      id: user.id,
      fleetId: user.fleetId,
      fleetName: user.fleet.name,
      fleetCode: user.fleet.code,
      fullName: user.fullName,
      email: user.email || undefined,
      phone: user.phone,
      role: user.role as FleetAdminRole,
      permissions: Array.isArray(user.permissions)
        ? (user.permissions as string[])
        : [],
    };

    return { accessToken, user: userDto };
  }

  async getMe(fleetCtx: FleetRequestContext): Promise<FleetAuthUserDto> {
    const user = await this.db.fleetAdminUser.findUnique({
      where: { id: fleetCtx.userId },
      include: { fleet: true },
    });

    if (!user || user.fleetId !== fleetCtx.fleetId) {
      throw new UnauthorizedException({
        errorCode: 'FLEET_USER_NOT_FOUND',
        message: 'Fleet user session is no longer valid.',
      });
    }

    return {
      id: user.id,
      fleetId: user.fleetId,
      fleetName: user.fleet.name,
      fleetCode: user.fleet.code,
      fullName: user.fullName,
      email: user.email || undefined,
      phone: user.phone,
      role: user.role as FleetAdminRole,
      permissions: Array.isArray(user.permissions)
        ? (user.permissions as string[])
        : [],
    };
  }
}
