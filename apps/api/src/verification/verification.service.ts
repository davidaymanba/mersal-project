import { Injectable } from '@nestjs/common';
import { paginate, type PageQuery, type SubmitVerificationSchema } from '@mersal/shared';
import type { VerificationStatus } from '@prisma/client';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service';
import type { AuthUser } from '../common/auth-user';
import { badRequest, conflict, forbidden, notFound } from '../common/errors';
import type { RequestMeta } from '../common/request-meta';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService, type UploadedFileLike } from '../storage/storage.service';

export interface VerificationFiles {
  documentFront?: UploadedFileLike[];
  documentBack?: UploadedFileLike[];
  selfie?: UploadedFileLike[];
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

const fileUrl = (key: string | null) => (key ? `/files?key=${encodeURIComponent(key)}` : null);

@Injectable()
export class VerificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  async submit(
    user: AuthUser,
    input: z.output<typeof SubmitVerificationSchema>,
    files: VerificationFiles,
    meta: RequestMeta,
  ) {
    if (!user.emailVerified) throw forbidden('email_not_verified', 'Confirm your email first');
    if (!user.phoneVerified)
      throw forbidden('phone_not_verified', 'Confirm your phone number first');
    if (user.travellerStatus === 'PENDING')
      throw conflict('verification_pending', 'A verification is already under review');
    if (user.travellerStatus === 'APPROVED')
      throw conflict('already_verified', 'You are already verified');

    const front = files.documentFront?.[0];
    const selfie = files.selfie?.[0];
    if (!front || !selfie)
      throw badRequest('invalid_file', 'Document front and selfie are required');

    const prefix = `users/${user.id}/kyc`;
    const [documentFrontKey, selfieKey, documentBackKey] = await Promise.all([
      this.storage.save(prefix, front, IMAGE_TYPES),
      this.storage.save(prefix, selfie, IMAGE_TYPES),
      files.documentBack?.[0]
        ? this.storage.save(prefix, files.documentBack[0], IMAGE_TYPES)
        : Promise.resolve(null),
    ]);

    const verification = await this.prisma.$transaction(async (tx) => {
      const created = await tx.identityVerification.create({
        data: { userId: user.id, ...input, documentFrontKey, documentBackKey, selfieKey },
      });
      await tx.user.update({ where: { id: user.id }, data: { travellerStatus: 'PENDING' } });
      return created;
    });

    await this.audit.record({
      actorId: user.id,
      actorType: 'USER',
      action: 'verification.submit',
      entityType: 'IdentityVerification',
      entityId: verification.id,
      meta,
    });
    await this.notifications.notifyAdmins(
      'admin.verificationSubmitted',
      { name: user.email },
      `/admin/verifications/${verification.id}`,
    );
    return this.present(verification);
  }

  async mine(userId: string) {
    const latest = await this.prisma.identityVerification.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return latest ? this.present(latest) : null;
  }

  async list(status: VerificationStatus | undefined, page: PageQuery) {
    const where = status ? { status } : {};
    const [items, total] = await Promise.all([
      this.prisma.identityVerification.findMany({
        where,
        orderBy: { createdAt: status === 'PENDING' ? 'asc' : 'desc' },
        skip: (page.page - 1) * page.pageSize,
        take: page.pageSize,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true, phone: true } },
        },
      }),
      this.prisma.identityVerification.count({ where }),
    ]);
    return paginate(
      items.map((v) => ({ ...this.present(v), user: v.user })),
      total,
      page,
    );
  }

  async get(id: string) {
    const verification = await this.prisma.identityVerification.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            createdAt: true,
          },
        },
        reviewedBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!verification) throw notFound('Verification not found');
    return {
      ...this.present(verification),
      user: verification.user,
      reviewedBy: verification.reviewedBy,
    };
  }

  async approve(adminId: string, id: string, meta: RequestMeta) {
    const verification = await this.requirePending(id);
    await this.prisma.$transaction([
      this.prisma.identityVerification.update({
        where: { id },
        data: { status: 'APPROVED', reviewedById: adminId, reviewedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { travellerStatus: 'APPROVED' },
      }),
    ]);
    await this.audit.record({
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'verification.approve',
      entityType: 'IdentityVerification',
      entityId: id,
      before: { status: 'PENDING' },
      after: { status: 'APPROVED' },
      meta,
    });
    await this.notifications.notify(
      verification.userId,
      'verification.approved',
      {},
      {
        link: '/app/trips',
        email: { template: 'verificationApproved', ctaLabel: 'Mersal' },
      },
    );
    return this.get(id);
  }

  async reject(adminId: string, id: string, reason: string, meta: RequestMeta) {
    const verification = await this.requirePending(id);
    await this.prisma.$transaction([
      this.prisma.identityVerification.update({
        where: { id },
        data: {
          status: 'REJECTED',
          reviewedById: adminId,
          reviewedAt: new Date(),
          rejectionReason: reason,
        },
      }),
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { travellerStatus: 'REJECTED' },
      }),
    ]);
    await this.audit.record({
      actorId: adminId,
      actorType: 'ADMIN',
      action: 'verification.reject',
      entityType: 'IdentityVerification',
      entityId: id,
      before: { status: 'PENDING' },
      after: { status: 'REJECTED', reason },
      meta,
    });
    await this.notifications.notify(
      verification.userId,
      'verification.rejected',
      { reason },
      {
        link: '/app/verification',
        email: { template: 'verificationRejected', vars: { reason } },
      },
    );
    return this.get(id);
  }

  private async requirePending(id: string) {
    const verification = await this.prisma.identityVerification.findUnique({ where: { id } });
    if (!verification) throw notFound('Verification not found');
    if (verification.status !== 'PENDING')
      throw conflict('already_verified', 'This verification was already reviewed');
    return verification;
  }

  private present<
    T extends { documentFrontKey: string; documentBackKey: string | null; selfieKey: string },
  >(v: T) {
    const { documentFrontKey, documentBackKey, selfieKey, ...rest } = v;
    return {
      ...rest,
      files: {
        documentFront: fileUrl(documentFrontKey),
        documentBack: fileUrl(documentBackKey),
        selfie: fileUrl(selfieKey),
      },
    };
  }
}
