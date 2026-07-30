import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMeDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user || user.status === 'DELETED') throw new NotFoundException('USER_NOT_FOUND');
    return {
      id: user.id,
      email: user.email,
      emailVerified: user.emailVerifiedAt !== null,
      role: user.role,
      displayName: user.profile?.displayName ?? '',
      avatarUrl: user.profile?.avatarUrl ?? null,
      bio: user.profile?.bio ?? null,
      locale: user.profile?.locale ?? 'tr',
      trustLevel: user.profile?.trustLevel ?? 'NEW_USER',
      marketingConsent: user.profile?.marketingConsent ?? false,
      createdAt: user.createdAt,
    };
  }

  async updateMe(userId: string, dto: UpdateMeDto) {
    await this.prisma.userProfile.update({
      where: { userId },
      data: {
        ...(dto.displayName !== undefined && { displayName: dto.displayName.trim() }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.locale !== undefined && { locale: dto.locale }),
        ...(dto.marketingConsent !== undefined && { marketingConsent: dto.marketingConsent }),
      },
    });
    return this.getMe(userId);
  }

  /**
   * Herkese açık profil (docs/01 §16): ad, fotoğraf, biyografi, katkı istatistikleri,
   * güvenilirlik seviyesi. Sayısal güven puanı ve özel veriler (favoriler,
   * koleksiyonlar, kayıtlı aramalar) dönmez.
   */
  async getPublicProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
    if (!user || user.status === 'DELETED') throw new NotFoundException('USER_NOT_FOUND');

    const [reviewCount, ratingCount, placeCount, photoCount, approvedChangeCount] =
      await this.prisma.$transaction([
        this.prisma.review.count({ where: { userId, status: 'PUBLISHED' } }),
        this.prisma.userRating.count({ where: { userId, isActive: true } }),
        this.prisma.place.count({ where: { createdById: userId, publicationStatus: 'PUBLISHED' } }),
        this.prisma.photo.count({ where: { uploaderUserId: userId, status: 'PUBLISHED' } }),
        this.prisma.changeRequest.count({ where: { submittedBy: userId, status: 'APPROVED' } }),
      ]);

    return {
      id: user.id,
      displayName: user.profile?.displayName ?? 'Silinmiş Kullanıcı',
      avatarUrl: user.profile?.avatarUrl ?? null,
      bio: user.profile?.bio ?? null,
      trustLevel: user.profile?.trustLevel ?? 'NEW_USER',
      memberSince: user.createdAt,
      stats: {
        reviews: reviewCount,
        ratings: ratingCount,
        addedPlaces: placeCount,
        photos: photoCount,
        approvedChanges: approvedChangeCount,
      },
    };
  }
}
