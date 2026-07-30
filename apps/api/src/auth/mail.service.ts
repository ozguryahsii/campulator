import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * E-posta gönderim soyutlaması. Geliştirmede mesajlar log'a yazılır;
 * production sağlayıcısı (SMTP/SES vb.) sonraki fazda bu arayüzün arkasına eklenecek.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  /** Uygulamayı açan derin bağlantı; mobilde VerifyEmail bileşeni işler */
  private verificationLink(token: string): string {
    const scheme = this.config.get('APP_LINK_SCHEME') ?? 'campulator';
    return `${scheme}://verify-email?token=${token}`;
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    this.logger.log(
      `[DEV MAIL] Doğrulama e-postası → ${email}\n` +
        `  Bağlantı: ${this.verificationLink(token)}\n` +
        `  Token (elle giriş için): ${token}`,
    );
  }
}
