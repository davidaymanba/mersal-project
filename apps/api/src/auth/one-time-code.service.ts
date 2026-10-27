import { Injectable } from '@nestjs/common';
import type { OneTimeCode, OneTimeCodePurpose } from '@prisma/client';
import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { badRequest, tooMany } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';

const TTL_MS = 15 * 60_000;
const RESEND_COOLDOWN_MS = 45_000;
const MAX_ATTEMPTS = 5;

const hashCode = (userId: string, code: string) =>
  createHash('sha256').update(`${userId}:${code}`).digest();

/** Six-digit codes for email/phone verification and password reset. Stored hashed. */
@Injectable()
export class OneTimeCodeService {
  constructor(private readonly prisma: PrismaService) {}

  async issue(userId: string, purpose: OneTimeCodePurpose, target: string): Promise<string> {
    const latest = await this.prisma.oneTimeCode.findFirst({
      where: { userId, purpose, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (latest && Date.now() - latest.createdAt.getTime() < RESEND_COOLDOWN_MS) {
      throw tooMany('code_recently_sent', 'Please wait before requesting another code');
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.prisma.$transaction([
      this.prisma.oneTimeCode.updateMany({
        where: { userId, purpose, consumedAt: null },
        data: { consumedAt: new Date() },
      }),
      this.prisma.oneTimeCode.create({
        data: {
          userId,
          purpose,
          target,
          codeHash: hashCode(userId, code).toString('hex'),
          expiresAt: new Date(Date.now() + TTL_MS),
        },
      }),
    ]);
    return code;
  }

  /** Verifies and consumes a code. Returns the record (its `target` is the verified email/phone). */
  async consume(userId: string, purpose: OneTimeCodePurpose, code: string): Promise<OneTimeCode> {
    const record = await this.prisma.oneTimeCode.findFirst({
      where: { userId, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!record) throw badRequest('invalid_code', 'The code is invalid or has expired');
    if (record.attempts >= MAX_ATTEMPTS) {
      throw tooMany('too_many_attempts', 'Too many attempts. Request a new code.');
    }

    const matches = timingSafeEqual(Buffer.from(record.codeHash, 'hex'), hashCode(userId, code));
    if (!matches) {
      await this.prisma.oneTimeCode.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw badRequest('invalid_code', 'The code is invalid or has expired');
    }
    return this.prisma.oneTimeCode.update({
      where: { id: record.id },
      data: { consumedAt: new Date() },
    });
  }
}
