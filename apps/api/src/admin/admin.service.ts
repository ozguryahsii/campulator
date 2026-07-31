import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TrustLevel } from '@prisma/client';
import { CampScoreService } from '../campscore/campscore.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { toPhotoResponse } from '../storage/photo-url';

/** Desteklenen içerik dilleri (docs/06 §Yerelleştirme) */
const LOCALES = ['tr', 'en'];

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly campScore: CampScoreService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Her moderasyon ve skor etkileyen işlem audit log'a yazılır (docs/06) */
  private async audit(
    actorUserId: string,
    action: string,
    entityType: string,
    entityId: string,
    oldValue?: unknown,
    newValue?: unknown,
  ) {
    await this.prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType,
        entityId,
        oldValueJson: (oldValue ?? null) as Prisma.InputJsonValue,
        newValueJson: (newValue ?? null) as Prisma.InputJsonValue,
      },
    });
  }

  async dashboard() {
    const [
      pendingModeration,
      pendingPlaces,
      changeRequests,
      openReports,
      activeUsers,
      reviews,
      photos,
      pendingPhotos,
      verifiedBusinesses,
      publishedPlaces,
    ] = await this.prisma.$transaction([
      this.prisma.moderationItem.count({ where: { status: 'PENDING' } }),
      this.prisma.place.count({ where: { publicationStatus: 'PENDING_REVIEW' } }),
      this.prisma.changeRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.report.count({ where: { status: 'OPEN' } }),
      this.prisma.user.count({ where: { status: 'ACTIVE' } }),
      this.prisma.review.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.photo.count({ where: { status: 'PUBLISHED' } }),
      this.prisma.photo.count({ where: { status: 'PENDING' } }),
      this.prisma.business.count({ where: { verificationStatus: 'VERIFIED' } }),
      this.prisma.place.count({ where: { publicationStatus: 'PUBLISHED' } }),
    ]);
    return {
      pendingModeration,
      pendingPlaces,
      changeRequests,
      openReports,
      activeUsers,
      reviews,
      photos,
      pendingPhotos,
      verifiedBusinesses,
      publishedPlaces,
    };
  }

  /** Moderasyon kuyruğu — varsayılan FIFO (en eski önce, docs/02 §10) */
  async moderationQueue(params: {
    status?: string;
    itemType?: string;
    page: number;
    pageSize: number;
  }) {
    const where: Prisma.ModerationItemWhereInput = {
      status: (params.status as Prisma.ModerationItemWhereInput['status']) ?? 'PENDING',
      ...(params.itemType ? { itemType: params.itemType } : {}),
    };
    const [total, items] = await this.prisma.$transaction([
      this.prisma.moderationItem.count({ where }),
      this.prisma.moderationItem.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);

    // İlgili kaydın özetini iliştir
    const enriched = await Promise.all(
      items.map(async (item) => {
        let subject: Record<string, unknown> | null = null;
        if (
          item.itemType === 'PLACE' ||
          item.itemType === 'DUPLICATE' ||
          item.itemType === 'PLACE_CLOSED_REPORT'
        ) {
          const place = await this.prisma.place.findUnique({
            where: { id: item.itemId },
            include: { createdBy: { include: { profile: true } } },
          });
          if (place) {
            subject = {
              kind: 'PLACE',
              id: place.id,
              name: place.name,
              city: place.city,
              publicationStatus: place.publicationStatus,
              submittedBy: place.createdBy?.profile?.displayName ?? null,
              trustLevel: place.createdBy?.profile?.trustLevel ?? null,
              latitude: place.publicLatitude,
              longitude: place.publicLongitude,
            };
          }
        } else if (item.itemType === 'CHANGE_REQUEST') {
          const request = await this.prisma.changeRequest.findUnique({
            where: { id: item.itemId },
            include: { place: true, submitter: { include: { profile: true } } },
          });
          if (request) {
            subject = {
              kind: 'CHANGE_REQUEST',
              id: request.id,
              placeId: request.placeId,
              placeName: request.place.name,
              type: request.type,
              payload: request.payloadJson,
              evidence: request.evidenceText,
              submittedBy: request.submitter.profile?.displayName ?? null,
            };
          }
        } else if (item.itemType === 'REPORT') {
          const report = await this.prisma.report.findUnique({ where: { id: item.itemId } });
          if (report) {
            subject = {
              kind: 'REPORT',
              id: report.id,
              category: report.category,
              targetType: report.targetType,
              targetId: report.targetId,
              description: report.description,
              status: report.status,
            };
          }
        }
        return {
          id: item.id,
          itemType: item.itemType,
          itemId: item.itemId,
          reason: item.reason,
          status: item.status,
          createdAt: item.createdAt,
          subject,
        };
      }),
    );

    return { total, page: params.page, pageSize: params.pageSize, items: enriched };
  }

  /**
   * Moderasyon kuyruğu ile noktaların yayın durumunu tutarlı hâle getirir.
   *
   * Tek tek onaylarken istek yarıda kesilirse (ör. rate limit) iki taraf
   * ayrışabiliyor: nokta yayımlanmış ama kuyruk kaydı hâlâ bekliyor, ya da
   * kuyruk kaydı kapanmış ama nokta yayımlanmamış. Bu metot ikisini de
   * onarır; hiçbir onay kaybolmaz.
   */
  async reconcileModeration(adminId: string) {
    const items = await this.prisma.moderationItem.findMany({
      where: { itemType: { in: ['PLACE', 'DUPLICATE'] } },
      select: { id: true, itemId: true, status: true },
    });
    if (items.length === 0) return { publishedFromApproved: 0, closedStaleItems: 0 };

    const places = await this.prisma.place.findMany({
      where: { id: { in: items.map((item) => item.itemId) } },
      select: { id: true, publicationStatus: true },
    });
    const statusById = new Map(places.map((place) => [place.id, place.publicationStatus]));

    // Kuyrukta onaylanmış ama yayımlanmamış noktalar → yayımla
    const toPublish = items
      .filter((item) => item.status === 'APPROVED')
      .filter((item) => statusById.get(item.itemId) === 'PENDING_REVIEW')
      .map((item) => item.itemId);

    // Yayımlanmış (ya da reddedilmiş) ama kuyrukta hâlâ bekleyen kayıtlar → kapat
    const staleItems = items
      .filter((item) => item.status === 'PENDING')
      .filter((item) => {
        const status = statusById.get(item.itemId);
        return status === 'PUBLISHED' || status === 'REJECTED';
      });

    if (toPublish.length > 0) {
      await this.prisma.place.updateMany({
        where: { id: { in: toPublish } },
        data: { publicationStatus: 'PUBLISHED' },
      });
    }

    for (const item of staleItems) {
      await this.prisma.moderationItem.update({
        where: { id: item.id },
        data: {
          status: statusById.get(item.itemId) === 'PUBLISHED' ? 'APPROVED' : 'REJECTED',
          reviewedBy: adminId,
          reviewedAt: new Date(),
        },
      });
    }

    if (toPublish.length > 0 || staleItems.length > 0) {
      await this.audit(adminId, 'MODERATION_RECONCILE', 'MODERATION', 'bulk', null, {
        publishedFromApproved: toPublish.length,
        closedStaleItems: staleItems.length,
      });
    }

    return { publishedFromApproved: toPublish.length, closedStaleItems: staleItems.length };
  }

  /**
   * Onay bekleyen nokta kayıtlarını toplu sonuçlandırır. Binlerce içe aktarılmış
   * noktayı tek tek onaylamak pratik değil; bu yol tek istekte bitirir.
   */
  async bulkResolvePlaces(
    adminId: string,
    params: { decision: 'APPROVE' | 'REJECT'; dataSource?: string; limit?: number },
  ) {
    const pending = await this.prisma.moderationItem.findMany({
      where: { status: 'PENDING', itemType: { in: ['PLACE', 'DUPLICATE'] } },
      orderBy: { createdAt: 'asc' },
      take: params.limit,
      select: { id: true, itemId: true },
    });
    if (pending.length === 0) return { places: 0, items: 0 };

    // dataSource verilirse yalnızca o kaynaktan gelen noktalar işlenir
    const places = await this.prisma.place.findMany({
      where: {
        id: { in: pending.map((item) => item.itemId) },
        ...(params.dataSource ? { dataSource: params.dataSource } : {}),
      },
      select: { id: true },
    });
    const placeIds = new Set(places.map((place) => place.id));
    const targets = pending.filter((item) => placeIds.has(item.itemId));
    if (targets.length === 0) return { places: 0, items: 0 };

    const publicationStatus = params.decision === 'APPROVE' ? 'PUBLISHED' : 'REJECTED';
    const itemStatus = params.decision === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const [placeResult, itemResult] = await this.prisma.$transaction([
      this.prisma.place.updateMany({
        where: { id: { in: targets.map((item) => item.itemId) } },
        data: { publicationStatus },
      }),
      this.prisma.moderationItem.updateMany({
        where: { id: { in: targets.map((item) => item.id) } },
        data: { status: itemStatus, reviewedBy: adminId, reviewedAt: new Date() },
      }),
    ]);

    // Tek özet kayıt; 1300 ayrı denetim satırı yazılmaz
    await this.audit(adminId, `PLACE_BULK_${params.decision}`, 'PLACE', 'bulk', null, {
      places: placeResult.count,
      items: itemResult.count,
      dataSource: params.dataSource ?? null,
    });

    return { places: placeResult.count, items: itemResult.count };
  }

  async resolveModerationItem(
    adminId: string,
    id: string,
    decision: 'APPROVE' | 'REJECT' | 'ARCHIVE',
    note?: string,
  ) {
    const item = await this.prisma.moderationItem.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('MODERATION_ITEM_NOT_FOUND');
    if (item.status !== 'PENDING')
      throw new BadRequestException('MODERATION_ITEM_ALREADY_RESOLVED');

    const status =
      decision === 'APPROVE' ? 'APPROVED' : decision === 'REJECT' ? 'REJECTED' : 'ARCHIVED';

    // Nokta onayı/reddi
    if (['PLACE', 'DUPLICATE'].includes(item.itemType)) {
      const place = await this.prisma.place.findUnique({ where: { id: item.itemId } });
      if (place) {
        const newStatus = decision === 'APPROVE' ? 'PUBLISHED' : 'REJECTED';
        if (decision !== 'ARCHIVE') {
          await this.prisma.place.update({
            where: { id: place.id },
            data: { publicationStatus: newStatus },
          });
          await this.campScore.recalculate(place.id);
          if (place.createdById) {
            await this.notifications.notify(
              place.createdById,
              decision === 'APPROVE' ? 'PLACE_APPROVED' : 'PLACE_REJECTED',
              { placeId: place.id, placeName: place.name },
            );
          }
        }
        await this.audit(
          adminId,
          `PLACE_${decision}`,
          'PLACE',
          place.id,
          {
            publicationStatus: place.publicationStatus,
          },
          { publicationStatus: newStatus },
        );
      }
    }

    // "Kapalı görünüyor" bildirimi (docs/01 §21): onaylanırsa noktanın çalışma
    // durumu kalıcı kapalıya çekilir ve nokta varsayılan listelerden düşer.
    if (item.itemType === 'PLACE_CLOSED_REPORT' && decision === 'APPROVE') {
      const place = await this.prisma.place.findUnique({ where: { id: item.itemId } });
      if (place) {
        await this.prisma.place.update({
          where: { id: place.id },
          data: { operatingStatus: 'PERMANENTLY_CLOSED' },
        });
        await this.campScore.recalculate(place.id);
        if (place.createdById) {
          await this.notifications.notify(place.createdById, 'SYSTEM', {
            placeId: place.id,
            placeName: place.name,
            operatingStatus: 'PERMANENTLY_CLOSED',
          });
        }
        await this.audit(
          adminId,
          'PLACE_CLOSED_CONFIRM',
          'PLACE',
          place.id,
          { operatingStatus: place.operatingStatus },
          { operatingStatus: 'PERMANENTLY_CLOSED' },
        );
      }
    }

    // Değişiklik önerisi
    if (item.itemType === 'CHANGE_REQUEST') {
      const request = await this.prisma.changeRequest.findUnique({ where: { id: item.itemId } });
      if (request) {
        await this.prisma.changeRequest.update({
          where: { id: request.id },
          data: {
            status: decision === 'APPROVE' ? 'APPROVED' : 'REJECTED',
            reviewedAt: new Date(),
            reviewedBy: adminId,
          },
        });
        await this.notifications.notify(request.submittedBy, 'CHANGE_REQUEST_RESOLVED', {
          placeId: request.placeId,
          approved: decision === 'APPROVE',
        });
        await this.audit(adminId, `CHANGE_REQUEST_${decision}`, 'CHANGE_REQUEST', request.id);
      }
    }

    // Şikâyet
    if (item.itemType === 'REPORT') {
      await this.prisma.report.updateMany({
        where: { id: item.itemId },
        data: { status: decision === 'APPROVE' ? 'RESOLVED' : 'DISMISSED' },
      });
      await this.audit(adminId, `REPORT_${decision}`, 'REPORT', item.itemId);
    }

    await this.prisma.moderationItem.update({
      where: { id },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy: adminId,
        reason: note ? `${item.reason ?? ''} | Not: ${note}`.trim() : item.reason,
      },
    });

    return { id, status };
  }

  /**
   * Mükerrer birleştirme (docs/01 §14, docs/06): yorum, fotoğraf, puan ve katkı
   * geçmişi korunur; kaynak MERGED olarak arşivlenir. Transaction içinde yapılır.
   */
  async mergePlaces(adminId: string, sourceId: string, targetId: string) {
    if (sourceId === targetId) throw new BadRequestException('MERGE_SAME_PLACE');
    const [source, target] = await Promise.all([
      this.prisma.place.findUnique({ where: { id: sourceId } }),
      this.prisma.place.findUnique({ where: { id: targetId } }),
    ]);
    if (!source || !target) throw new NotFoundException('PLACE_NOT_FOUND');

    await this.prisma.$transaction(async (tx) => {
      // Yorumlar, fotoğraflar, katkı geçmişi hedefe taşınır
      await tx.review.updateMany({ where: { placeId: sourceId }, data: { placeId: targetId } });
      await tx.photo.updateMany({ where: { placeId: sourceId }, data: { placeId: targetId } });
      await tx.verification.updateMany({
        where: { placeId: sourceId },
        data: { placeId: targetId },
      });
      await tx.changeRequest.updateMany({
        where: { placeId: sourceId },
        data: { placeId: targetId },
      });

      // Puanlar: aynı kullanıcı+yıl çakışması olanlar kaynakta kalır ve pasifleşir
      const sourceRatings = await tx.userRating.findMany({ where: { placeId: sourceId } });
      for (const rating of sourceRatings) {
        const conflict = await tx.userRating.findUnique({
          where: {
            userId_placeId_ratingPeriodYear: {
              userId: rating.userId,
              placeId: targetId,
              ratingPeriodYear: rating.ratingPeriodYear,
            },
          },
        });
        if (conflict) {
          await tx.userRating.update({ where: { id: rating.id }, data: { isActive: false } });
        } else {
          await tx.userRating.update({ where: { id: rating.id }, data: { placeId: targetId } });
        }
      }

      // Hedefte olmayan imkânlar ve aktiviteler taşınır
      const sourceAmenities = await tx.placeAmenity.findMany({ where: { placeId: sourceId } });
      for (const amenity of sourceAmenities) {
        await tx.placeAmenity.upsert({
          where: {
            placeId_amenityId: { placeId: targetId, amenityId: amenity.amenityId },
          },
          create: { placeId: targetId, amenityId: amenity.amenityId, value: amenity.value },
          update: {},
        });
      }
      const sourceActivities = await tx.placeActivity.findMany({ where: { placeId: sourceId } });
      for (const activity of sourceActivities) {
        await tx.placeActivity.upsert({
          where: {
            placeId_activityId: { placeId: targetId, activityId: activity.activityId },
          },
          create: { placeId: targetId, activityId: activity.activityId, isAllowed: true },
          update: {},
        });
      }

      // Koleksiyon bağlantıları
      const items = await tx.collectionItem.findMany({ where: { placeId: sourceId } });
      for (const item of items) {
        await tx.collectionItem.upsert({
          where: {
            collectionId_placeId: { collectionId: item.collectionId, placeId: targetId },
          },
          create: { collectionId: item.collectionId, placeId: targetId, sortOrder: item.sortOrder },
          update: {},
        });
        await tx.collectionItem.delete({
          where: {
            collectionId_placeId: { collectionId: item.collectionId, placeId: sourceId },
          },
        });
      }

      await tx.place.update({
        where: { id: sourceId },
        data: { publicationStatus: 'MERGED' },
      });
    });

    await this.campScore.recalculate(targetId);
    await this.audit(adminId, 'PLACE_MERGE', 'PLACE', targetId, { sourceId }, { targetId });
    return { merged: true, sourceId, targetId };
  }

  async listPlaces(params: { status?: string; search?: string; page: number; pageSize: number }) {
    const where: Prisma.PlaceWhereInput = {
      ...(params.status
        ? { publicationStatus: params.status as Prisma.PlaceWhereInput['publicationStatus'] }
        : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' } },
              { city: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [total, places] = await this.prisma.$transaction([
      this.prisma.place.count({ where }),
      this.prisma.place.findMany({
        where,
        include: { score: true, createdBy: { include: { profile: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);
    return {
      total,
      page: params.page,
      pageSize: params.pageSize,
      items: places.map((p) => ({
        id: p.id,
        name: p.name,
        city: p.city,
        publicationStatus: p.publicationStatus,
        operatingStatus: p.operatingStatus,
        feeType: p.feeType,
        locationPrecision: p.locationPrecision,
        // Yaklaşık konumda gerçek koordinat yalnızca yetkili admin uçlarında (docs/06)
        exactLatitude: p.exactLatitude,
        exactLongitude: p.exactLongitude,
        publicLatitude: p.publicLatitude,
        publicLongitude: p.publicLongitude,
        score: p.score?.overallScore ?? null,
        createdBy: p.createdBy?.profile?.displayName ?? null,
        createdAt: p.createdAt,
      })),
    };
  }

  async listUsers(params: { search?: string; page: number; pageSize: number }) {
    const where: Prisma.UserWhereInput = params.search
      ? {
          OR: [
            { email: { contains: params.search, mode: 'insensitive' } },
            { profile: { displayName: { contains: params.search, mode: 'insensitive' } } },
          ],
        }
      : {};
    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: {
          profile: true,
          _count: { select: { reviews: true, createdPlaces: true, photos: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);
    return {
      total,
      page: params.page,
      pageSize: params.pageSize,
      items: users.map((u) => ({
        id: u.id,
        email: u.email,
        emailVerified: u.emailVerifiedAt !== null,
        status: u.status,
        role: u.role,
        displayName: u.profile?.displayName ?? null,
        trustLevel: u.profile?.trustLevel ?? 'NEW_USER',
        // Sayısal güven puanı yalnızca admin'e görünür (docs/06)
        trustScore: u.profile?.trustScore ?? 0,
        stats: {
          reviews: u._count.reviews,
          places: u._count.createdPlaces,
          photos: u._count.photos,
        },
        createdAt: u.createdAt,
      })),
    };
  }

  async setTrustLevel(adminId: string, userId: string, trustLevel: TrustLevel) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('USER_NOT_FOUND');
    await this.prisma.userProfile.update({ where: { userId }, data: { trustLevel } });
    await this.audit(
      adminId,
      'TRUST_LEVEL_CHANGE',
      'USER',
      userId,
      {
        trustLevel: profile.trustLevel,
      },
      { trustLevel },
    );
    await this.notifications.notify(userId, 'TRUST_LEVEL_UP', { trustLevel });
    return { userId, trustLevel };
  }

  async setUserStatus(adminId: string, userId: string, status: 'ACTIVE' | 'SUSPENDED') {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('USER_NOT_FOUND');
    await this.prisma.user.update({ where: { id: userId }, data: { status } });
    if (status === 'SUSPENDED') {
      // Askıya alınan kullanıcının oturumları kapatılır
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await this.audit(
      adminId,
      'USER_STATUS_CHANGE',
      'USER',
      userId,
      { status: user.status },
      { status },
    );
    return { userId, status };
  }

  async listReports(params: { status?: string; page: number; pageSize: number }) {
    const where: Prisma.ReportWhereInput = {
      status: (params.status as Prisma.ReportWhereInput['status']) ?? 'OPEN',
    };
    const [total, reports] = await this.prisma.$transaction([
      this.prisma.report.count({ where }),
      this.prisma.report.findMany({
        where,
        include: { reporter: { include: { profile: true } } },
        orderBy: { createdAt: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);
    return {
      total,
      page: params.page,
      pageSize: params.pageSize,
      items: reports.map((r) => ({
        id: r.id,
        category: r.category,
        targetType: r.targetType,
        targetId: r.targetId,
        description: r.description,
        status: r.status,
        reportedBy: r.reporter.profile?.displayName ?? null,
        createdAt: r.createdAt,
      })),
    };
  }

  /**
   * Fotoğraf moderasyonu. İçe aktarımdan gelen adaylar (Wikimedia) ve
   * kullanıcı yüklemeleri PENDING durumunda bekler; onaylanmadan uygulamada
   * görünmezler.
   */
  async listPhotos(params: { status?: string; page: number; pageSize: number }) {
    const where: Prisma.PhotoWhereInput = {
      status: (params.status as Prisma.PhotoWhereInput['status']) ?? 'PENDING',
    };
    const [total, photos] = await this.prisma.$transaction([
      this.prisma.photo.count({ where }),
      this.prisma.photo.findMany({
        where,
        include: {
          place: { select: { id: true, name: true, city: true } },
          uploader: { include: { profile: true } },
        },
        orderBy: { createdAt: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);
    return {
      total,
      page: params.page,
      pageSize: params.pageSize,
      items: photos.map((photo) => ({
        ...toPhotoResponse(photo),
        status: photo.status,
        placeId: photo.placeId,
        placeName: photo.place?.name ?? null,
        placeCity: photo.place?.city ?? null,
        uploadedBy: photo.uploader?.profile?.displayName ?? null,
        createdAt: photo.createdAt,
      })),
    };
  }

  /** Onay bekleyen fotoğrafları toplu sonuçlandırır (içe aktarım sonrası) */
  async bulkResolvePhotos(adminId: string, action: 'APPROVE' | 'REJECT') {
    const pending = await this.prisma.photo.findMany({
      where: { status: 'PENDING' },
      select: { id: true, placeId: true },
    });
    if (pending.length === 0) return { photos: 0, places: 0 };

    const status = action === 'APPROVE' ? 'PUBLISHED' : 'REMOVED';
    const result = await this.prisma.photo.updateMany({
      where: { id: { in: pending.map((photo) => photo.id) } },
      data: { status },
    });

    // Noktaların "fotoğraf bekleniyor" etiketi gerçek duruma göre tazelenir
    const placeIds = [
      ...new Set(pending.map((photo) => photo.placeId).filter(Boolean)),
    ] as string[];
    for (const placeId of placeIds) {
      const published = await this.prisma.photo.count({
        where: { placeId, status: 'PUBLISHED' },
      });
      await this.prisma.place.update({
        where: { id: placeId },
        data: { photoStatus: published > 0 ? 'PUBLISHED' : 'PENDING' },
      });
    }

    await this.audit(adminId, `PHOTO_BULK_${action}`, 'PHOTO', 'bulk', null, {
      photos: result.count,
      places: placeIds.length,
    });

    return { photos: result.count, places: placeIds.length };
  }

  async resolvePhoto(adminId: string, id: string, action: 'APPROVE' | 'REJECT') {
    const photo = await this.prisma.photo.findUnique({ where: { id } });
    if (!photo) throw new NotFoundException('PHOTO_NOT_FOUND');

    const status = action === 'APPROVE' ? 'PUBLISHED' : 'REMOVED';
    await this.prisma.photo.update({ where: { id }, data: { status } });

    // Noktanın "fotoğraf bekleniyor" etiketi yayınlanan foto varsa kalkar,
    // son fotoğraf da kaldırılırsa geri gelir.
    if (photo.placeId) {
      const published = await this.prisma.photo.count({
        where: { placeId: photo.placeId, status: 'PUBLISHED' },
      });
      await this.prisma.place.update({
        where: { id: photo.placeId },
        data: { photoStatus: published > 0 ? 'PUBLISHED' : 'PENDING' },
      });
    }

    await this.audit(adminId, `PHOTO_${action}`, 'PHOTO', id);
    return { id, status };
  }

  async resolveReport(adminId: string, id: string, action: 'RESOLVE' | 'DISMISS') {
    const report = await this.prisma.report.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('REPORT_NOT_FOUND');
    await this.prisma.report.update({
      where: { id },
      data: { status: action === 'RESOLVE' ? 'RESOLVED' : 'DISMISSED' },
    });
    await this.audit(adminId, `REPORT_${action}`, 'REPORT', id);
    return { id, status: action === 'RESOLVE' ? 'RESOLVED' : 'DISMISSED' };
  }

  async getScoreConfig() {
    const config = await this.prisma.scoreConfig.findUnique({ where: { id: 1 } });
    const amenities = await this.prisma.amenity.findMany({ orderBy: { code: 'asc' } });
    return {
      weights: {
        features: config?.featuresWeight ?? 0.45,
        userRating: config?.userRatingWeight ?? 0.35,
        atmosphere: config?.atmosphereWeight ?? 0.2,
      },
      amenities: amenities.map((a) => ({
        id: a.id,
        code: a.code,
        nameKey: a.nameKey,
        weight: a.weight,
        applicableActivityMask: a.applicableActivityMask,
      })),
    };
  }

  async updateScoreConfig(
    adminId: string,
    dto: { features: number; userRating: number; atmosphere: number },
  ) {
    const sum = dto.features + dto.userRating + dto.atmosphere;
    if (Math.abs(sum - 1) > 0.001) throw new BadRequestException('SCORE_WEIGHTS_MUST_SUM_TO_ONE');
    const previous = await this.prisma.scoreConfig.findUnique({ where: { id: 1 } });
    await this.prisma.scoreConfig.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        featuresWeight: dto.features,
        userRatingWeight: dto.userRating,
        atmosphereWeight: dto.atmosphere,
      },
      update: {
        featuresWeight: dto.features,
        userRatingWeight: dto.userRating,
        atmosphereWeight: dto.atmosphere,
      },
    });
    await this.audit(adminId, 'SCORE_CONFIG_UPDATE', 'SCORE_CONFIG', '1', previous, dto);

    // Ağırlık değişince tüm yayınlanmış noktalar yeniden hesaplanır
    const places = await this.prisma.place.findMany({
      where: { publicationStatus: 'PUBLISHED' },
      select: { id: true },
    });
    for (const place of places) {
      await this.campScore.recalculate(place.id);
    }
    return { updated: true, recalculated: places.length };
  }

  async auditLogs(params: { page: number; pageSize: number }) {
    const [total, logs] = await this.prisma.$transaction([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.findMany({
        include: { actor: { include: { profile: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);
    return {
      total,
      page: params.page,
      pageSize: params.pageSize,
      items: logs.map((l) => ({
        id: l.id,
        actor: l.actor?.profile?.displayName ?? 'Sistem',
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        oldValue: l.oldValueJson,
        newValue: l.newValueJson,
        createdAt: l.createdAt,
      })),
    };
  }

  async listBusinesses(params: { page: number; pageSize: number }) {
    const [total, businesses] = await this.prisma.$transaction([
      this.prisma.business.count(),
      this.prisma.business.findMany({
        include: { owner: { include: { profile: true } }, places: { include: { place: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);
    return {
      total,
      page: params.page,
      pageSize: params.pageSize,
      items: businesses.map((b) => ({
        id: b.id,
        name: b.name,
        // Sahiplik beyanı moderatörün kararına dayanak oluşturur
        evidence: b.evidence,
        verificationStatus: b.verificationStatus,
        owner: b.owner.profile?.displayName ?? null,
        ownerEmail: b.owner.email,
        createdAt: b.createdAt,
        places: b.places.map((bp) => ({ id: bp.placeId, name: bp.place.name })),
      })),
    };
  }

  // ---- Yerelleştirme ----

  /** Noktanın varsayılan metinleri + mevcut çevirileri */
  async placeTranslations(placeId: string) {
    const place = await this.prisma.place.findUnique({
      where: { id: placeId },
      include: { translations: true },
    });
    if (!place) throw new NotFoundException('PLACE_NOT_FOUND');
    const byLocale = new Map(place.translations.map((tr) => [tr.locale, tr]));
    return {
      id: place.id,
      defaultName: place.name,
      defaultDescription: place.description,
      translations: LOCALES.map((locale) => ({
        locale,
        name: byLocale.get(locale)?.name ?? null,
        description: byLocale.get(locale)?.description ?? null,
      })),
    };
  }

  /** Çeviri kaydet; boş metin çeviriyi kaldırır (varsayılana düşer) */
  async savePlaceTranslation(
    adminId: string,
    placeId: string,
    locale: string,
    dto: { name?: string | null; description?: string | null },
  ) {
    if (!LOCALES.includes(locale)) throw new BadRequestException('LOCALE_NOT_SUPPORTED');
    const place = await this.prisma.place.findUnique({ where: { id: placeId } });
    if (!place) throw new NotFoundException('PLACE_NOT_FOUND');

    const name = dto.name?.trim() || null;
    const description = dto.description?.trim() || null;

    if (name === null && description === null) {
      await this.prisma.placeTranslation.deleteMany({ where: { placeId, locale } });
    } else {
      await this.prisma.placeTranslation.upsert({
        where: { placeId_locale: { placeId, locale } },
        create: { placeId, locale, name, description },
        update: { name, description },
      });
    }
    await this.audit(adminId, 'PLACE_TRANSLATION_SAVE', 'PLACE', placeId, null, { locale });
    return { placeId, locale, name, description };
  }

  /** İşletme doğrulaması ilk sürümde manuel (docs/01 §17) */
  async verifyBusiness(adminId: string, id: string, approve: boolean) {
    const business = await this.prisma.business.findUnique({ where: { id } });
    if (!business) throw new NotFoundException('BUSINESS_NOT_FOUND');
    await this.prisma.business.update({
      where: { id },
      data: {
        verificationStatus: approve ? 'VERIFIED' : 'REJECTED',
        verifiedBy: adminId,
        verifiedAt: new Date(),
      },
    });
    if (approve) {
      await this.prisma.user.update({
        where: { id: business.ownerUserId },
        data: { role: 'BUSINESS_OWNER' },
      });
    }
    await this.audit(adminId, approve ? 'BUSINESS_VERIFY' : 'BUSINESS_REJECT', 'BUSINESS', id);
    return { id, verificationStatus: approve ? 'VERIFIED' : 'REJECTED' };
  }
}
