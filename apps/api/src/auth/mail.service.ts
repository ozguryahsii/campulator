import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/**
 * E-posta gönderim soyutlaması. `RESEND_API_KEY` tanımlıysa Resend üzerinden
 * gerçek e-posta gönderilir; tanımsızsa mesaj log'a yazılır (geliştirme modu).
 * Gönderim hatası kayıt akışını bozmaz — kullanıcı doğrulamayı yeniden isteyebilir.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly config: ConfigService) {}

  private get apiKey(): string | undefined {
    return this.config.get<string>('RESEND_API_KEY') || undefined;
  }

  private get from(): string {
    // Resend'de doğrulanmış alan adı yoksa yalnızca onboarding@resend.dev gönderebilir
    return this.config.get<string>('MAIL_FROM') || 'Campulator <onboarding@resend.dev>';
  }

  /** Uygulamayı açan derin bağlantı; mobilde VerifyEmail bileşeni işler */
  private verificationLink(token: string): string {
    const scheme = this.config.get<string>('APP_LINK_SCHEME') || 'campulator';
    return `${scheme}://verify-email?token=${token}`;
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const link = this.verificationLink(token);

    if (!this.apiKey) {
      this.logger.log(
        `[DEV MAIL] Doğrulama e-postası → ${email}\n` +
          `  Bağlantı: ${link}\n` +
          `  Token (elle giriş için): ${token}`,
      );
      return;
    }

    await this.send({
      to: email,
      subject: 'Campulator hesabını doğrula',
      html: verificationTemplate(link, token),
      text:
        `Campulator hesabını doğrulamak için bağlantıya dokun:\n${link}\n\n` +
        `Bağlantı çalışmazsa uygulamada Profil > Kodu elle gir adımından şu kodu kullan:\n${token}\n\n` +
        `Bu isteği sen yapmadıysan e-postayı yok sayabilirsin.`,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const scheme = this.config.get<string>('APP_LINK_SCHEME') || 'campulator';
    const link = `${scheme}://reset-password?token=${token}`;

    if (!this.apiKey) {
      this.logger.log(
        `[DEV MAIL] Şifre sıfırlama → ${email}\n` +
          `  Bağlantı: ${link}\n` +
          `  Token (elle giriş için): ${token}`,
      );
      return;
    }

    await this.send({
      to: email,
      subject: 'Campulator şifreni sıfırla',
      html: resetTemplate(link, token),
      text:
        `Şifreni sıfırlamak için bağlantıya dokun:\n${link}\n\n` +
        `Bağlantı çalışmazsa uygulamada kodu elle girebilirsin:\n${token}\n\n` +
        `Bağlantı 1 saat geçerlidir. Bu isteği sen yapmadıysan şifren değişmez, ` +
        `e-postayı yok sayabilirsin.`,
    });
  }

  /** Resend HTTP API çağrısı; hata fırlatmaz, log'a yazar */
  private async send(message: { to: string; subject: string; html: string; text: string }) {
    try {
      const response = await fetch(RESEND_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: this.from, ...message }),
      });

      if (!response.ok) {
        const detail = await response.text();
        this.logger.error(`Resend gönderimi başarısız (HTTP ${response.status}): ${detail}`);
        return;
      }
      this.logger.log(`Doğrulama e-postası gönderildi → ${message.to}`);
    } catch (error) {
      // Ağ hatası kayıt akışını kesmemeli
      this.logger.error(`Resend'e ulaşılamadı: ${(error as Error).message}`);
    }
  }
}

function verificationTemplate(link: string, token: string): string {
  return `<!doctype html>
<html lang="tr">
  <body style="margin:0;padding:24px;background:#08131F;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <table role="presentation" style="max-width:520px;margin:0 auto;background:#0F1D2E;border-radius:16px;padding:32px;">
      <tr><td>
        <h1 style="color:#F4F7FA;font-size:20px;margin:0 0 16px;">Campulator'a hoş geldin</h1>
        <p style="color:#A9B7C6;font-size:14px;line-height:22px;margin:0 0 24px;">
          Hesabını doğrulamak için aşağıdaki düğmeye dokun. Doğruladıktan sonra nokta
          ekleyebilir, yorum ve puan verebilirsin.
        </p>
        <a href="${link}"
           style="display:inline-block;background:#78C043;color:#08131F;font-weight:700;
                  text-decoration:none;padding:14px 28px;border-radius:12px;font-size:15px;">
          Hesabımı doğrula
        </a>
        <p style="color:#6B7C91;font-size:12px;line-height:20px;margin:24px 0 0;">
          Düğme çalışmazsa uygulamada <strong>Profil &rsaquo; Kodu elle gir</strong> adımından
          şu kodu kullan:<br />
          <code style="color:#A9B7C6;word-break:break-all;">${token}</code>
        </p>
        <p style="color:#6B7C91;font-size:12px;line-height:20px;margin:16px 0 0;">
          Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
}

function resetTemplate(link: string, token: string): string {
  return `<!doctype html>
<html lang="tr">
  <body style="margin:0;padding:24px;background:#08131F;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <table role="presentation" style="max-width:520px;margin:0 auto;background:#0F1D2E;border-radius:16px;padding:32px;">
      <tr><td>
        <h1 style="color:#F4F7FA;font-size:20px;margin:0 0 16px;">Şifreni sıfırla</h1>
        <p style="color:#A9B7C6;font-size:14px;line-height:22px;margin:0 0 24px;">
          Aşağıdaki düğmeye dokunarak yeni bir şifre belirleyebilirsin.
          Bu bağlantı <strong style="color:#F4F7FA;">1 saat</strong> geçerlidir.
        </p>
        <a href="${link}"
           style="display:inline-block;background:#78C043;color:#08131F;font-weight:700;
                  text-decoration:none;padding:14px 28px;border-radius:12px;font-size:15px;">
          Yeni şifre belirle
        </a>
        <p style="color:#6B7C91;font-size:12px;line-height:20px;margin:24px 0 0;">
          Düğme çalışmazsa uygulamadaki sıfırlama ekranına şu kodu yapıştır:<br />
          <code style="color:#A9B7C6;word-break:break-all;">${token}</code>
        </p>
        <p style="color:#6B7C91;font-size:12px;line-height:20px;margin:16px 0 0;">
          Bu isteği sen yapmadıysan şifren değişmez; e-postayı yok sayabilirsin.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
}
