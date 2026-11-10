import { CallHandler, ExecutionContext, HttpException, HttpStatus, Injectable, NestInterceptor, Optional } from '@nestjs/common';
import { Observable } from 'rxjs';
import { UserRole } from '@adhocx/contracts';
import { RedisService } from '../../redis/redis.service';

export const DIGIO_RATE_LIMITED = 'DIGIO_RATE_LIMITED';

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/**
 * Per-user, per-route limit on Digio calls. Every Digio verification is billed, so a retry loop or
 * an abusive account must not be able to run up the bill. Runs as an interceptor (after the route's
 * JwtAuthGuard has set `req.user`). Reads (GET), unauthenticated routes (the webhook) and admins
 * are exempt. Limits: DIGIO_RATE_LIMIT_PER_HOUR (default 10) and DIGIO_RATE_LIMIT_PER_DAY
 * (default 30) per user per route. Falls back to RedisService's in-memory store when Redis is down
 * (per-instance limits rather than none).
 */
@Injectable()
export class DigioRateLimitInterceptor implements NestInterceptor {
  constructor(@Optional() private readonly redis?: RedisService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest();
    const user = req?.user;
    const method = String(req?.method ?? '').toUpperCase();
    if (!this.redis || !user?.id || method === 'GET' || String(user.role).toUpperCase() === UserRole.ADMIN) {
      return next.handle();
    }
    const route = String(req.route?.path ?? req.path ?? req.url ?? '').split('?')[0];
    const base = `digio:${user.id}:${method}:${route}`;
    const windows: Array<[string, number, number]> = [
      ['h', envInt('DIGIO_RATE_LIMIT_PER_HOUR', 10), 3600],
      ['d', envInt('DIGIO_RATE_LIMIT_PER_DAY', 30), 86_400],
    ];
    for (const [suffix, limit, windowSec] of windows) {
      const res = await this.redis.checkRateLimit(`${base}:${suffix}`, limit, windowSec);
      if (!res.allowed) {
        const retryAfterSec = res.resetAfter;
        context.switchToHttp().getResponse()?.setHeader?.('Retry-After', String(retryAfterSec));
        throw new HttpException(
          {
            message: `Too many verification attempts. Please try again in ${Math.ceil(retryAfterSec / 60)} minute(s).`,
            error: DIGIO_RATE_LIMITED,
            details: { retryAfterSec, limit, window: suffix === 'h' ? 'HOUR' : 'DAY' },
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
    return next.handle();
  }
}
