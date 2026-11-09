import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { Optional } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';

/** Server-Sent Events endpoints (`.../live-stream`) are the only routes that accept `?access_token=`. */
export function allowsQueryToken(request: any): boolean {
  if (String(request?.method ?? '').toUpperCase() !== 'GET') return false;
  const path = String(request?.path ?? request?.url ?? '').split('?')[0];
  return /\/live-stream\/?$/.test(path);
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Optional() private redisService?: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let token: string | undefined;

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (allowsQueryToken(request)) {
      // Browser EventSource cannot send headers. Accepted only on live-stream (SSE) GETs so tokens
      // do not end up in URLs (and access logs) for the rest of the API.
      const q = request.query?.access_token ?? request.query?.token;
      if (q) token = String(q);
    }

    if (!token) {
      throw new UnauthorizedException('Missing or invalid Authorization header or token query parameter');
    }
    try {
      if (this.redisService) {
        const isBlacklisted = await this.redisService.isTokenBlacklisted(token);
        if (isBlacklisted) {
          throw new UnauthorizedException('Token has been revoked');
        }
      }

      const secret = this.configService.get<string>('auth.jwtAccessSecret') || process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'adhocx_default_jwt_secret_dev_2026';
      const payload = await this.jwtService.verifyAsync(token, { secret });
      const userId = payload.id || payload.sub;

      if (this.redisService && userId) {
        const isRevoked = await this.redisService.isUserRevoked(userId);
        if (isRevoked) {
          throw new UnauthorizedException('User account has been suspended or session revoked');
        }
      }

      request.user = {
        ...payload,
        id: userId,
      };
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Token is invalid or expired');
    }
  }
}
