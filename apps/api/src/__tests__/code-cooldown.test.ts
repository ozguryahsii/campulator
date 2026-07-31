import type { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth/auth.service';
import type { MailService } from '../auth/mail.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { SocialAuthService } from '../auth/social-auth.service';
import type { TokenService } from '../auth/token.service';

const USER = { id: 'user-1', email: 'kampci@example.com', status: 'ACTIVE', passwordHash: 'x' };

/**
 * Spam koruması (docs/01 §13): ilk koddan sonra 1 dakika, sonraki isteklerde
 * 5 dakika beklenir. Kayıtlı olmayan adrese e-posta gönderilmez ama hesabın
 * varlığı da sızdırılmaz.
 */
function build(options: { user?: Record<string, unknown> | null; recent?: { createdAt: Date }[] }) {
  const sendPasswordResetEmail = jest.fn();
  const sendVerificationEmail = jest.fn();
  const prisma = {
    // 'user' anahtarı verilmişse (null olsa bile) o kullanılır
    user: {
      findUnique: jest.fn().mockResolvedValue('user' in options ? options.user : USER),
    },
    passwordResetToken: {
      findMany: jest.fn().mockResolvedValue(options.recent ?? []),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    emailVerificationToken: {
      findMany: jest.fn().mockResolvedValue(options.recent ?? []),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
  };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    {} as TokenService,
    {} as SocialAuthService,
    { sendPasswordResetEmail, sendVerificationEmail } as unknown as MailService,
    { get: () => undefined } as unknown as ConfigService,
  );
  return { service, sendPasswordResetEmail, sendVerificationEmail };
}

const secondsAgo = (n: number) => ({ createdAt: new Date(Date.now() - n * 1000) });

describe('Şifre sıfırlama kodu — bekleme süresi', () => {
  it('ilk istekte kod gönderilir', async () => {
    const { service, sendPasswordResetEmail } = build({ recent: [] });

    const result = await service.requestPasswordReset(USER.email);

    expect(result.sent).toBe(true);
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  it('ilk koddan 30 sn sonra gönderilmez, kalan süre bildirilir', async () => {
    const { service, sendPasswordResetEmail } = build({ recent: [secondsAgo(30)] });

    const result = await service.requestPasswordReset(USER.email);

    expect(result.sent).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(25);
    expect(result.retryAfterSeconds).toBeLessThanOrEqual(30);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('ilk koddan 61 sn sonra ikinci kod gönderilir', async () => {
    const { service, sendPasswordResetEmail } = build({ recent: [secondsAgo(61)] });

    const result = await service.requestPasswordReset(USER.email);

    expect(result.sent).toBe(true);
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  it('ikinci koddan sonra bekleme 5 dakikaya çıkar', async () => {
    const { service, sendPasswordResetEmail } = build({
      recent: [secondsAgo(90), secondsAgo(200)],
    });

    const result = await service.requestPasswordReset(USER.email);

    expect(result.sent).toBe(false);
    // 300 - 90 = 210 sn civarı
    expect(result.retryAfterSeconds).toBeGreaterThan(200);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('5 dakika dolunca yeni kod gönderilir', async () => {
    const { service, sendPasswordResetEmail } = build({
      recent: [secondsAgo(301), secondsAgo(400)],
    });

    const result = await service.requestPasswordReset(USER.email);

    expect(result.sent).toBe(true);
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  it('kayıtlı olmayan adrese e-posta gönderilmez ama hesap varlığı sızmaz', async () => {
    const { service, sendPasswordResetEmail } = build({ user: null });

    const result = await service.requestPasswordReset('yok@example.com');

    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    // Yanıt gönderilmiş gibi görünür (hesap keşfi engellenir)
    expect(result.sent).toBe(true);
  });
});

describe('Doğrulama kodu — bekleme süresi', () => {
  it('doğrulanmış hesaba tekrar kod gönderilmez', async () => {
    const { service, sendVerificationEmail } = build({
      user: { ...USER, emailVerifiedAt: new Date() },
    });

    const result = await service.resendVerification(USER.email);

    expect(sendVerificationEmail).not.toHaveBeenCalled();
    expect(result.sent).toBe(true);
  });

  it('kayıt sırasında üretilen kod bekleme süresini başlatır', async () => {
    const { service, sendVerificationEmail } = build({
      user: { ...USER, emailVerifiedAt: null },
      recent: [secondsAgo(10)],
    });

    const result = await service.resendVerification(USER.email);

    expect(result.sent).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(45);
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });
});
