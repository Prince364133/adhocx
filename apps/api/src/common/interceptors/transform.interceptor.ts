import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SSE_METADATA } from '@nestjs/common/constants';
import { ApiResponse } from '@adhocx/contracts';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    // Server-Sent Events: each emitted value is one event ({ data, type }) and must reach the
    // client unchanged, so the JSON envelope is not applied to @Sse() handlers.
    if (Reflect.getMetadata(SSE_METADATA, context.getHandler())) return next.handle() as Observable<any>;
    return next.handle().pipe(
      map((data) => ({
        success: true,
        data,
        timestamp: new Date().toISOString(),
      })),
    );
  }
}
