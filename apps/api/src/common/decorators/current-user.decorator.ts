import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUserDto } from '@adhocx/contracts';

export const CurrentUser = createParamDecorator(
  (data: keyof AuthUserDto | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthUserDto;

    return data ? user?.[data] : user;
  },
);
