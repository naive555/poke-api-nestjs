import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IAuthPayload } from './auth.interface';

export const GetAuthPayload = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): IAuthPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
