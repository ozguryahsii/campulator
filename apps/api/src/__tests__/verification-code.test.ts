import { createHash } from 'crypto';
import { AuthService } from '../auth/auth.service';
import type { ConfigService } from '@nestjs/config';
import type { MailService } from '../auth/mail.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { SocialAuthService } from '../auth/social-auth.service';
import type { TokenService } from '../auth/token.service';

const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
const CODE = '482913';
const USER = { id: 'user-1', email: 'kampci@example.com', status: 'ACTIVE' };

/**
 * 6 haneli kod kısa olduğu için kaba kuvvete açıktır; doğrulama yalnızca
 * ilgili kullanıcının en güncel kodunu, sınırlı denemeyle kabul etmelidir.
 */
function build(
  record: Record<string, unknown> | null,
  user: Record<string, unknown> | null = USER,
) {
  const prisma = {
    user: { findUnique: jest.fn().mockResolvedValue(user), update: jest.fn() },
    emailVerificationToken: {
      findFirst: jest.fn().mockResolvedValue(record),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    {} as TokenService,
    {} as SocialAuthService,
    { sendVerificationEmail: jest.fn() } as unknown as MailService,
    { get: () => undefined } as unknown as ConfigService,
  );
  return { service, prisma };
}

function validRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'token-1',
    userId: USER.id,
    tokenHash: sha256(CODE),
    expiresAt: new Date(Date.now() + 60_000),
    attempts: 0,
    ...overrides,
  };
}

describe('AuthService.verifyEmail — 6 haneli kod', () => {
  it('doğru kod hesabı doğrular', async () => {
    const { service, prisma } = build(validRecord());

    await expect(service.verifyEmail(USER.email, CODE)).resolves.toEqual({ verified: true });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('kod yalnızca ilgili kullanıcı için aranır', async () => {
    const { service, prisma } = build(validRecord());

    await service.verifyEmail(USER.email, CODE);

    expect(prisma.emailVerificationToken.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER.id, usedAt: null } }),
    );
  });

  it('hatalı kod deneme sayacını artırır', async () => {
    const { service, prisma } = build(validRecord());

    await expect(service.verifyEmail(USER.email, '000000')).rejects.toMatchObject({
      response: { message: 'AUTH_VERIFICATION_CODE_INVALID' },
    });
    expect(prisma.emailVerificationToken.update).toHaveBeenCalledWith({
      where: { id: 'token-1' },
      data: { attempts: { increment: 1 } },
    });
  });

  it('5 hatalı denemeden sonra kod iptal edilir', async () => {
    const { service, prisma } = build(validRecord({ attempts: 5 }));

    await expect(service.verifyEmail(USER.email, CODE)).rejects.toMatchObject({
      response: { message: 'AUTH_CODE_TOO_MANY_ATTEMPTS' },
    });
    // Kod kullanılmış işaretlenir; doğru kodla bile artık geçmez
    expect(prisma.emailVerificationToken.update).toHaveBeenCalledWith({
      where: { id: 'token-1' },
      data: { usedAt: expect.any(Date) },
    });
  });

  it('süresi dolmuş kod reddedilir', async () => {
    const { service } = build(validRecord({ expiresAt: new Date(Date.now() - 1000) }));

    await expect(service.verifyEmail(USER.email, CODE)).rejects.toMatchObject({
      response: { message: 'AUTH_VERIFICATION_CODE_INVALID' },
    });
  });

  it('bilinmeyen e-posta için hesap varlığı sızdırılmaz', async () => {
    const { service } = build(null, null);

    await expect(service.verifyEmail('yok@example.com', CODE)).rejects.toMatchObject({
      response: { message: 'AUTH_VERIFICATION_CODE_INVALID' },
    });
  });
});
