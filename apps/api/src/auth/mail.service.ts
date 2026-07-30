import { Injectable, Logger } from '@nestjs/common';

/**
 * E-posta gönderim soyutlaması. Geliştirmede mesajlar log'a yazılır;
 * production sağlayıcısı (SMTP/SES vb.) sonraki fazda bu arayüzün arkasına eklenecek.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    this.logger.log(
      `[DEV MAIL] Doğrulama e-postası → ${email} | token: ${token} | ` +
        `POST /auth/verify-email { "token": "${token}" }`,
    );
  }
}
