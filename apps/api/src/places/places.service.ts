import { Injectable, NotFoundException } from '@nestjs/common';
import { PlaceTagCode, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { toPhotoResponse } from '../storage/photo-url';
import { ListPlacesQuery } from './places.dto';

/** Mesafe filtresi/sıralaması için kuş uçuşu mesafe (metre) */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const placeListInclude = {
  activities: { include: { activity: true } },
  score: true,
  photos: { where: { status: 'PUBLISHED' as const }, take: 1 },
  translations: true,
} satisfies Prisma.PlaceInclude;

/** İstenen dilde çeviri varsa onu, yoksa varsayılan metni döner (docs/06) */
export function localized(
  translations: { locale: string; name: string | null; description: string | null }[],
  locale: string | undefined,
  field: 'name' | 'description',
  fallback: string | null,
) {
  if (!locale || locale === 'tr') return fallback;
  return translations.find((tr) => tr.locale === locale)?.[field] ?? fallback;
}

@Injectable()
export class PlacesService {
  constructor(private readonly prisma: PrismaService) {}

  private toListItem(
    place: Prisma.PlaceGetPayload<{ include: typeof placeListInclude }>,
    locale?: string,
  ) {
    const activities = place.activities
      .filter((pa) => pa.isAllowed)
      .sort((a, b) => a.activity.markerPriority - b.activity.markerPriority)
      .map((pa) => pa.activity.code);

    return {
      id: place.id,
      name: localized(place.translations, locale, 'name', place.name) ?? place.name,
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
      tags: place.tags,
      photoStatus: place.photoStatus,
      // Liste/harita kartlarında kapak görseli; dış kaynaklı olabilir
      coverPhoto: place.photos[0] ? toPhotoResponse(place.photos[0]) : null,
      // ODbL gereği içe aktarılan noktalarda kaynak gösterimi zorunlu
      dataSource: place.dataSource,
      attribution: place.attribution,
      sourceUrl: place.sourceUrl,
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

    if (query.tags?.length) {
      where.tags = { hasEvery: query.tags as PlaceTagCode[] };
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

    const hasGeoFilter =
      Number.isFinite(query.nearLatitude) && Number.isFinite(query.nearLongitude);

    // Mesafe filtresi/sıralaması SQL'de kolay değil; kayıt sayısı ölçeğinde
    // uygulama katmanında hesaplanır (indeks + bounds ile aday küme daraltılır).
    if (hasGeoFilter) {
      const all = await this.prisma.place.findMany({ where, include: placeListInclude });
      const withDistance = all
        .map((place) => ({
          place,
          distanceMeters: Math.round(
            haversineMeters(
              query.nearLatitude!,
              query.nearLongitude!,
              place.publicLatitude,
              place.publicLongitude,
            ),
          ),
        }))
        .filter(
          (entry) => !query.maxDistanceKm || entry.distanceMeters <= query.maxDistanceKm * 1000,
        );

      if (query.sort === 'distance' || !query.sort) {
        withDistance.sort((a, b) => a.distanceMeters - b.distanceMeters);
      } else if (query.sort === 'name') {
        withDistance.sort((a, b) => a.place.name.localeCompare(b.place.name, 'tr'));
      } else if (query.sort === 'newest') {
        withDistance.sort((a, b) => b.place.createdAt.getTime() - a.place.createdAt.getTime());
      } else {
        withDistance.sort(
          (a, b) => (b.place.score?.overallScore ?? 0) - (a.place.score?.overallScore ?? 0),
        );
      }

      const paged = withDistance.slice((page - 1) * pageSize, page * pageSize);
      return {
        total: withDistance.length,
        page,
        pageSize,
        items: paged.map((entry) => ({
          ...this.toListItem(entry.place, query.locale),
          distanceMeters: entry.distanceMeters,
        })),
      };
    }

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
      items: places.map((p) => this.toListItem(p, query.locale)),
    };
  }

  async getById(id: string, locale?: string) {
    const place = await this.prisma.place.findFirst({
      where: { id, publicationStatus: 'PUBLISHED' },
      include: {
        translations: true,
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
      ...this.toListItem(place, locale),
      description: localized(place.translations, locale, 'description', place.description),
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
      photos: place.photos.map(toPhotoResponse),
      lastVerifiedAt: place.verifications[0]?.createdAt ?? null,
      createdAt: place.createdAt,
    };
  }
}
