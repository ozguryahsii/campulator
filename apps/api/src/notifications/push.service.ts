import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface PushPayload {
  titleKey: string;
  bodyKey: string;
  data?: Record<string, string>;
}

/**
 * Push gönderim soyutlaması (docs/02 §11). FCM_SERVICE_ACCOUNT_JSON tanımlı değilken
 * gönderimler log'a yazılır; anahtar eklendiğinde firebase-admin buraya bağlanır.
 * Geçersiz token'lar temizlenir; in-app bildirim ve push delivery ayrı kaydedilir.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private get configured(): boolean {
    return !!this.config.get<string>('FCM_SERVICE_ACCOUNT_JSON');
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<{ delivered: number }> {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId, revokedAt: null },
    });
    if (tokens.length === 0) return { delivered: 0 };

    if (!this.configured) {
      this.logger.log(
        `[DEV PUSH] user=${userId} cihaz=${tokens.length} ` +
          `title=${payload.titleKey} body=${payload.bodyKey} data=${JSON.stringify(payload.data ?? {})}`,
      );
      return { delivered: tokens.length };
    }

    // Gerçek FCM gönderimi anahtar teslimi sonrasında bağlanacak.
    this.logger.warn('FCM yapılandırılmış ancak gönderim entegrasyonu henüz bağlanmadı.');
    return { delivered: 0 };
  }
}
