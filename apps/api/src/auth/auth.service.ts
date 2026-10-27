import { Injectable } from '@nestjs/common';
import type { AuthResponse, MeResponse } from '@mersal/shared';
import { Prisma, type User } from '@prisma/client';
import type { z } from 'zod';
import type {
  ForgotPasswordSchema,
  LoginSchema,
  RegisterSchema,
  ResetPasswordSchema,
} from '@mersal/shared';
import { AuditService } from '../audit/audit.service';
import { conflict, forbidden, notFound, unauthorized } from '../common/errors';
import type { RequestMeta } from '../common/request-meta';
import { AppConfig } from '../config/config.module';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../mail/sms.service';
import { PrismaService } from '../prisma/prisma.service';
import { toMe } from '../users/user.mapper';
import { OneTimeCodeService } from './one-time-code.service';
import { hashPassword, verifyPassword } from './password';
import { TokenService, type IssuedTokens } from './token.service';

type RegisterInput = z.output<typeof RegisterSchema>;
type LoginInput = z.output<typeof LoginSchema>;

export interface SessionResult {
  body: AuthResponse;
  tokens: IssuedTokens;
}

// Compared against when the email is unknown so login timing does not reveal accounts.
const DUMMY_HASH =
  'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly codes: OneTimeCodeService,
    private readonly mail: MailService,
    private readonly sms: SmsService,
    private readonly audit: AuditService,
    private readonly config: AppConfig,
  ) {}

  async register(input: RegisterInput, meta: RequestMeta): Promise<SessionResult> {
    let user: User;
    try {
      user = await this.prisma.user.create({
        data: {
          email: input.email,
          passwordHash: await hashPassword(input.password),
          firstName: input.firstName,
          lastName: input.lastName,
          locale: input.locale,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw conflict('email_taken', 'An account already exists with this email');
      }
      throw error;
    }

    await this.audit.record({
      actorId: user.id,
      actorType: 'USER',
      action: 'user.register',
      entityType: 'User',
      entityId: user.id,
      meta,
    });
    const { devCode } = await this.sendEmailCode(user);
    const session = await this.session(user, meta);
    return { ...session, body: { ...session.body, devCode } };
  }

  async login(input: LoginInput, meta: RequestMeta): Promise<SessionResult> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    const valid = await verifyPassword(input.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid)
      throw unauthorized('invalid_credentials', 'Email or password is incorrect');
    if (user.status !== 'ACTIVE') throw forbidden('account_suspended', 'This account is suspended');

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });
    await this.audit.record({
      actorId: user.id,
      actorType: user.role === 'ADMIN' ? 'ADMIN' : 'USER',
      action: 'user.login',
      entityType: 'User',
      entityId: user.id,
      meta,
    });
    return this.session(updated, meta);
  }

  async refresh(refreshToken: string, meta: RequestMeta): Promise<SessionResult> {
    const userId = await this.tokens.consumeRefresh(refreshToken);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'ACTIVE') throw unauthorized('unauthorized', 'Session expired');
    return this.session(user, meta);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (refreshToken) await this.tokens.revoke(refreshToken);
  }

  async me(userId: string): Promise<MeResponse> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound('User not found');
    return toMe(user);
  }

  // ─── Email ───────────────────────────────────────────────────────────────────

  async resendEmailCode(userId: string): Promise<{ devCode?: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.emailVerifiedAt) return {};
    return this.sendEmailCode(user);
  }

  async verifyEmail(userId: string, code: string): Promise<MeResponse> {
    const record = await this.codes.consume(userId, 'EMAIL_VERIFY', code);
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerifiedAt: new Date(), email: record.target },
    });
    return toMe(user);
  }

  private async sendEmailCode(user: User): Promise<{ devCode?: string }> {
    const code = await this.codes.issue(user.id, 'EMAIL_VERIFY', user.email);
    await this.mail.send({
      to: user.email,
      template: 'emailVerification',
      locale: user.locale,
      vars: { name: user.firstName },
      code,
    });
    return this.devCode(code);
  }

  // ─── Phone ───────────────────────────────────────────────────────────────────

  async sendPhoneCode(userId: string, phone: string): Promise<{ devCode?: string }> {
    const owner = await this.prisma.user.findUnique({ where: { phone } });
    if (owner && owner.id !== userId)
      throw conflict('phone_taken', 'This phone number is used by another account');

    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const code = await this.codes.issue(userId, 'PHONE_VERIFY', phone);
    const text =
      {
        en: `Your Mersal code is ${code}`,
        fr: `Votre code Mersal est ${code}`,
        ar: `رمز مرسال الخاص بك هو ${code}`,
      }[user.locale as 'en'] ?? `Your Mersal code is ${code}`;
    await this.sms.send(phone, text);
    return this.devCode(code);
  }

  async verifyPhone(userId: string, code: string): Promise<MeResponse> {
    const record = await this.codes.consume(userId, 'PHONE_VERIFY', code);
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: { phone: record.target, phoneVerifiedAt: new Date() },
      });
      return toMe(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw conflict('phone_taken', 'This phone number is used by another account');
      }
      throw error;
    }
  }

  // ─── Password reset ──────────────────────────────────────────────────────────

  /** Always succeeds from the caller's point of view, so it can't be used to discover accounts. */
  async forgotPassword({ email }: z.output<typeof ForgotPasswordSchema>): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== 'ACTIVE') return;
    const code = await this.codes.issue(user.id, 'PASSWORD_RESET', email).catch(() => null);
    if (code) {
      await this.mail.send({
        to: email,
        template: 'passwordReset',
        locale: user.locale,
        vars: { name: user.firstName },
        code,
      });
    }
  }

  async resetPassword(
    input: z.output<typeof ResetPasswordSchema>,
    meta: RequestMeta,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (!user) throw unauthorized('invalid_code', 'The code is invalid or has expired');
    await this.codes.consume(user.id, 'PASSWORD_RESET', input.code);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await hashPassword(input.password) },
    });
    await this.tokens.revokeAll(user.id);
    await this.audit.record({
      actorId: user.id,
      actorType: 'USER',
      action: 'user.password_reset',
      entityType: 'User',
      entityId: user.id,
      meta,
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async session(user: User, meta: RequestMeta): Promise<SessionResult> {
    const tokens = await this.tokens.issue(user, meta);
    return {
      tokens,
      body: {
        user: toMe(user),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
    };
  }

  /** In demo mode codes are returned to the client so the flow works without SMS/email access. */
  private devCode(code: string): { devCode?: string } {
    return this.config.demoMode ? { devCode: code } : {};
  }
}
