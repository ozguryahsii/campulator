import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConsentType, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto, REQUIRED_CONSENTS, SocialLoginDto } from './dto/auth.dto';
import { MailService } from './mail.service';
import { SocialAuthService } from './social-auth.service';
import { TokenPair, TokenService } from './token.service';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

export interface AuthResult extends TokenPair {
  user: {
    id: string;
    email: string | null;
    displayName: string;
    emailVerified: boolean;
    role: string;
    trustLevel: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly social: SocialAuthService,
    private readonly mail: MailService,
  ) {}

  private toAuthResult(
    user: User & { profile: { displayName: string; trustLevel: string } | null },
    pair: TokenPair,
  ): AuthResult {
    return {
      ...pair,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.profile?.displayName ?? '',
        emailVerified: user.emailVerifiedAt !== null,
        role: user.role,
        trustLevel: user.profile?.trustLevel ?? 'NEW_USER',
      },
    };
  }

  async register(dto: RegisterDto): Promise<AuthResult> {
    const missing = REQUIRED_CONSENTS.filter((c) => !dto.acceptedConsents.includes(c));
    if (missing.length > 0) {
      throw new BadRequestException({
        code: 'AUTH_CONSENTS_REQUIRED',
        missingConsents: missing,
      });
    }

    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new ConflictException('AUTH_EMAIL_IN_USE');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const consents: ConsentType[] = [
      ...(REQUIRED_CONSENTS as readonly string[]),
      'LOCATION_DISCLOSURE',
      'CONTENT_SHARING_DISCLOSURE',
      'PUBLIC_VISIBILITY_DISCLOSURE',
      'MODERATION_DISCLOSURE',
      ...(dto.marketingConsent ? ['MARKETING'] : []),
    ] as ConsentType[];

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        profile: {
          create: {
            displayName: dto.displayName.trim(),
            locale: dto.locale ?? 'tr',
            marketingConsent: dto.marketingConsent ?? false,
          },
        },
        consents: { create: consents.map((consentType) => ({ consentType })) },
      },
      include: { profile: true },
    });

    await this.sendVerification(user.id, email);
    const pair = await this.tokens.issuePair(user);
    return this.toAuthResult(user, pair);
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });
    if (!user || !user.passwordHash || user.status === 'DELETED') {
      throw new UnauthorizedException('AUTH_INVALID_CREDENTIALS');
    }
    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('AUTH_ACCOUNT_SUSPENDED');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('AUTH_INVALID_CREDENTIALS');

    const pair = await this.tokens.issuePair(user, dto.deviceId);
    return this.toAuthResult(user, pair);
  }

  async socialLogin(provider: 'GOOGLE' | 'APPLE', dto: SocialLoginDto): Promise<AuthResult> {
    const identity = await this.social.verify(provider, dto.idToken);
    const email = identity.email.toLowerCase().trim();

    let user = await this.prisma.user.findFirst({
      where: {
        authProviders: { some: { provider, providerUserId: identity.providerUserId } },
      },
      include: { profile: true },
    });

    if (!user) {
      const byEmail = await this.prisma.user.findUnique({
        where: { email },
        include: { profile: true },
      });
      if (byEmail) {
        // Mevcut hesaba sağlayıcı bağlanır
        await this.prisma.authProvider.create({
          data: { userId: byEmail.id, provider, providerUserId: identity.providerUserId },
        });
        user = byEmail;
      } else {
        // Sağlayıcı e-postası doğrulanmış kabul edilir (docs/02 §3)
        user = await this.prisma.user.create({
          data: {
            email,
            emailVerifiedAt: new Date(),
            authProviders: {
              create: { provider, providerUserId: identity.providerUserId },
            },
            profile: { create: { displayName: identity.displayName } },
            consents: {
              create: (REQUIRED_CONSENTS as readonly string[]).map((consentType) => ({
                consentType: consentType as ConsentType,
              })),
            },
          },
          include: { profile: true },
        });
      }
    }

    if (user.status !== 'ACTIVE') throw new UnauthorizedException('AUTH_ACCOUNT_INACTIVE');
    const pair = await this.tokens.issuePair(user, dto.deviceId);
    return this.toAuthResult(user, pair);
  }

  private async sendVerification(userId: string, email: string): Promise<void> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: sha256(token),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    await this.mail.sendVerificationEmail(email, token);
  }

  async verifyEmail(token: string): Promise<{ verified: boolean }> {
    const record = await this.prisma.emailVerificationToken.findFirst({
      where: { tokenHash: sha256(token) },
      include: { user: true },
    });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('AUTH_VERIFICATION_TOKEN_INVALID');
    }
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: record.userId },
        data: { emailVerifiedAt: new Date() },
      }),
    ]);
    return { verified: true };
  }

  async resendVerification(email: string): Promise<{ sent: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    // Hesap var/yok bilgisi sızdırılmaz; her durumda aynı yanıt döner
    if (user && !user.emailVerifiedAt && user.status === 'ACTIVE' && user.email) {
      await this.sendVerification(user.id, user.email);
    }
    return { sent: true };
  }

  /**
   * Hesap silme (docs/01 §24): kamusal katkılar "Silinmiş Kullanıcı" adıyla kalır;
   * özel veriler, favoriler, koleksiyonlar, kayıtlı aramalar ve token'lar silinir.
   */
  async deleteAccount(userId: string): Promise<{ deleted: boolean }> {
    await this.prisma.$transaction([
      this.prisma.collection.deleteMany({ where: { userId } }),
      this.prisma.savedSearch.deleteMany({ where: { userId } }),
      this.prisma.searchHistoryEntry.deleteMany({ where: { userId } }),
      this.prisma.refreshToken.deleteMany({ where: { userId } }),
      this.prisma.deviceToken.deleteMany({ where: { userId } }),
      this.prisma.emailVerificationToken.deleteMany({ where: { userId } }),
      this.prisma.authProvider.deleteMany({ where: { userId } }),
      this.prisma.userProfile.update({
        where: { userId },
        data: { displayName: 'Silinmiş Kullanıcı', avatarUrl: null, bio: null },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: {
          email: null,
          passwordHash: null,
          status: 'DELETED',
          deletedAt: new Date(),
        },
      }),
    ]);
    return { deleted: true };
  }
}
