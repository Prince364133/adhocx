import { HttpException, HttpStatus } from '@nestjs/common';

export class ResourceNotFoundException extends HttpException {
  constructor(resource: string, identifier: string) {
    super(
      {
        error: 'RESOURCE_NOT_FOUND',
        message: `${resource} with identifier '${identifier}' was not found`,
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class InvalidStateOperationException extends HttpException {
  constructor(message: string, details?: unknown) {
    super(
      {
        error: 'INVALID_STATE_OPERATION',
        message,
        details,
      },
      HttpStatus.CONFLICT,
    );
  }
}

export class CapacityExceededException extends HttpException {
  constructor(message: string = 'Requirement capacity already fully satisfied') {
    super(
      {
        error: 'CAPACITY_EXCEEDED',
        message,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class UnauthorizedActionException extends HttpException {
  constructor(message: string = 'You are not authorized to perform this operation on this resource') {
    super(
      {
        error: 'FORBIDDEN_OPERATION',
        message,
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
