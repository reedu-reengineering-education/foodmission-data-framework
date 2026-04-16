import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export interface CurrentUser {
  id: string;
  keycloakId: string;
}

export function extractCurrentUser(
  data: keyof CurrentUser | undefined,
  ctx: ExecutionContext,
): any {
  const request = ctx.switchToHttp().getRequest();
  const user = request.user;
  if (!user) {
    throw new UnauthorizedException('User not authenticated');
  }
  if (data) {
    return user[data];
  }
  return user;
}

export const CurrentUser = createParamDecorator(extractCurrentUser);
