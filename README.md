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

### Doğrulama ve şifre sıfırlama akışı

Her ikisi de **6 haneli kod** ile çalışır; e-postalarda bağlantı yoktur.

- Kod 15 dakika geçerlidir ve tek kullanımlıktır.
- Yeni kod istendiğinde önceki kod geçersizleşir.
- 5 hatalı denemeden sonra kod iptal olur, yeni kod istenmesi gerekir.
- Kod hash'lenerek saklanır ve yalnızca ilgili kullanıcı için geçerlidir
  (uçlar e-posta + kod ister).

Uçtan uca test etmek için `.env` içinde `AUTH_AUTO_VERIFY_EMAIL=false` yapın
(aksi halde kayıtlar zaten doğrulanmış sayılır), API'yi yeniden başlatın ve
uygulamadan kayıt olun. Kod Profil ekranındaki alana girilir. Anahtar
tanımlamadıysanız kod API log'unda görünür.

## Gerçek Veri: OpenStreetMap İçe Aktarımı

Kamp/karavan noktaları OpenStreetMap'ten çekilir. İki adım vardır: önce
`tools/global-pipeline` (Python) JSONL üretir, sonra API'deki içe aktarıcı
JSONL'i veritabanına yazar.

### 1) Veriyi çek (Python)

```bash
cd tools/global-pipeline
python3 -m venv .venv && source .venv/bin/activate
pip install -e .            # PBF için: pip install -e ".[pbf]"

# A) Overpass API ile (hızlı başlangıç, PBF indirmeye gerek yok)
#    bbox sırası: min_lat,min_lng,max_lat,max_lng
campulator-pipeline fetch --bbox 35.8,25.6,42.2,44.9 --output ./out          # Türkiye
campulator-pipeline fetch --bbox 35.8,25.6,42.2,44.9 --output ./out --enrich-wikimedia

# B) PBF dosyasından (tüm dünya / büyük bölgeler için; pyosmium gerekir)
campulator-pipeline run --pbf ./turkey-latest.osm.pbf --output ./out
```

Çıktı: `out/places.jsonl`, `out/photos.jsonl`, `out/rejected.jsonl`, `out/stats.json`.

Overpass ücretsiz ve kotalıdır: `--step` ile alan küçük kutulara bölünür,
`--sleep-seconds` ile istekler arasında beklenir. Geniş alanlarda değerleri
artırın; kota hatası alan kutu atlanır ve iş durmaz.

### 2) Veritabanına aktar (API)

```bash
pnpm --filter @campulator/api import:places -- \
  --places tools/global-pipeline/out/places.jsonl \
  --photos tools/global-pipeline/out/photos.jsonl
```

Seçenekler: `--bbox minLat,minLng,maxLat,maxLng` (Python tarafıyla aynı sıra;
yalnızca bir bölgeyi al),
`--limit N`, `--dry-run` (yazmadan sayar).

- İçe aktarım **idempotent**'tir: `external_id` (ör. `osm:way:123`) üzerinden
  eşleşir, tekrar çalıştırınca günceller — kopya nokta oluşmaz.
- Kullanıcıların eklediği noktalara dokunulmaz (`external_id` boş olanlar).
- Adı olmayan veya koordinatı geçersiz kayıtlar atlanır.
- Veri fakiri (`completeness_score < 45`) veya pipeline'ın işaretlediği kayıtlar
  `PENDING_REVIEW` ile gelir; admin panelindeki moderasyon kuyruğundan yayımlanır.
- Aktivite/imkân bağlantıları her çalıştırmada kaynakla eşitlenir, CampScore
  içe aktarım sonunda yeniden hesaplanır.
- Fotoğraflar Wikimedia Commons'tan gelir; yalnızca yüksek güvenli birincil
  adaylar `PUBLISHED`, diğerleri moderasyona düşer.

### Lisans (önemli)

OpenStreetMap verisi **ODbL** ile lisanslıdır: kaynak göstermek zorunludur.
İçe aktarılan her nokta `attribution` alanıyla (`© OpenStreetMap contributors`)
saklanır ve nokta detay ekranının altında gösterilir. Wikimedia fotoğraflarının
kendi lisans/kaynak künyesi de fotoğrafın üzerinde görünür. Bu satırları
kaldırmayın.

## API Anahtarları

Proje anahtarsız çalışacak şekilde tasarlanmıştır. Google Maps, Google/Apple giriş ve
Firebase Cloud Messaging entegrasyonları soyutlanmıştır; ilgili `.env` değerleri boşken
mock/stub davranışı devreye girer. Gerçek anahtarlar eklendiğinde gerçek servisler kullanılır.
Ayrıntı: `docs/02_teknik_mimari.md`.

## İlerleme Takibi

Faz bazlı geliştirme durumu için: [`PROGRESS.md`](./PROGRESS.md)
