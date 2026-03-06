import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { IAuthPayload } from './auth.interface';

export const GetAuthPayload = createParamDecorator(
  (
    data: keyof IAuthPayload | undefined,
    ctx: ExecutionContext,
  ): IAuthPayload | IAuthPayload[keyof IAuthPayload] => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as IAuthPayload;

    return data ? user[data] : user;
  },
);
