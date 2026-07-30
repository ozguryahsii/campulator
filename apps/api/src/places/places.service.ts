import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListPlacesQuery } from './places.dto';

const placeListInclude = {
  activities: { include: { activity: true } },
  score: true,
  photos: { where: { status: 'PUBLISHED' as const }, take: 1 },
} satisfies Prisma.PlaceInclude;

@Injectable()
export class PlacesService {
  constructor(private readonly prisma: PrismaService) {}

  private toListItem(place: Prisma.PlaceGetPayload<{ include: typeof placeListInclude }>) {
    const activities = place.activities
      .filter((pa) => pa.isAllowed)
      .sort((a, b) => a.activity.markerPriority - b.activity.markerPriority)
      .map((pa) => pa.activity.code);

    return {
      id: place.id,
      name: place.name,
      slug: place.slug,
      city: place.city,
      region: place.region,
      countryCode: place.countryCode,
      // Her zaman public koordinat döner; EXACT noktalarda gerçek değere eşittir
      latitude: place.publicLatitude,
      longitude: place.publicLongitude,
      locationPrecision: place.locationPrecision,
      approximateRadiusMeters:
        place.locationPrecision === 'APPROXIMATE' ? place.approximateRadiusMeters : null,
      feeType: place.feeType,
      operatingStatus: place.operatingStatus,
      primaryActivity: activities[0] ?? place.primaryActivity,
      activities,
      photoStatus: place.photoStatus,
      score: place.score
        ? {
            overall: place.score.overallScore,
            features: place.score.featuresScore,
            userRating: place.score.userRating,
            atmosphere: place.score.atmosphereScore,
          }
        : null,
    };
  }

  async list(query: ListPlacesQuery) {
    const where: Prisma.PlaceWhereInput = { publicationStatus: 'PUBLISHED' };

    // Kalıcı kapalı noktalar varsayılan gizli (docs/01 §21)
    if (query.operatingStatus) {
      where.operatingStatus = query.operatingStatus as Prisma.PlaceWhereInput['operatingStatus'];
    } else if (!query.includePermanentlyClosed) {
      where.operatingStatus = { not: 'PERMANENTLY_CLOSED' };
    }

    if (query.bounds) {
      const [minLat, minLng, maxLat, maxLng] = query.bounds.split(',').map(Number);
      if ([minLat, minLng, maxLat, maxLng].every(Number.isFinite)) {
        where.publicLatitude = { gte: minLat, lte: maxLat };
        where.publicLongitude = { gte: minLng, lte: maxLng };
      }
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { city: { contains: term, mode: 'insensitive' } },
        { region: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (query.feeType) where.feeType = query.feeType;

    // Filtreleme desteklenen TÜM aktiviteler üzerinden yapılır (docs/01 §9)
    if (query.activities?.length) {
      where.activities = {
        some: {
          isAllowed: true,
          activity: { code: { in: query.activities as Prisma.EnumActivityCodeFilter['in'] } },
        },
      };
    }

    if (query.amenities?.length) {
      where.AND = query.amenities.map((code) => ({
        amenities: { some: { value: true, amenity: { code } } },
      }));
    }

    if (query.minRating) {
      where.score = { userRating: { gte: query.minRating } };
    }

    const orderBy: Prisma.PlaceOrderByWithRelationInput =
      query.sort === 'name'
        ? { name: 'asc' }
        : query.sort === 'newest'
          ? { createdAt: 'desc' }
          : { score: { overallScore: 'desc' } };

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 100;

    const [total, places] = await this.prisma.$transaction([
      this.prisma.place.count({ where }),
      this.prisma.place.findMany({
        where,
        include: placeListInclude,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return {
      total,
      page,
      pageSize,
      items: places.map((p) => this.toListItem(p)),
    };
  }

  async getById(id: string) {
    const place = await this.prisma.place.findFirst({
      where: { id, publicationStatus: 'PUBLISHED' },
      include: {
        activities: { include: { activity: true } },
        amenities: { include: { amenity: true } },
        accessCondition: true,
        atmosphere: true,
        score: true,
        photos: { where: { status: 'PUBLISHED' }, orderBy: { createdAt: 'desc' } },
        verifications: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!place) throw new NotFoundException('PLACE_NOT_FOUND');

    return {
      ...this.toListItem(place),
      description: place.description,
      seasonalOpenFrom: place.seasonalOpenFrom,
      seasonalOpenTo: place.seasonalOpenTo,
      amenities: place.amenities
        .filter((pa) => pa.value)
        .map((pa) => ({
          code: pa.amenity.code,
          nameKey: pa.amenity.nameKey,
          verificationStatus: pa.verificationStatus,
          lastVerifiedAt: pa.lastVerifiedAt,
        })),
      access: place.accessCondition
        ? {
            roadType: place.accessCondition.roadType,
            normalCar: place.accessCondition.normalCar,
            highClearance: place.accessCondition.highClearance,
            fourByFourRequired: place.accessCondition.fourByFourRequired,
          }
        : null,
      atmosphere: place.atmosphere
        ? {
            cellSignal: place.atmosphere.cellSignal,
            quietness: place.atmosphere.quietness,
            crowdLevel: place.atmosphere.crowdLevel,
            privacy: place.atmosphere.privacy,
            nightCalm: place.atmosphere.nightCalm,
            socialLevel: place.atmosphere.socialLevel,
          }
        : null,
      photos: place.photos.map((photo) => ({ id: photo.id, storageKey: photo.storageKey })),
      lastVerifiedAt: place.verifications[0]?.createdAt ?? null,
      createdAt: place.createdAt,
    };
  }
}
