import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface AccessTokenPayload {
  sub: string;
  role: string;
  emailVerified: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
}

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  private get accessTtl() {
    return Number(this.config.get('JWT_ACCESS_TTL') ?? 900);
  }

  private get refreshTtl() {
    return Number(this.config.get('JWT_REFRESH_TTL') ?? 2_592_000);
  }

  async issuePair(
    user: { id: string; role: string; emailVerifiedAt: Date | null },
    deviceId?: string,
  ): Promise<TokenPair> {
    const payload: AccessTokenPayload = {
      sub: user.id,
      role: user.role,
      emailVerified: user.emailVerifiedAt !== null,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.accessTtl,
    });

    // Refresh token opak (JWT değil); yalnızca hash'i saklanır
    const refreshToken = randomBytes(48).toString('base64url');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256(refreshToken),
        deviceId: deviceId ?? null,
        expiresAt: new Date(Date.now() + this.refreshTtl * 1000),
      },
    });

    return { accessToken, refreshToken, accessTokenExpiresIn: this.accessTtl };
  }

  /** Refresh rotasyonu: eski token iptal edilir, yeni çift üretilir. */
  async rotate(refreshToken: string, deviceId?: string): Promise<TokenPair> {
    const record = await this.prisma.refreshToken.findFirst({
      where: { tokenHash: sha256(refreshToken) },
      include: { user: true },
    });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('AUTH_REFRESH_INVALID');
    }
    if (record.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('AUTH_ACCOUNT_INACTIVE');
    }
    await this.prisma.refreshToken.update({
      where: { id: record.id },
      data: { revokedAt: new Date() },
    });
    return this.issuePair(record.user, deviceId ?? record.deviceId ?? undefined);
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: sha256(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async verifyAccessToken(token: string): Promise<AccessTokenPayload> {
    try {
      return await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.get('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('AUTH_TOKEN_INVALID');
    }
  }
}
