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

# API'yi çalıştır (http://localhost:3001, Swagger: /docs)
pnpm --filter @campulator/api start:dev

# Mobil uygulama (Expo)
pnpm --filter @campulator/mobile start

# Admin panel (http://localhost:3000)
pnpm --filter @campulator/admin dev
```

## API Anahtarları

Proje anahtarsız çalışacak şekilde tasarlanmıştır. Google Maps, Google/Apple giriş ve
Firebase Cloud Messaging entegrasyonları soyutlanmıştır; ilgili `.env` değerleri boşken
mock/stub davranışı devreye girer. Gerçek anahtarlar eklendiğinde gerçek servisler kullanılır.
Ayrıntı: `docs/02_teknik_mimari.md`.

## İlerleme Takibi

Faz bazlı geliştirme durumu için: [`PROGRESS.md`](./PROGRESS.md)
