import type { ConfigService } from '@nestjs/config';
import { MailService } from '../auth/mail.service';

/**
 * MailService anahtar varken Resend'e gider, yokken log'a düşer.
 * Gönderim hatası kayıt akışını bozmamalı.
 */
function createService(env: Record<string, string | undefined>) {
  const config = { get: (key: string) => env[key] } as unknown as ConfigService;
  return new MailService(config);
}

describe('MailService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('anahtar yokken ağa çıkmaz (geliştirme modu)', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    await createService({}).sendVerificationEmail('a@b.com', 'token-123');

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('anahtar varken Resend API çağrılır', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true, text: async () => '' });
    global.fetch = fetchMock as unknown as typeof fetch;

    await createService({
      RESEND_API_KEY: 'test-key',
      MAIL_FROM: 'Campulator <no-reply@campulator.app>',
      APP_LINK_SCHEME: 'campulator',
    }).sendVerificationEmail('kampci@example.com', 'token-123');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key');

    const body = JSON.parse(init.body as string);
    expect(body.from).toBe('Campulator <no-reply@campulator.app>');
    expect(body.to).toBe('kampci@example.com');
    // Derin bağlantı ve elle giriş kodu e-postada bulunmalı
    expect(body.html).toContain('campulator://verify-email?token=token-123');
    expect(body.text).toContain('token-123');
  });

  it('Resend hata dönerse istisna fırlatılmaz', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 422,
      text: async () => 'domain not verified',
    }) as unknown as typeof fetch;

    await expect(
      createService({ RESEND_API_KEY: 'test-key' }).sendVerificationEmail('a@b.com', 'tkn'),
    ).resolves.toBeUndefined();
  });

  it('ağ hatasında istisna fırlatılmaz', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ENOTFOUND')) as unknown as typeof fetch;

    await expect(
      createService({ RESEND_API_KEY: 'test-key' }).sendVerificationEmail('a@b.com', 'tkn'),
    ).resolves.toBeUndefined();
  });
});
