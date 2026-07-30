import { calculateCampScore, roundScore, scoreLabel } from '@campulator/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Aktivite bitmask'i: CARAVAN=1, TENT=2, PICNIC=4, BARBECUE=8 (amenities.applicable_activity_mask)
const ACTIVITY_BITS: Record<string, number> = { CARAVAN: 1, TENT: 2, PICNIC: 4, BARBECUE: 8 };

/**
 * CampScore merkezi servisi (docs/01 §10, docs/02 §8).
 * Ağırlıklar score_config tablosundan okunur; her onaylı özellik/puan değişikliğinde
 * recalculate() çağrılır.
 */
@Injectable()
export class CampScoreService {
  constructor(private readonly prisma: PrismaService) {}

  private async getWeights() {
    const config = await this.prisma.scoreConfig.findUnique({ where: { id: 1 } });
    return {
      features: config?.featuresWeight ?? 0.45,
      userRating: config?.userRatingWeight ?? 0.35,
      atmosphere: config?.atmosphereWeight ?? 0.2,
    };
  }

  /**
   * Features Score (docs/01 §10.1): doğrulanmış imkânlara göre, imkân ağırlıklarıyla.
   * Nokta türüne uygulanmayan imkânlar paydaya girmez (eksik sayılmaz).
   */
  private computeFeaturesScore(
    placeActivityMask: number,
    allAmenities: { id: number; weight: number; applicableActivityMask: number }[],
    presentAmenityIds: Set<number>,
  ): { score: number; applicable: number; present: number } {
    const applicable = allAmenities.filter(
      (a) => (a.applicableActivityMask & placeActivityMask) !== 0,
    );
    const totalWeight = applicable.reduce((sum, a) => sum + a.weight, 0);
    if (totalWeight === 0) return { score: 0, applicable: 0, present: 0 };
    const presentWeight = applicable
      .filter((a) => presentAmenityIds.has(a.id))
      .reduce((sum, a) => sum + a.weight, 0);
    return {
      score: roundScore((presentWeight / totalWeight) * 5),
      applicable: applicable.length,
      present: applicable.filter((a) => presentAmenityIds.has(a.id)).length,
    };
  }

  /**
   * Atmosphere Score (docs/01 §10.3): girilen metriklerin ortalaması.
   * crowdLevel ters çevrilir (kalabalık yüksek = atmosfer düşük).
   */
  private computeAtmosphereScore(
    atmosphere: {
      cellSignal: number | null;
      quietness: number | null;
      crowdLevel: number | null;
      privacy: number | null;
      nightCalm: number | null;
      socialLevel: number | null;
    } | null,
  ): number {
    if (!atmosphere) return 0;
    const values = [
      atmosphere.cellSignal,
      atmosphere.quietness,
      atmosphere.crowdLevel !== null ? 6 - atmosphere.crowdLevel : null,
      atmosphere.privacy,
      atmosphere.nightCalm,
      atmosphere.socialLevel,
    ].filter((v): v is number => v !== null);
    if (values.length === 0) return 0;
    return roundScore(values.reduce((sum, v) => sum + v, 0) / values.length);
  }

  /** User Rating (docs/01 §10.2): aktif değerlendirmelerin ortalaması. */
  private async computeUserRating(placeId: string): Promise<{ average: number; count: number }> {
    const aggregate = await this.prisma.userRating.aggregate({
      where: { placeId, isActive: true },
      _avg: { overallUserScore: true },
      _count: true,
    });
    return {
      average: roundScore(aggregate._avg.overallUserScore ?? 0),
      count: aggregate._count,
    };
  }

  async breakdown(placeId: string, includeUnpublished = false) {
    const place = await this.prisma.place.findFirst({
      where: {
        id: placeId,
        ...(includeUnpublished ? {} : { publicationStatus: 'PUBLISHED' as const }),
      },
      include: {
        activities: { include: { activity: true } },
        amenities: true,
        atmosphere: true,
        score: true,
      },
    });
    if (!place) throw new NotFoundException('PLACE_NOT_FOUND');

    const weights = await this.getWeights();
    const allAmenities = await this.prisma.amenity.findMany();

    const activityMask = place.activities
      .filter((pa) => pa.isAllowed)
      .reduce((mask, pa) => mask | (ACTIVITY_BITS[pa.activity.code] ?? 0), 0);
    const presentAmenityIds = new Set(
      place.amenities.filter((pa) => pa.value).map((pa) => pa.amenityId),
    );

    const features = this.computeFeaturesScore(activityMask, allAmenities, presentAmenityIds);
    const atmosphereScore = this.computeAtmosphereScore(place.atmosphere);
    const userRating = await this.computeUserRating(placeId);

    // Seed'de doğrudan yüklenmiş skor varsa (henüz gerçek puan yokken) onu koru
    const storedUserRating = place.score?.userRating ?? 0;
    const effectiveUserRating = userRating.count > 0 ? userRating.average : storedUserRating;
    const storedAtmosphere = place.score?.atmosphereScore ?? 0;
    const effectiveAtmosphere = atmosphereScore > 0 ? atmosphereScore : storedAtmosphere;
    const storedFeatures = place.score?.featuresScore ?? 0;
    const effectiveFeatures = features.applicable > 0 ? features.score : storedFeatures;

    const result = calculateCampScore(
      {
        featuresScore: effectiveFeatures,
        userRating: effectiveUserRating,
        atmosphereScore: effectiveAtmosphere,
      },
      weights,
    );

    return {
      placeId,
      overall: result.overallScore,
      label: scoreLabel(result.overallScore),
      components: {
        features: {
          score: result.featuresScore,
          weight: weights.features,
          applicableAmenities: features.applicable,
          presentAmenities: features.present,
        },
        userRating: {
          score: result.userRating,
          weight: weights.userRating,
          ratingCount: userRating.count,
        },
        atmosphere: {
          score: result.atmosphereScore,
          weight: weights.atmosphere,
        },
      },
      calculatedAt: new Date().toISOString(),
    };
  }

  /** Skoru yeniden hesaplayıp place_scores tablosuna yazar. */
  async recalculate(placeId: string) {
    const breakdown = await this.breakdown(placeId, true);
    await this.prisma.placeScore.upsert({
      where: { placeId },
      create: {
        placeId,
        featuresScore: breakdown.components.features.score,
        userRating: breakdown.components.userRating.score,
        atmosphereScore: breakdown.components.atmosphere.score,
        overallScore: breakdown.overall,
      },
      update: {
        featuresScore: breakdown.components.features.score,
        userRating: breakdown.components.userRating.score,
        atmosphereScore: breakdown.components.atmosphere.score,
        overallScore: breakdown.overall,
        calculatedAt: new Date(),
      },
    });
    return breakdown;
  }
}
