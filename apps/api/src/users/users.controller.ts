import { Controller, HttpCode, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ChangePasswordSchema, UpdateProfileSchema } from '@mersal/shared';
import type { Request } from 'express';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import { hashPassword, verifyPassword } from '../auth/password';
import { TokenService } from '../auth/token.service';
import { CurrentUser, type AuthUser } from '../common/auth-user';
import { badRequest } from '../common/errors';
import { requestMeta } from '../common/request-meta';
import { ApiZodBody, ZodBody } from '../common/zod';
import { PrismaService } from '../prisma/prisma.service';
import { toMe } from './user.mapper';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users/me')
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  @Patch()
  @ApiZodBody(UpdateProfileSchema)
  async update(
    @CurrentUser() user: AuthUser,
    @ZodBody(UpdateProfileSchema) body: z.output<typeof UpdateProfileSchema>,
  ) {
    return toMe(await this.prisma.user.update({ where: { id: user.id }, data: body }));
  }

  @Post('password')
  @HttpCode(204)
  @ApiZodBody(ChangePasswordSchema)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @ZodBody(ChangePasswordSchema) body: z.output<typeof ChangePasswordSchema>,
    @Req() req: Request,
  ) {
    const record = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await verifyPassword(body.currentPassword, record.passwordHash))) {
      throw badRequest('wrong_password', 'Current password is incorrect');
    }
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(body.newPassword) },
    });
    await this.tokens.revokeAll(user.id);
    await this.audit.record({
      actorId: user.id,
      actorType: 'USER',
      action: 'user.password_change',
      entityType: 'User',
      entityId: user.id,
      meta: requestMeta(req),
    });
  }
}
