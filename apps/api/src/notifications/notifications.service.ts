import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PushService } from './push.service';

export type NotificationType =
  | 'PLACE_APPROVED'
  | 'PLACE_REJECTED'
  | 'REVIEW_REPLY'
  | 'REVIEW_HELPFUL'
  | 'CHANGE_REQUEST_RESOLVED'
  | 'TRUST_LEVEL_UP'
  | 'SYSTEM';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly push: PushService,
  ) {}

  /**
   * In-app bildirim kaydı + (tercih açıksa) push gönderimi.
   * Metinler locale bağımsız anahtar olarak saklanır; istemci yerelleştirir (docs/02 §12).
   */
  async notify(
    userId: string,
    type: NotificationType,
    payload?: Record<string, unknown>,
  ): Promise<void> {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        titleKey: `notification.${type}.title`,
        bodyKey: `notification.${type}.body`,
        payloadJson: (payload ?? {}) as Prisma.InputJsonValue,
      },
    });

    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (profile?.pushEnabled !== false) {
      await this.push.sendToUser(userId, {
        titleKey: notification.titleKey,
        bodyKey: notification.bodyKey,
        data: { notificationId: notification.id, type },
      });
    }
  }

  async list(userId: string, unreadOnly: boolean, page: number, pageSize: number) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    };
    const [total, unread, items] = await this.prisma.$transaction([
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      total,
      unreadCount: unread,
      page,
      pageSize,
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        titleKey: n.titleKey,
        bodyKey: n.bodyKey,
        payload: n.payloadJson,
        readAt: n.readAt,
        createdAt: n.createdAt,
      })),
    };
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({ where: { id, userId } });
    if (!notification) throw new NotFoundException('NOTIFICATION_NOT_FOUND');
    await this.prisma.notification.update({
      where: { id },
      data: { readAt: notification.readAt ?? new Date() },
    });
    return { read: true };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  async registerDevice(
    userId: string,
    dto: { platform: 'IOS' | 'ANDROID'; fcmToken: string; deviceId?: string },
  ) {
    const device = await this.prisma.deviceToken.upsert({
      where: { userId_fcmToken: { userId, fcmToken: dto.fcmToken } },
      create: {
        userId,
        platform: dto.platform,
        fcmToken: dto.fcmToken,
        deviceId: dto.deviceId ?? null,
      },
      update: { lastSeenAt: new Date(), revokedAt: null, deviceId: dto.deviceId ?? null },
    });
    return { id: device.id, platform: device.platform };
  }

  async revokeDevice(userId: string, id: string) {
    const result = await this.prisma.deviceToken.updateMany({
      where: { id, userId },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException('DEVICE_TOKEN_NOT_FOUND');
    return { revoked: true };
  }

  async getPreferences(userId: string) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    return {
      pushEnabled: profile?.pushEnabled ?? true,
      // E-posta bildirimleri dokümana göre sonraki faz; tercih alanı hazır
      emailEnabled: profile?.emailNotificationsEnabled ?? false,
    };
  }

  async updatePreferences(userId: string, dto: { pushEnabled?: boolean; emailEnabled?: boolean }) {
    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        ...(dto.pushEnabled !== undefined && { pushEnabled: dto.pushEnabled }),
        ...(dto.emailEnabled !== undefined && { emailNotificationsEnabled: dto.emailEnabled }),
      },
    });
    return this.getPreferences(userId);
  }
}
