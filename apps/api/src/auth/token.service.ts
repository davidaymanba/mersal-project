import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { UserRole } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { parseDurationSeconds } from '../common/duration';
import { unauthorized } from '../common/errors';
import type { RequestMeta } from '../common/request-meta';
import { AppConfig } from '../config/config.module';
import { PrismaService } from '../prisma/prisma.service';

export interface AccessPayload {
  sub: string;
  role: UserRole;
}

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  accessMaxAgeMs: number;
  refreshMaxAgeMs: number;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/**
 * Short-lived JWT access tokens + opaque, rotating refresh tokens stored as hashes.
 * Re-using a revoked refresh token revokes the whole family (likely theft).
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly config: AppConfig,
  ) {}

  private get accessTtlSeconds(): number {
    return parseDurationSeconds(this.config.env.JWT_ACCESS_TTL);
  }

  private get refreshTtlMs(): number {
    return this.config.env.JWT_REFRESH_TTL_DAYS * 86_400_000;
  }

  verifyAccess(token: string): Promise<AccessPayload> {
    return this.jwt.verifyAsync<AccessPayload>(token, {
      secret: this.config.env.JWT_ACCESS_SECRET,
    });
  }

  async issue(user: { id: string; role: UserRole }, meta: RequestMeta): Promise<IssuedTokens> {
    const accessToken = await this.jwt.signAsync(
      { sub: user.id, role: user.role } satisfies AccessPayload,
      {
        secret: this.config.env.JWT_ACCESS_SECRET,
        expiresIn: this.accessTtlSeconds,
      },
    );
    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + this.refreshTtlMs),
        userAgent: meta.userAgent,
        ip: meta.ip,
      },
    });
    return {
      accessToken,
      refreshToken,
      accessMaxAgeMs: this.accessTtlSeconds * 1000,
      refreshMaxAgeMs: this.refreshTtlMs,
    };
  }

  /** Validates and revokes a refresh token, returning its owner. */
  async consumeRefresh(token: string): Promise<string> {
    const record = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: sha256(token) },
    });
    if (!record || record.expiresAt < new Date()) {
      throw unauthorized('unauthorized', 'Session expired');
    }
    if (record.revokedAt) {
      await this.revokeAll(record.userId);
      throw unauthorized('unauthorized', 'Session expired');
    }
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    return record.userId;
  }

  async revoke(token: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
