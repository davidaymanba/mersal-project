import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { UserRole } from '@prisma/client';
import { IS_PUBLIC, ROLES, type AuthedRequest } from '../common/auth-user';
import { forbidden, unauthorized } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { TokenService } from './token.service';

export const ACCESS_COOKIE = 'mersal_at';
export const REFRESH_COOKIE = 'mersal_rt';

function extractToken(req: AuthedRequest): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return (req.cookies as Record<string, string> | undefined)?.[ACCESS_COOKIE];
}

/**
 * Global guard. Accepts a Bearer token (mobile) or the httpOnly access cookie (web).
 * On @Public() routes a valid token still populates req.user.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (context.getType() !== 'http') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    const req = context.switchToHttp().getRequest<AuthedRequest>();
    const token = extractToken(req);

    const deny = (): boolean => {
      if (isPublic) return true;
      throw unauthorized('unauthorized', 'Authentication required');
    };
    if (!token) return deny();

    const payload = await this.tokens.verifyAccess(token).catch(() => null);
    if (!payload) return deny();

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return deny();
    if (user.status !== 'ACTIVE') {
      if (isPublic) return true;
      throw forbidden('account_suspended', 'This account is suspended');
    }

    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
      locale: user.locale,
      emailVerified: !!user.emailVerifiedAt,
      phoneVerified: !!user.phoneVerifiedAt,
      travellerStatus: user.travellerStatus,
    };
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    const user = context.switchToHttp().getRequest<AuthedRequest>().user;
    if (user && roles.includes(user.role)) return true;
    throw forbidden('forbidden', 'You do not have access to this resource');
  }
}
