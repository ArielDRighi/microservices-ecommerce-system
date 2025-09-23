import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  sub: string;
  email: string;
  role: string;
  iat: number;
  exp: number;
}

/**
 * Decorator to get current user from JWT payload
 * Usage: @CurrentUser() user: CurrentUserPayload
 */
export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload;

    return data ? user?.[data] : user;
  },
);
