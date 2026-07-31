import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

/**
 * E-posta gönderim soyutlaması. `RESEND_API_KEY` tanımlıysa Resend üzerinden
 * gerçek e-posta gönderilir; tanımsızsa mesaj log'a yazılır (geliştirme modu).
 * Gönderim hatası kayıt akışını bozmaz — kullanıcı kodu yeniden isteyebilir.
 *
 * E-postalarda bağlantı yoktur; kullanıcı 6 haneli kodu uygulamaya girer.
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

  async sendVerificationEmail(email: string, code: string): Promise<void> {
    if (!this.apiKey) {
      this.logger.log(`[DEV MAIL] E-posta doğrulama kodu → ${email}: ${code}`);
      return;
    }
    await this.send({
      to: email,
      subject: `Campulator doğrulama kodun: ${code}`,
      html: codeTemplate({
        title: 'E-posta adresini doğrula',
        intro:
          'Campulator hesabını doğrulamak için aşağıdaki kodu uygulamaya gir. ' +
          'Doğruladıktan sonra nokta ekleyebilir, yorum ve puan verebilirsin.',
        code,
      }),
      text:
        `Campulator doğrulama kodun: ${code}\n\n` +
        `Kodu uygulamadaki Profil ekranına gir. Kod 15 dakika geçerlidir.\n\n` +
        `Bu isteği sen yapmadıysan e-postayı yok sayabilirsin.`,
    });
  }

  async sendPasswordResetEmail(email: string, code: string): Promise<void> {
    if (!this.apiKey) {
      this.logger.log(`[DEV MAIL] Şifre sıfırlama kodu → ${email}: ${code}`);
      return;
    }
    await this.send({
      to: email,
      subject: `Campulator şifre sıfırlama kodun: ${code}`,
      html: codeTemplate({
        title: 'Şifreni sıfırla',
        intro: 'Yeni şifreni belirlemek için aşağıdaki kodu uygulamaya gir.',
        code,
      }),
      text:
        `Campulator şifre sıfırlama kodun: ${code}\n\n` +
        `Kodu uygulamadaki şifre sıfırlama ekranına gir. Kod 15 dakika geçerlidir.\n\n` +
        `Bu isteği sen yapmadıysan şifren değişmez; e-postayı yok sayabilirsin.`,
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
      this.logger.log(`E-posta gönderildi → ${message.to}`);
    } catch (error) {
      // Ağ hatası kayıt akışını kesmemeli
      this.logger.error(`Resend'e ulaşılamadı: ${(error as Error).message}`);
    }
  }
}

/** Tek kullanımlık kod e-postası; bağlantı içermez */
function codeTemplate({ title, intro, code }: { title: string; intro: string; code: string }) {
  return `<!doctype html>
<html lang="tr">
  <body style="margin:0;padding:24px;background:#08131F;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
    <table role="presentation" style="max-width:520px;margin:0 auto;background:#0F1D2E;border-radius:16px;padding:32px;">
      <tr><td>
        <h1 style="color:#F4F7FA;font-size:20px;margin:0 0 16px;">${title}</h1>
        <p style="color:#A9B7C6;font-size:14px;line-height:22px;margin:0 0 24px;">${intro}</p>
        <div style="background:#08131F;border:1px solid #1E3A5F;border-radius:14px;
                    padding:20px;text-align:center;">
          <div style="color:#78C043;font-size:34px;font-weight:800;letter-spacing:10px;
                      font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${code}</div>
        </div>
        <p style="color:#6B7C91;font-size:12px;line-height:20px;margin:24px 0 0;">
          Kod <strong style="color:#A9B7C6;">15 dakika</strong> geçerlidir ve yalnızca bir kez
          kullanılabilir.
        </p>
        <p style="color:#6B7C91;font-size:12px;line-height:20px;margin:12px 0 0;">
          Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
}
