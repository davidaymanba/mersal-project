import { createParamDecorator, SetMetadata, type ExecutionContext } from '@nestjs/common';
import type { UserRole, VerificationStatus } from '@prisma/client';
import type { Request } from 'express';

/** The authenticated user attached to the request by JwtAuthGuard. */
export interface AuthUser {
  id: string;
  role: UserRole;
  email: string;
  locale: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  travellerStatus: VerificationStatus;
}

export type AuthedRequest = Request & { user?: AuthUser };

export const IS_PUBLIC = 'isPublic';
/** Opt a route out of authentication. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES, roles);

export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => {
  const request = ctx.switchToHttp().getRequest<AuthedRequest>();
  return request.user as AuthUser;
});
