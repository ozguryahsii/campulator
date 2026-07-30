import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReportCategory } from '@prisma/client';
import { BusinessesService } from '../businesses/businesses.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateReplyDto,
  CreateReviewDto,
  ListReviewsQuery,
  ReportReviewDto,
  UpdateReviewDto,
} from './reviews.dto';

const reviewInclude = {
  user: { include: { profile: true } },
  rating: true,
  photos: { where: { status: 'PUBLISHED' as const } },
  replies: {
    include: { user: { include: { profile: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
} satisfies Prisma.ReviewInclude;

type ReviewWithRelations = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly businesses: BusinessesService,
  ) {}

  private toView(review: ReviewWithRelations, currentUserId?: string) {
    return {
      id: review.id,
      body: review.body,
      helpfulCount: review.helpfulCount,
      visitDate: review.visitDate,
      createdAt: review.createdAt,
      updatedAt: review.updatedAt,
      user: {
        id: review.userId,
        displayName: review.user.profile?.displayName ?? 'Silinmiş Kullanıcı',
        trustLevel: review.user.profile?.trustLevel ?? 'NEW_USER',
      },
      rating: review.rating ? review.rating.overallUserScore : null,
      photos: review.photos.map((photo) => ({ id: photo.id, storageKey: photo.storageKey })),
      replies: review.replies.map((reply) => ({
        id: reply.id,
        body: reply.body,
        isOfficialResponse: reply.isOfficialResponse,
        createdAt: reply.createdAt,
        user: {
          id: reply.userId,
          displayName: reply.user.profile?.displayName ?? 'Silinmiş Kullanıcı',
        },
      })),
      isMine: currentUserId ? review.userId === currentUserId : false,
    };
  }

  async list(placeId: string, query: ListReviewsQuery, currentUserId?: string) {
    const sort = query.sort ?? 'newest';
    const where: Prisma.ReviewWhereInput = { placeId, status: 'PUBLISHED' };
    if (sort === 'with_photos') where.photos = { some: { status: 'PUBLISHED' } };

    const orderBy: Prisma.ReviewOrderByWithRelationInput =
      sort === 'helpful'
        ? { helpfulCount: 'desc' }
        : sort === 'highest'
          ? { rating: { overallUserScore: 'desc' } }
          : sort === 'lowest'
            ? { rating: { overallUserScore: 'asc' } }
            : { createdAt: 'desc' };

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const [total, reviews] = await this.prisma.$transaction([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        include: reviewInclude,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { total, page, pageSize, items: reviews.map((r) => this.toView(r, currentUserId)) };
  }

  /** Yorumlar anında yayınlanır (docs/01 §15). Varsa aktif puanla ilişkilendirilir. */
  async create(userId: string, placeId: string, dto: CreateReviewDto) {
    const place = await this.prisma.place.findUnique({ where: { id: placeId } });
    if (!place) throw new NotFoundException('PLACE_NOT_FOUND');

    const activeRating = await this.prisma.userRating.findFirst({
      where: { userId, placeId, isActive: true },
    });
    const review = await this.prisma.review.create({
      data: {
        userId,
        placeId,
        ratingId: activeRating?.id ?? null,
        body: dto.body.trim(),
        visitDate: dto.visitDate ? new Date(dto.visitDate) : null,
      },
      include: reviewInclude,
    });
    return this.toView(review, userId);
  }

  private async findOwned(userId: string, reviewId: string) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('REVIEW_NOT_FOUND');
    if (review.userId !== userId) throw new ForbiddenException('REVIEW_NOT_OWNER');
    return review;
  }

  async update(userId: string, reviewId: string, dto: UpdateReviewDto) {
    await this.findOwned(userId, reviewId);
    const review = await this.prisma.review.update({
      where: { id: reviewId },
      data: { body: dto.body.trim() },
      include: reviewInclude,
    });
    return this.toView(review, userId);
  }

  async remove(userId: string, reviewId: string) {
    await this.findOwned(userId, reviewId);
    await this.prisma.review.delete({ where: { id: reviewId } });
    return { deleted: true };
  }

  /**
   * Tek seviyeli yanıt (docs/01 §15). Yanıtı yazan kişi noktanın doğrulanmış
   * işletme sahibiyse yanıt otomatik olarak "resmî yanıt" işaretlenir.
   */
  async reply(userId: string, reviewId: string, dto: CreateReplyDto) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('REVIEW_NOT_FOUND');

    const businessId = await this.businesses.officialResponderFor(userId, review.placeId);
    const reply = await this.prisma.reviewReply.create({
      data: {
        reviewId,
        userId,
        body: dto.body.trim(),
        businessId,
        isOfficialResponse: businessId !== null,
      },
      include: { user: { include: { profile: true } } },
    });
    // Yorum sahibine bildirim (kendi yorumuna yanıt verdiyse gönderilmez)
    if (review.userId !== userId) {
      await this.notifications.notify(review.userId, 'REVIEW_REPLY', {
        reviewId,
        placeId: review.placeId,
        replyId: reply.id,
      });
    }
    return {
      id: reply.id,
      body: reply.body,
      isOfficialResponse: reply.isOfficialResponse,
      createdAt: reply.createdAt,
      user: { id: userId, displayName: reply.user.profile?.displayName ?? '' },
    };
  }

  async markHelpful(userId: string, reviewId: string, helpful: boolean) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('REVIEW_NOT_FOUND');

    if (helpful) {
      await this.prisma.reviewHelpful.upsert({
        where: { reviewId_userId: { reviewId, userId } },
        create: { reviewId, userId },
        update: {},
      });
    } else {
      await this.prisma.reviewHelpful.deleteMany({ where: { reviewId, userId } });
    }
    const helpfulCount = await this.prisma.reviewHelpful.count({ where: { reviewId } });
    await this.prisma.review.update({ where: { id: reviewId }, data: { helpfulCount } });
    if (helpful && review.userId !== userId) {
      await this.notifications.notify(review.userId, 'REVIEW_HELPFUL', {
        reviewId,
        placeId: review.placeId,
        helpfulCount,
      });
    }
    return { helpfulCount };
  }

  /** Şikâyet edilen içerik admin inceleyene kadar yayında kalır (docs/01 §23) */
  async report(userId: string, reviewId: string, dto: ReportReviewDto) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('REVIEW_NOT_FOUND');
    const report = await this.prisma.report.create({
      data: {
        reporterUserId: userId,
        targetType: 'REVIEW',
        targetId: reviewId,
        category: dto.category as ReportCategory,
        description: dto.description ?? null,
      },
    });
    await this.prisma.moderationItem.create({
      data: { itemType: 'REPORT', itemId: report.id, reason: dto.category },
    });
    return { id: report.id };
  }
}
