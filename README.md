# Campulator

Kamp, karavan, piknik ve mangal noktalarını harita üzerinde gösteren; gelişmiş filtreleme, Smart Match, CampScore, kullanıcı katkısı ve karşılaştırma özellikleri sunan mobil platform.

> Find campsites. Compare spots. Camp smarter.

## Depo Yapısı (pnpm monorepo)

| Yol               | Açıklama                                                        |
| ----------------- | --------------------------------------------------------------- |
| `apps/mobile`     | React Native + Expo + TypeScript mobil uygulama (iOS / Android) |
| `apps/api`        | NestJS + PostgreSQL + Prisma REST API                           |
| `apps/admin`      | Next.js + Tailwind yönetici ve moderasyon paneli                |
| `packages/shared` | Ortak enum, tip ve CampScore/Smart Match hesap mantığı          |
| `docs/`           | Ürün gereksinimleri ve teknik dokümantasyon                     |

## Gereksinimler

- Node.js >= 20
- pnpm >= 10 (`corepack enable`)
- Docker (PostgreSQL için)

## Kurulum

```bash
pnpm install

# PostgreSQL'i başlat
pnpm db:up

# API ortam değişkenleri
cp apps/api/.env.example apps/api/.env

# Veritabanı şemasını uygula + seed
pnpm --filter @campulator/api db:push
pnpm --filter @campulator/api db:seed

# API'yi çalıştır (http://localhost:3399, Swagger: /docs)
pnpm --filter @campulator/api start:dev

# Mobil uygulama (Expo)
pnpm --filter @campulator/mobile start

# Admin panel (http://localhost:3398)
pnpm --filter @campulator/admin dev
```

## Admin Paneli Girişi

Seed, admin panelinde oturum açabilen bir `SUPER_ADMIN` hesabı oluşturur:

| E-posta                  | Şifre              |
| ------------------------ | ------------------ |
| `admin@campulator.local` | `CampulatorAdmin1` |

Farklı bir hesap için seed'i şu değişkenlerle çalıştırın:

```bash
ADMIN_SEED_EMAIL=ben@ornek.com ADMIN_SEED_PASSWORD='GucluSifre123' \
  pnpm --filter @campulator/api db:seed
```

> Yayına çıkmadan önce bu varsayılan şifre mutlaka değiştirilmelidir.

## E-posta Gönderimi (Resend)

Doğrulama e-postaları Resend üzerinden gönderilir. `RESEND_API_KEY` boşken
gönderim yapılmaz, e-posta içeriği API log'una yazılır (geliştirme modu).

1. https://resend.com/api-keys adresinden bir anahtar oluşturun (`re_` ile başlar).
2. `apps/api/.env` dosyasına ekleyin:

```bash
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
MAIL_FROM=Campulator <onboarding@resend.dev>
APP_LINK_SCHEME=campulator
```

3. API'yi yeniden başlatın. Kayıt olunca terminalde
   `Doğrulama e-postası gönderildi → ...` satırını görürsünüz.

> **Anahtarı asla koda yazmayın, commit etmeyin.** `.env` zaten `.gitignore`
> içinde. Anahtar sızarsa Resend panelinden iptal edip yenisini üretin.

### Alan adı doğrulanmadan önceki kısıtlar

Resend'de kendi alan adınızı doğrulamadıysanız:

- Gönderen adresi **yalnızca** `onboarding@resend.dev` olabilir.
- Alıcı **yalnızca** Resend hesabınızın kendi e-posta adresi olabilir; başka
  adreslere gönderim `403` ile reddedilir (log'da görünür, uygulama çalışmaya
  devam eder).

Gerçek kullanıcılara göndermek için https://resend.com/domains adresinden alan
adınızı ekleyip DNS kayıtlarını (SPF, DKIM) doğrulayın, sonra `MAIL_FROM`
değerini `Campulator <no-reply@alanadiniz.com>` yapın.

### Doğrulamayı uçtan uca test etme

`.env` içinde `AUTH_AUTO_VERIFY_EMAIL=false` yapın (aksi halde kayıtlar zaten
doğrulanmış sayılır ve e-posta akışı devreye girmez), API'yi yeniden başlatın,
uygulamadan kayıt olun. Gelen e-postadaki düğme uygulamayı açıp hesabı doğrular;
düğme çalışmazsa Profil ekranındaki **Kodu elle gir** adımına e-postadaki kodu
yapıştırabilirsiniz.

## API Anahtarları

Proje anahtarsız çalışacak şekilde tasarlanmıştır. Google Maps, Google/Apple giriş ve
Firebase Cloud Messaging entegrasyonları soyutlanmıştır; ilgili `.env` değerleri boşken
mock/stub davranışı devreye girer. Gerçek anahtarlar eklendiğinde gerçek servisler kullanılır.
Ayrıntı: `docs/02_teknik_mimari.md`.

## İlerleme Takibi

Faz bazlı geliştirme durumu için: [`PROGRESS.md`](./PROGRESS.md)
