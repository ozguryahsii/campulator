import { ATMOSPHERE_THRESHOLDS, calculateSmartMatch, CRITERIA_BY_ID } from '@campulator/shared';
import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SmartMatchSearchDto } from './smart-match.dto';

const smartMatchInclude = {
  activities: { include: { activity: true } },
  amenities: { include: { amenity: true } },
  accessCondition: true,
  atmosphere: true,
  score: true,
} satisfies Prisma.PlaceInclude;

type PlaceWithRelations = Prisma.PlaceGetPayload<{ include: typeof smartMatchInclude }>;

@Injectable()
export class SmartMatchService {
  constructor(private readonly prisma: PrismaService) {}

  /** Bir noktanın sağladığı kriter kimlikleri kümesini üretir. */
  private satisfiedCriteria(place: PlaceWithRelations): Set<string> {
    const set = new Set<string>();

    for (const pa of place.activities) {
      if (pa.isAllowed) set.add(`activity:${pa.activity.code}`);
    }
    if (place.feeType === 'FREE') set.add('fee:FREE');
    for (const pa of place.amenities) {
      if (pa.value) set.add(`amenity:${pa.amenity.code}`);
    }
    for (const tag of place.tags) set.add(`tag:${tag}`);

    const access = place.accessCondition;
    if (access) {
      if (access.roadType === 'ASPHALT') set.add('access:ASPHALT');
      if (access.normalCar) set.add('access:NORMAL_CAR');
      if (access.highClearance) set.add('access:HIGH_CLEARANCE');
      if (access.fourByFourRequired) set.add('access:FOUR_BY_FOUR');
    }

    const atmosphere = place.atmosphere;
    if (atmosphere) {
      if ((atmosphere.cellSignal ?? 0) >= ATMOSPHERE_THRESHOLDS.GOOD_SIGNAL) {
        set.add('atmosphere:GOOD_SIGNAL');
      }
      if ((atmosphere.quietness ?? 0) >= ATMOSPHERE_THRESHOLDS.QUIET_AREA) {
        set.add('atmosphere:QUIET_AREA');
      }
      if (
        atmosphere.crowdLevel !== null &&
        atmosphere.crowdLevel <= ATMOSPHERE_THRESHOLDS.LOW_CROWD
      ) {
        set.add('atmosphere:LOW_CROWD');
      }
    }

    return set;
  }

  async search(dto: SmartMatchSearchDto, userId?: string) {
    const unknown = dto.criteria.filter((id) => !CRITERIA_BY_ID.has(id));
    if (unknown.length > 0) {
      throw new BadRequestException({ code: 'SMART_MATCH_UNKNOWN_CRITERIA', unknown });
    }

    const where: Prisma.PlaceWhereInput = {
      publicationStatus: 'PUBLISHED',
      operatingStatus: { not: 'PERMANENTLY_CLOSED' },
    };

    if (dto.bounds) {
      const [minLat, minLng, maxLat, maxLng] = dto.bounds.split(',').map(Number);
      if ([minLat, minLng, maxLat, maxLng].every(Number.isFinite)) {
        where.publicLatitude = { gte: minLat, lte: maxLat };
        where.publicLongitude = { gte: minLng, lte: maxLng };
      }
    }

    if (dto.searchText?.trim()) {
      const term = dto.searchText.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
        { region: { contains: term, mode: 'insensitive' } },
      ];
    }

    const places = await this.prisma.place.findMany({ where, include: smartMatchInclude });

    // Tüm noktalar gösterilir; yüksek eşleşmeden düşüğe sıralanır (docs/01 §7.2)
    const results = places
      .map((place) => {
        const match = calculateSmartMatch(dto.criteria, this.satisfiedCriteria(place));
        return {
          place: {
            id: place.id,
            name: place.name,
            slug: place.slug,
            city: place.city,
            region: place.region,
            latitude: place.publicLatitude,
            longitude: place.publicLongitude,
            locationPrecision: place.locationPrecision,
            feeType: place.feeType,
            operatingStatus: place.operatingStatus,
            primaryActivity: place.primaryActivity,
            activities: place.activities
              .filter((pa) => pa.isAllowed)
              .sort((a, b) => a.activity.markerPriority - b.activity.markerPriority)
              .map((pa) => pa.activity.code),
            tags: place.tags,
            photoStatus: place.photoStatus,
            score: place.score
              ? {
                  overall: place.score.overallScore,
                  features: place.score.featuresScore,
                  userRating: place.score.userRating,
                  atmosphere: place.score.atmosphereScore,
                }
              : null,
          },
          matchPercentage: match.matchPercentage,
          matchedCriteria: match.matchedCriteria,
          missingCriteria: match.missingCriteria,
        };
      })
      .sort(
        (a, b) =>
          b.matchPercentage - a.matchPercentage ||
          (b.place.score?.overall ?? 0) - (a.place.score?.overall ?? 0),
      );

    const page = dto.page ?? 1;
    const pageSize = dto.pageSize ?? 50;
    const items = results.slice((page - 1) * pageSize, page * pageSize);

    // Giriş yapmış kullanıcı için arama geçmişine yaz
    if (userId) {
      await this.prisma.searchHistoryEntry.create({
        data: {
          userId,
          searchText: dto.searchText ?? null,
          criteriaJson: { criteria: dto.criteria },
        },
      });
    }

    return { total: results.length, page, pageSize, items };
  }
}
