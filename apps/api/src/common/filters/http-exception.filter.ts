import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '@adhocx/contracts';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'An unexpected internal error occurred';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as Record<string, unknown>;
        message = (resObj.message as string) || exception.message;
        code = (resObj.error as string) || HttpStatus[status] || 'HTTP_ERROR';
        details = resObj.details || (Array.isArray(resObj.message) ? resObj.message : undefined);
      }
    } else if (exception instanceof Error) {
      if ((exception as any).name === 'InvalidStateTransitionError') {
        status = HttpStatus.BAD_REQUEST;
        code = 'INVALID_STATE_TRANSITION';
        message = exception.message;
      } else {
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        code = 'INTERNAL_SERVER_ERROR';
        message = 'An unexpected internal error occurred. Please try again shortly.';
        this.logger.error(`Unhandled Exception: ${exception.message}`, exception.stack);
      }
    }

    if (status >= 500) {
      message = 'An unexpected internal error occurred. Please try again shortly.';
      details = undefined;
    }

    const displayMessage = Array.isArray(details)
      ? details.join('. ')
      : Array.isArray(message)
        ? (message as string[]).join('. ')
        : message;

    const errorPayload: ApiResponse = {
      success: false,
      error: {
        code,
        message: displayMessage,
        details,
      },
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorPayload);
  }
}
