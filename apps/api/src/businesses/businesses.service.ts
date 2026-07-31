import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClaimBusinessDto } from './businesses.dto';

@Injectable()
export class BusinessesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Kullanıcının işletmeleri ve bağlı noktaları */
  async mine(userId: string) {
    const businesses = await this.prisma.business.findMany({
      where: { ownerUserId: userId },
      include: { places: { include: { place: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return businesses.map((b) => ({
      id: b.id,
      name: b.name,
      verificationStatus: b.verificationStatus,
      places: b.places.map((bp) => ({ id: bp.place.id, name: bp.place.name })),
    }));
  }

  /**
   * Nokta sahipliği talebi. Doğrulama admin panelinden manuel yapılır
   * (docs/01 §17); onaylanana kadar resmî yanıt hakkı doğmaz.
   */
  async claim(userId: string, dto: ClaimBusinessDto) {
    const place = await this.prisma.place.findUnique({ where: { id: dto.placeId } });
    if (!place) throw new NotFoundException('PLACE_NOT_FOUND');

    // Aynı nokta için bekleyen/onaylı bir talep varsa tekrarlanamaz
    const existing = await this.prisma.businessPlace.findFirst({
      where: {
        placeId: dto.placeId,
        business: { verificationStatus: { in: ['PENDING', 'VERIFIED'] } },
      },
      include: { business: true },
    });
    if (existing) {
      throw new BadRequestException(
        existing.business.ownerUserId === userId
          ? 'BUSINESS_CLAIM_ALREADY_SUBMITTED'
          : 'BUSINESS_PLACE_ALREADY_CLAIMED',
      );
    }

    const business = await this.prisma.business.create({
      data: {
        ownerUserId: userId,
        name: dto.name.trim(),
        evidence: dto.evidence.trim(),
        places: { create: { placeId: dto.placeId } },
      },
    });
    return { id: business.id, verificationStatus: business.verificationStatus };
  }

  /**
   * Kullanıcının bir noktada resmî yanıt verme hakkı var mı?
   * Yalnızca VERIFIED işletme sahibi resmî yanıt yazabilir.
   */
  async officialResponderFor(userId: string, placeId: string) {
    const link = await this.prisma.businessPlace.findFirst({
      where: {
        placeId,
        business: { ownerUserId: userId, verificationStatus: 'VERIFIED' },
      },
      select: { businessId: true },
    });
    return link?.businessId ?? null;
  }
}
