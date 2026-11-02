import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Parameter decorator to inject the validated CorporateTenant from the request.
 */
export const CurrentTenant = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenant = request.corporateTenant;

    if (!tenant) {
      return null;
    }

    return data ? tenant[data] : tenant;
  },
);
