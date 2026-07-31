import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SocialIdentity {
  providerUserId: string;
  email: string;
  displayName: string;
}

/**
 * Google/Apple kimlik doğrulama soyutlaması.
 *
 * Anahtar yapılandırılmamışken (GOOGLE_OAUTH_CLIENT_ID / APPLE_SIGN_IN_CLIENT_ID boş)
 * dev stub devreye girer: "dev:<email>:<Ad Soyad>" biçimindeki token kabul edilir.
 * Gerçek anahtar eklendiğinde sağlayıcının ID token doğrulaması burada yapılacak
 * (google-auth-library / Apple JWKS) — istemci ve API sözleşmesi değişmez.
 */
@Injectable()
export class SocialAuthService {
  private readonly logger = new Logger(SocialAuthService.name);

  constructor(private readonly config: ConfigService) {}

  async verify(provider: 'GOOGLE' | 'APPLE', idToken: string): Promise<SocialIdentity> {
    const clientId = this.config.get<string>(
      provider === 'GOOGLE' ? 'GOOGLE_OAUTH_CLIENT_ID' : 'APPLE_SIGN_IN_CLIENT_ID',
    );

    if (!clientId) {
      return this.verifyDevStub(provider, idToken);
    }

    // Gerçek doğrulama Faz 11 / anahtar teslimi sonrasında bağlanacak.
    throw new BadRequestException('AUTH_PROVIDER_NOT_IMPLEMENTED');
  }

  private verifyDevStub(provider: string, idToken: string): SocialIdentity {
    if (!idToken.startsWith('dev:')) {
      throw new BadRequestException('AUTH_PROVIDER_NOT_CONFIGURED');
    }
    const [, email, name] = idToken.split(':');
    if (!email || !email.includes('@')) {
      throw new BadRequestException('AUTH_STUB_TOKEN_INVALID');
    }
    this.logger.warn(`${provider} stub girişi kullanıldı (yalnızca geliştirme): ${email}`);
    return {
      providerUserId: `stub-${provider.toLowerCase()}-${email}`,
      email,
      displayName: name || email.split('@')[0],
    };
  }
}
