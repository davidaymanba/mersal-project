import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  ForgotPasswordSchema,
  LoginSchema,
  RegisterSchema,
  ResetPasswordSchema,
  SendPhoneCodeSchema,
  VerifyCodeSchema,
} from '@mersal/shared';
import type { Request, Response } from 'express';
import type { z } from 'zod';
import { CurrentUser, Public, type AuthUser } from '../common/auth-user';
import { unauthorized } from '../common/errors';
import { requestMeta } from '../common/request-meta';
import { ApiZodBody, ZodBody } from '../common/zod';
import { AppConfig } from '../config/config.module';
import { AuthService, type SessionResult } from './auth.service';
import { ACCESS_COOKIE, REFRESH_COOKIE } from './guards';

const STRICT = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: AppConfig,
  ) {}

  @Public()
  @Throttle(STRICT)
  @Post('register')
  @ApiZodBody(RegisterSchema)
  async register(
    @ZodBody(RegisterSchema) body: z.output<typeof RegisterSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.withCookies(res, await this.auth.register(body, requestMeta(req)));
  }

  @Public()
  @Throttle(STRICT)
  @Post('login')
  @HttpCode(200)
  @ApiZodBody(LoginSchema)
  async login(
    @ZodBody(LoginSchema) body: z.output<typeof LoginSchema>,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.withCookies(res, await this.auth.login(body, requestMeta(req)));
  }

  /** Rotates the refresh token. Reads the httpOnly cookie, or `refreshToken` in the body (mobile). */
  @Public()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Body() body: { refreshToken?: string } | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = (req.cookies as Record<string, string>)[REFRESH_COOKIE] ?? body?.refreshToken;
    if (!token) throw unauthorized('unauthorized', 'Session expired');
    try {
      return this.withCookies(res, await this.auth.refresh(token, requestMeta(req)));
    } catch (error) {
      this.clearCookies(res);
      throw error;
    }
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  async logout(
    @Body() body: { refreshToken?: string } | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.auth.logout(
      (req.cookies as Record<string, string>)[REFRESH_COOKIE] ?? body?.refreshToken,
    );
    this.clearCookies(res);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @ApiBearerAuth()
  @Throttle(STRICT)
  @Post('email/resend')
  @HttpCode(200)
  resendEmail(@CurrentUser() user: AuthUser) {
    return this.auth.resendEmailCode(user.id);
  }

  @ApiBearerAuth()
  @Throttle(STRICT)
  @Post('email/verify')
  @HttpCode(200)
  @ApiZodBody(VerifyCodeSchema)
  verifyEmail(
    @CurrentUser() user: AuthUser,
    @ZodBody(VerifyCodeSchema) body: z.output<typeof VerifyCodeSchema>,
  ) {
    return this.auth.verifyEmail(user.id, body.code);
  }

  @ApiBearerAuth()
  @Throttle(STRICT)
  @Post('phone/send')
  @HttpCode(200)
  @ApiZodBody(SendPhoneCodeSchema)
  sendPhone(
    @CurrentUser() user: AuthUser,
    @ZodBody(SendPhoneCodeSchema) body: z.output<typeof SendPhoneCodeSchema>,
  ) {
    return this.auth.sendPhoneCode(user.id, body.phone);
  }

  @ApiBearerAuth()
  @Throttle(STRICT)
  @Post('phone/verify')
  @HttpCode(200)
  @ApiZodBody(VerifyCodeSchema)
  verifyPhone(
    @CurrentUser() user: AuthUser,
    @ZodBody(VerifyCodeSchema) body: z.output<typeof VerifyCodeSchema>,
  ) {
    return this.auth.verifyPhone(user.id, body.code);
  }

  @Public()
  @Throttle(STRICT)
  @Post('password/forgot')
  @HttpCode(204)
  @ApiZodBody(ForgotPasswordSchema)
  async forgot(@ZodBody(ForgotPasswordSchema) body: z.output<typeof ForgotPasswordSchema>) {
    await this.auth.forgotPassword(body);
  }

  @Public()
  @Throttle(STRICT)
  @Post('password/reset')
  @HttpCode(204)
  @ApiZodBody(ResetPasswordSchema)
  async reset(
    @ZodBody(ResetPasswordSchema) body: z.output<typeof ResetPasswordSchema>,
    @Req() req: Request,
  ) {
    await this.auth.resetPassword(body, requestMeta(req));
  }

  private withCookies(res: Response, result: SessionResult) {
    const secure = this.config.isProduction;
    res.cookie(ACCESS_COOKIE, result.tokens.accessToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: result.tokens.accessMaxAgeMs,
    });
    res.cookie(REFRESH_COOKIE, result.tokens.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: result.tokens.refreshMaxAgeMs,
    });
    return result.body;
  }

  private clearCookies(res: Response) {
    res.clearCookie(ACCESS_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/' });
  }
}
