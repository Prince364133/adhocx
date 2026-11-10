import { createSecretKey, KeyObject } from 'crypto';
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { Optional } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { resolveJwtSecret } from '../../config/auth.config';
import { StreamTicketService } from '../../redis/stream-ticket.service';
import { hashToken } from '../../redis/auth-revocation';

/**
 * Server-Sent Events endpoints (`.../live-stream`) are the only routes that accept a credential in
 * the URL, and only a single-use `?ticket=` (see StreamTicketService), never the access token.
 */
export function isLiveStreamRequest(request: any): boolean {
  if (String(request?.method ?? '').toUpperCase() !== 'GET') return false;
  const path = String(request?.path ?? request?.url ?? '').split('?')[0];
  return /\/live-stream\/?$/.test(path);
}
/** @deprecated name kept for callers; query credentials are tickets now. */
export const allowsQueryToken = isLiveStreamRequest;

/**
 * jsonwebtoken turns a string secret into a key on EVERY verify, first trying createPublicKey (which
 * throws for an HMAC secret) and then createSecretKey. Under load that exception path was a visible
 * share of API CPU. A KeyObject is used as-is, so build it once per secret.
 */
const hmacKeys = new Map<string, KeyObject>();
function hmacKey(secret: string): KeyObject {
  let key = hmacKeys.get(secret);
  if (!key) {
    key = createSecretKey(Buffer.from(secret));
    hmacKeys.set(secret, key);
  }
  return key;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Optional() private redisService?: RedisService,
    @Optional() private streamTickets?: StreamTicketService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let token: string | undefined;

    const authHeader = request.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (isLiveStreamRequest(request) && request.query?.ticket) {
      // Browser EventSource cannot send headers: it presents a ticket bought with the access token.
      return this.authenticateTicket(request, String(request.query.ticket));
    }

    if (!token) {
      throw new UnauthorizedException('Missing or invalid Authorization header');
    }
    try {
      if (this.redisService) {
        const isBlacklisted = await this.redisService.isTokenBlacklisted(token);
        if (isBlacklisted) {
          throw new UnauthorizedException('Token has been revoked');
        }
      }

      const secret = this.configService.get<string>('auth.jwtAccessSecret') || resolveJwtSecret('access');
      const payload = await this.jwtService.verifyAsync(token, { secret: hmacKey(secret) as any });
      const userId = payload.id || payload.sub;

      if (this.redisService && userId) {
        const isRevoked = await this.redisService.isUserRevoked(userId);
        if (isRevoked) {
          throw new UnauthorizedException('User account has been suspended or session revoked');
        }
        if (typeof this.redisService.getMinTokenIssuedAt === 'function' && payload.iat != null) {
          const minIat = await this.redisService.getMinTokenIssuedAt(userId);
          if (minIat != null && Number(payload.iat) < minIat) {
            throw new UnauthorizedException('Session expired after password update. Please sign in again.');
          }
        }
      }

      request.user = {
        ...payload,
        id: userId,
      };
      // Raw token for the stream-ticket endpoint; its hash lets live streams match a logout.
      request.accessToken = token;
      request.streamTokenHash = hashToken(token);
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Token is invalid or expired');
    }
  }

  private async authenticateTicket(request: any, ticket: string): Promise<boolean> {
    const claims = this.streamTickets ? await this.streamTickets.consume(ticket).catch(() => null) : null;
    if (!claims) throw new UnauthorizedException('Stream ticket is invalid, expired or already used');
    const { tokenHash, ...payload } = claims as Record<string, any>;
    if (Number(payload.exp) > 0 && Number(payload.exp) * 1000 <= Date.now()) {
      throw new UnauthorizedException('Token is invalid or expired');
    }
    const userId = payload.id || payload.sub;
    if (this.redisService && userId && (await this.redisService.isUserRevoked(userId))) {
      throw new UnauthorizedException('User account has been suspended or session revoked');
    }
    request.user = { ...payload, id: userId };
    request.streamTokenHash = tokenHash;
    return true;
  }
}
