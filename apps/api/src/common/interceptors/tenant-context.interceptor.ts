import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tenantStorage } from '../context/tenant.context';

@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantId =
      user?.corporateTenantId ||
      user?.tid ||
      request.headers['x-corporate-tenant-id'] ||
      request.headers['x-tenant-id'];

    if (tenantId) {
      return new Observable((subscriber) => {
        tenantStorage.run(
          {
            tenantId: String(tenantId),
            userId: user?.id,
            role: user?.role,
          },
          () => {
            next.handle().subscribe({
              next: (val) => subscriber.next(val),
              error: (err) => subscriber.error(err),
              complete: () => subscriber.complete(),
            });
          },
        );
      });
    }

    return next.handle();
  }
}

