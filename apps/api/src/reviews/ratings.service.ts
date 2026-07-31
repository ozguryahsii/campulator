import { Injectable, NotFoundException } from '@nestjs/common';
import { roundScore } from '@campulator/shared';
import { CampScoreService } from '../campscore/campscore.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertRatingDto } from './ratings.dto';

@Injectable()
export class RatingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly campScore: CampScoreService,
  ) {}

  /**
   * Yıllık tek puan kuralı (docs/01 §10.2): user+place+yıl unique; aynı yıl içinde
   * tekrar gönderim mevcut kaydı günceller. Yeni yıl yeni kayıt açar, eskisi pasifleşir.
   * Kullanıcı başına tek aktif değerlendirme bulunur.
   */
  async upsert(userId: string, placeId: string, dto: UpsertRatingDto) {
    const place = await this.prisma.place.findUnique({ where: { id: placeId } });
    if (!place) throw new NotFoundException('PLACE_NOT_FOUND');

    const year = new Date().getFullYear();
    const overall = roundScore(
      (dto.cleanliness + dto.safety + dto.scenery + dto.accessibility + dto.valueForMoney) / 5,
    );
    const data = {
      cleanliness: dto.cleanliness,
      safety: dto.safety,
      scenery: dto.scenery,
      accessibility: dto.accessibility,
      valueForMoney: dto.valueForMoney,
      overallUserScore: overall,
      visitDate: dto.visitDate ? new Date(dto.visitDate) : null,
    };

    const rating = await this.prisma.$transaction(async (tx) => {
      // Önceki yılların aktif kaydı pasifleşir
      await tx.userRating.updateMany({
        where: { userId, placeId, ratingPeriodYear: { not: year }, isActive: true },
        data: { isActive: false },
      });
      return tx.userRating.upsert({
        where: {
          userId_placeId_ratingPeriodYear: { userId, placeId, ratingPeriodYear: year },
        },
        create: { userId, placeId, ratingPeriodYear: year, isActive: true, ...data },
        update: { ...data, isActive: true },
      });
    });

    await this.campScore.recalculate(placeId);
    return this.toView(rating);
  }

  async myRating(userId: string, placeId: string) {
    const rating = await this.prisma.userRating.findFirst({
      where: { userId, placeId, isActive: true },
    });
    return rating ? this.toView(rating) : null;
  }

  async summary(placeId: string) {
    const aggregate = await this.prisma.userRating.aggregate({
      where: { placeId, isActive: true },
      _avg: {
        cleanliness: true,
        safety: true,
        scenery: true,
        accessibility: true,
        valueForMoney: true,
        overallUserScore: true,
      },
      _count: true,
    });
    return {
      count: aggregate._count,
      overall: roundScore(aggregate._avg.overallUserScore ?? 0),
      categories: {
        cleanliness: roundScore(aggregate._avg.cleanliness ?? 0),
        safety: roundScore(aggregate._avg.safety ?? 0),
        scenery: roundScore(aggregate._avg.scenery ?? 0),
        accessibility: roundScore(aggregate._avg.accessibility ?? 0),
        valueForMoney: roundScore(aggregate._avg.valueForMoney ?? 0),
      },
    };
  }

  private toView(rating: {
    id: string;
    cleanliness: number;
    safety: number;
    scenery: number;
    accessibility: number;
    valueForMoney: number;
    overallUserScore: number;
    ratingPeriodYear: number;
    visitDate: Date | null;
  }) {
    return {
      id: rating.id,
      cleanliness: rating.cleanliness,
      safety: rating.safety,
      scenery: rating.scenery,
      accessibility: rating.accessibility,
      valueForMoney: rating.valueForMoney,
      overall: rating.overallUserScore,
      year: rating.ratingPeriodYear,
      visitDate: rating.visitDate,
    };
  }
}
