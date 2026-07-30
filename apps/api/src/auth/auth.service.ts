import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConsentType, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomInt } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  REQUIRED_CONSENTS,
  SocialLoginDto,
} from './dto/auth.dto';
import { MailService } from './mail.service';
import { SocialAuthService } from './social-auth.service';
import { TokenPair, TokenService } from './token.service';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

/** E-posta ile gönderilen 6 haneli doğrulama kodu */
const CODE_LENGTH = 6;
/** Kısa kod kaba kuvvete açık: kısa ömür + sınırlı deneme */
const CODE_TTL_MS = 15 * 60 * 1000;
const MAX_CODE_ATTEMPTS = 5;

function generateCode(): string {
  // randomInt kriptografik olarak güvenli; baştaki sıfırlar korunur
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, '0');
}

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
    private readonly config: ConfigService,
  ) {}

  /**
   * Geliştirme kolaylığı: AUTH_AUTO_VERIFY_EMAIL=true iken yeni kayıtlar
   * doğrulanmış sayılır ve doğrulama e-postası atlanır. Production'da false
   * bırakılır; docs/01 §5'teki zorunlu doğrulama kuralı aynen geçerli olur.
   */
  private get autoVerifyEmail(): boolean {
    return this.config.get('AUTH_AUTO_VERIFY_EMAIL') === 'true';
  }

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
        emailVerifiedAt: this.autoVerifyEmail ? new Date() : null,
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

    if (!this.autoVerifyEmail) {
      await this.sendVerification(user.id, email);
    }
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
    // Bekleyen eski kodlar geçersizleşsin; her zaman tek geçerli kod olur
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
    const code = generateCode();
    await this.prisma.emailVerificationToken.create({
      data: {
        userId,
        tokenHash: sha256(code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    });
    await this.mail.sendVerificationEmail(email, code);
  }

  /**
   * 6 haneli kod yalnızca ilgili kullanıcı için geçerlidir; bu yüzden e-posta
   * ile birlikte doğrulanır. Hatalı deneme sayısı aşılırsa kod iptal edilir.
   */
  async verifyEmail(email: string, code: string): Promise<{ verified: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user) throw new BadRequestException('AUTH_VERIFICATION_CODE_INVALID');

    const record = await this.prisma.emailVerificationToken.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('AUTH_VERIFICATION_CODE_INVALID');
    }
    if (record.attempts >= MAX_CODE_ATTEMPTS) {
      await this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      throw new BadRequestException('AUTH_CODE_TOO_MANY_ATTEMPTS');
    }
    if (record.tokenHash !== sha256(code.trim())) {
      await this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('AUTH_VERIFICATION_CODE_INVALID');
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
  /**
   * Şifre sıfırlama talebi. Hesap keşfini önlemek için e-posta kayıtlı olmasa
   * da aynı yanıt döner; token yalnızca gerçek hesap varsa üretilir.
   */
  async requestPasswordReset(email: string): Promise<{ sent: boolean }> {
    const normalized = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: normalized } });

    if (user && user.status === 'ACTIVE' && user.passwordHash) {
      // Bekleyen eski talepler geçersizleşsin
      await this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      const code = generateCode();
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: sha256(code),
          expiresAt: new Date(Date.now() + CODE_TTL_MS),
        },
      });
      await this.mail.sendPasswordResetEmail(normalized, code);
    }
    return { sent: true };
  }

  /** Kod ile yeni şifre belirleme; tüm oturumlar kapanır */
  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<{ reset: boolean }> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!user) throw new BadRequestException('AUTH_RESET_CODE_INVALID');

    const record = await this.prisma.passwordResetToken.findFirst({
      where: { userId: user.id, usedAt: null },
      orderBy: { createdAt: 'desc' },
      include: { user: true },
    });
    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('AUTH_RESET_CODE_INVALID');
    }
    if (record.attempts >= MAX_CODE_ATTEMPTS) {
      await this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      });
      throw new BadRequestException('AUTH_CODE_TOO_MANY_ATTEMPTS');
    }
    if (record.tokenHash !== sha256(code.trim())) {
      await this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('AUTH_RESET_CODE_INVALID');
    }
    if (record.user.status !== 'ACTIVE') throw new UnauthorizedException('AUTH_ACCOUNT_INACTIVE');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash: await bcrypt.hash(newPassword, 10) },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);
    await this.tokens.revokeAllForUser(record.userId);
    return { reset: true };
  }

  /**
   * Şifre değiştirme. Doğrulama sonrası tüm refresh token'lar iptal edilir;
   * diğer cihazlardaki oturumlar kapanır (docs/02 §4).
   */
  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ changed: boolean }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('AUTH_INVALID_CREDENTIALS');
    // Yalnızca sosyal giriş kullanan hesapta şifre yoktur
    if (!user.passwordHash) throw new BadRequestException('AUTH_PASSWORD_NOT_SET');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('AUTH_CURRENT_PASSWORD_WRONG');
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('AUTH_PASSWORD_UNCHANGED');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, 10) },
    });
    await this.tokens.revokeAllForUser(userId);
    return { changed: true };
  }

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
