import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  ActivityCode,
  FeeType,
  PlaceTagCode,
  Prisma,
  ReportCategory,
  RoadType,
  VerificationVerdict,
} from '@prisma/client';
import { CampScoreService } from '../campscore/campscore.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateChangeRequestDto,
  CreatePlaceDto,
  CreateReportDto,
  CreateVerificationDto,
} from './contributions.dto';
import { blurCoordinates } from './location-privacy';

const DUPLICATE_RADIUS_METERS = 300;
const COMMUNITY_SUPPORT_THRESHOLD = 2;

/** İsim normalizasyonu: küçük harf (TR), aksan/noktalama temizliği */
function normalizeName(name: string): string {
  return name
    .toLocaleLowerCase('tr')
    .replace(/[çÇ]/g, 'c')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[ıİi]/g, 'i')
    .replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's')
    .replace(/[üÜ]/g, 'u')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

function namesSimilar(a: string, b: string): boolean {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  const distance = levenshtein(na, nb);
  return distance <= Math.max(2, Math.floor(Math.min(na.length, nb.length) * 0.25));
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

async function generateSlug(prisma: PrismaService, name: string): Promise<string> {
  const base = normalizeName(name).replace(/\s+/g, '-').slice(0, 60) || 'nokta';
  let slug = base;
  for (let i = 2; ; i++) {
    const exists = await prisma.place.findUnique({ where: { slug } });
    if (!exists) return slug;
    slug = `${base}-${i}`;
  }
}

@Injectable()
export class ContributionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly campScore: CampScoreService,
  ) {}

  /**
   * Mükerrer adayları: yakın koordinat (~300 m) VE/VEYA normalize isim benzerliği
   * (docs/01 §14). Yakın + benzer isim = güçlü şüphe.
   */
  async findDuplicateCandidates(
    latitude: number,
    longitude: number,
    name: string,
    excludeId?: string,
  ) {
    const delta = 0.02; // ~2 km tarama kutusu
    const nearby = await this.prisma.place.findMany({
      where: {
        id: excludeId ? { not: excludeId } : undefined,
        publicationStatus: { in: ['PUBLISHED', 'PENDING_REVIEW'] },
        exactLatitude: { gte: latitude - delta, lte: latitude + delta },
        exactLongitude: { gte: longitude - delta, lte: longitude + delta },
      },
      select: { id: true, name: true, exactLatitude: true, exactLongitude: true, slug: true },
    });

    return nearby
      .map((place) => {
        const distance = haversineMeters(
          latitude,
          longitude,
          place.exactLatitude,
          place.exactLongitude,
        );
        const similarName = namesSimilar(name, place.name);
        return { place, distance: Math.round(distance), similarName };
      })
      .filter((c) => c.distance <= DUPLICATE_RADIUS_METERS || c.similarName)
      .sort((a, b) => a.distance - b.distance)
      .map((c) => ({
        id: c.place.id,
        name: c.place.name,
        slug: c.place.slug,
        distanceMeters: c.distance,
        similarName: c.similarName,
      }));
  }

  async createPlace(userId: string, dto: CreatePlaceDto) {
    const profile = await this.prisma.userProfile.findUnique({ where: { userId } });
    // Güvenilir kullanıcıların noktaları doğrudan yayınlanır (docs/01 §13)
    const trusted =
      profile?.trustLevel === 'TRUSTED_CONTRIBUTOR' || profile?.trustLevel === 'EXPERT_CAMPER';

    const duplicates = await this.findDuplicateCandidates(dto.latitude, dto.longitude, dto.name);
    const strongDuplicate = duplicates.some((d) => d.similarName && d.distanceMeters <= 300);

    const precision = dto.locationPrecision ?? 'EXACT';
    const slug = await generateSlug(this.prisma, dto.name);

    const activities = await this.prisma.activity.findMany({
      where: { code: { in: dto.activities as ActivityCode[] } },
    });
    if (activities.length === 0) throw new BadRequestException('PLACE_ACTIVITY_REQUIRED');
    const primary = activities.sort((a, b) => a.markerPriority - b.markerPriority)[0];

    const amenities = dto.amenities?.length
      ? await this.prisma.amenity.findMany({ where: { code: { in: dto.amenities } } })
      : [];

    // Olası mükerrer kayıt moderasyona düşer; güvenilir kullanıcıda bile
    const publicationStatus = trusted && !strongDuplicate ? 'PUBLISHED' : 'PENDING_REVIEW';

    const place = await this.prisma.place.create({
      data: {
        name: dto.name.trim(),
        slug,
        description: dto.description ?? null,
        countryCode: 'TR',
        city: dto.city ?? null,
        region: dto.region ?? null,
        exactLatitude: dto.latitude,
        exactLongitude: dto.longitude,
        publicLatitude: dto.latitude,
        publicLongitude: dto.longitude,
        locationPrecision: precision,
        feeType: (dto.feeType ?? 'UNKNOWN') as FeeType,
        operatingStatus: 'OPEN',
        createdById: userId,
        publicationStatus,
        primaryActivity: primary.code,
        tags: (dto.tags ?? []) as PlaceTagCode[],
        photoStatus: 'PENDING',
        activities: {
          create: activities.map((activity) => ({ activityId: activity.id, isAllowed: true })),
        },
        amenities: {
          create: amenities.map((amenity) => ({ amenityId: amenity.id, value: true })),
        },
        ...(dto.access && {
          accessCondition: {
            create: {
              roadType: (dto.access.roadType ?? 'NORMAL_CAR') as RoadType,
              normalCar: dto.access.normalCar ?? true,
              highClearance: dto.access.highClearance ?? false,
              fourByFourRequired: dto.access.fourByFourRequired ?? false,
            },
          },
        }),
        ...(dto.atmosphere && {
          atmosphere: {
            create: {
              cellSignal: dto.atmosphere.cellSignal ?? null,
              quietness: dto.atmosphere.quietness ?? null,
              crowdLevel: dto.atmosphere.crowdLevel ?? null,
              privacy: dto.atmosphere.privacy ?? null,
              nightCalm: dto.atmosphere.nightCalm ?? null,
              socialLevel: dto.atmosphere.socialLevel ?? null,
            },
          },
        }),
      },
    });

    if (precision === 'APPROXIMATE') {
      const blurred = blurCoordinates(place.id, dto.latitude, dto.longitude, 500);
      await this.prisma.place.update({
        where: { id: place.id },
        data: { publicLatitude: blurred.latitude, publicLongitude: blurred.longitude },
      });
    }

    if (publicationStatus === 'PENDING_REVIEW') {
      await this.prisma.moderationItem.create({
        data: {
          itemType: duplicates.length > 0 ? 'DUPLICATE' : 'PLACE',
          itemId: place.id,
          reason:
            duplicates.length > 0
              ? `Olası mükerrer: ${duplicates.map((d) => `${d.name} (${d.distanceMeters}m)`).join(', ')}`
              : 'Yeni nokta onayı',
        },
      });
    }

    await this.campScore.recalculate(place.id);
    await this.prisma.trustEvent.create({
      data: {
        userId,
        eventType: 'PLACE_SUBMITTED',
        scoreDelta: 5,
        sourceType: 'PLACE',
        sourceId: place.id,
      },
    });

    return {
      id: place.id,
      slug: place.slug,
      publicationStatus,
      duplicateWarning: duplicates.length > 0 ? duplicates : null,
    };
  }

  async createVerification(userId: string, placeId: string, dto: CreateVerificationDto) {
    const place = await this.prisma.place.findUnique({ where: { id: placeId } });
    if (!place) throw new NotFoundException('PLACE_NOT_FOUND');

    let targetId: string | null = null;

    if (dto.targetType === 'AMENITY') {
      if (!dto.targetCode) throw new BadRequestException('VERIFICATION_TARGET_CODE_REQUIRED');
      const amenity = await this.prisma.amenity.findUnique({ where: { code: dto.targetCode } });
      if (!amenity) throw new NotFoundException('AMENITY_NOT_FOUND');
      targetId = String(amenity.id);

      const link = await this.prisma.placeAmenity.findUnique({
        where: { placeId_amenityId: { placeId, amenityId: amenity.id } },
      });
      if (link && dto.verdict !== 'CLOSED_REPORTED') {
        const confirmed = dto.verdict === 'CONFIRMED';
        const confirmationCount = link.confirmationCount + (confirmed ? 1 : 0);
        const disputeCount = link.disputeCount + (confirmed ? 0 : 1);
        await this.prisma.placeAmenity.update({
          where: { placeId_amenityId: { placeId, amenityId: amenity.id } },
          data: {
            confirmationCount,
            disputeCount,
            lastVerifiedAt: new Date(),
            verificationStatus:
              link.verificationStatus === 'ADMIN_VERIFIED'
                ? link.verificationStatus
                : disputeCount > confirmationCount
                  ? 'DISPUTED'
                  : confirmationCount >= COMMUNITY_SUPPORT_THRESHOLD
                    ? 'COMMUNITY_SUPPORTED'
                    : link.verificationStatus,
          },
        });
        await this.campScore.recalculate(placeId);
      }
    }

    const verification = await this.prisma.verification.create({
      data: {
        placeId,
        targetType: dto.targetType,
        targetId,
        userId,
        verdict: dto.verdict as VerificationVerdict,
      },
    });

    // "Kapalı görünüyor" bildirimi moderasyona düşer (docs/01 §21)
    if (dto.verdict === 'CLOSED_REPORTED') {
      await this.prisma.moderationItem.create({
        data: {
          itemType: 'PLACE_CLOSED_REPORT',
          itemId: placeId,
          reason: 'Kapalı görünüyor bildirimi',
        },
      });
    }

    await this.prisma.trustEvent.create({
      data: {
        userId,
        eventType: 'VERIFICATION_SUBMITTED',
        scoreDelta: 1,
        sourceType: 'VERIFICATION',
        sourceId: verification.id,
      },
    });

    return { id: verification.id, verdict: verification.verdict };
  }

  async createChangeRequest(userId: string, placeId: string, dto: CreateChangeRequestDto) {
    const place = await this.prisma.place.findUnique({ where: { id: placeId } });
    if (!place) throw new NotFoundException('PLACE_NOT_FOUND');

    const request = await this.prisma.changeRequest.create({
      data: {
        placeId,
        submittedBy: userId,
        type: dto.type,
        payloadJson: dto.payload as Prisma.InputJsonValue,
        evidenceText: dto.evidenceText ?? null,
      },
    });
    await this.prisma.moderationItem.create({
      data: { itemType: 'CHANGE_REQUEST', itemId: request.id, reason: dto.type },
    });
    return { id: request.id, status: request.status };
  }

  async createReport(userId: string, placeId: string, dto: CreateReportDto) {
    const place = await this.prisma.place.findUnique({ where: { id: placeId } });
    if (!place) throw new NotFoundException('PLACE_NOT_FOUND');

    const report = await this.prisma.report.create({
      data: {
        reporterUserId: userId,
        targetType: 'PLACE',
        targetId: placeId,
        category: dto.category as ReportCategory,
        description: dto.description ?? null,
      },
    });
    await this.prisma.moderationItem.create({
      data: { itemType: 'REPORT', itemId: report.id, reason: dto.category },
    });
    return { id: report.id, status: report.status };
  }
}
