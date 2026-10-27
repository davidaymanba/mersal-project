import { Injectable } from '@nestjs/common';
import {
  paginate,
  type NotificationItem,
  type NotificationsPage,
  type NotificationsQuerySchema,
} from '@mersal/shared';
import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import { AppConfig } from '../config/config.module';
import { MailService } from '../mail/mail.service';
import type { MailTemplate } from '../mail/templates';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeGateway } from '../realtime/realtime.gateway';

type NotificationsQuery = z.output<typeof NotificationsQuerySchema>;

export interface NotifyOptions {
  /** Path inside the web app, e.g. /app/shipments/abc. */
  link?: string;
  /** Also send an email using this template (rendered in the user's locale). */
  email?: { template: MailTemplate; vars?: Record<string, string>; ctaLabel?: string };
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly config: AppConfig,
    private readonly realtime: RealtimeGateway,
  ) {}

  /**
   * Creates an in-app notification. `type` is an i18n key the client renders with `data`
   * (e.g. "verification.approved"), so notifications appear in the reader's language.
   */
  async notify(
    userId: string,
    type: string,
    data: Record<string, unknown> = {},
    options: NotifyOptions = {},
  ) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, data: data as Prisma.InputJsonValue, link: options.link },
    });
    this.realtime.toUser(userId, 'notification', notification);

    if (options.email) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        const url = options.link
          ? `${this.config.env.WEB_ORIGIN}/${user.locale}${options.link}`
          : undefined;
        const sent = await this.mail.send({
          to: user.email,
          template: options.email.template,
          locale: user.locale,
          vars: { name: user.firstName, ...options.email.vars },
          cta: url && options.email.ctaLabel ? { label: options.email.ctaLabel, url } : undefined,
        });
        if (sent) {
          await this.prisma.notification.update({
            where: { id: notification.id },
            data: { emailedAt: new Date() },
          });
        }
      }
    }
    return notification;
  }

  async notifyAdmins(
    type: string,
    data: Record<string, unknown> = {},
    link?: string,
  ): Promise<void> {
    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN', status: 'ACTIVE' },
      select: { id: true },
    });
    await this.prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        type,
        data: data as Prisma.InputJsonValue,
        link,
      })),
    });
    for (const admin of admins)
      this.realtime.toUser(admin.id, 'notification', { type, data, link });
  }

  async list(userId: string, query: NotificationsQuery): Promise<NotificationsPage> {
    const where = { userId, ...(query.filter === 'unread' && { readAt: null }) };
    const [items, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return {
      ...paginate(
        items.map((n) => ({
          id: n.id,
          type: n.type,
          data: n.data as NotificationItem['data'],
          link: n.link,
          readAt: n.readAt?.toISOString() ?? null,
          createdAt: n.createdAt.toISOString(),
        })),
        total,
        query,
      ),
      unread,
    };
  }

  async markRead(userId: string, id: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
