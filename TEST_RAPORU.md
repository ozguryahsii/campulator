# Campulator — Test ve Durum Raporu

**Tarih:** 30.07.2026
**Branch:** `claude/app-requirements-prompts-0gyc0v`
**Kapsam:** Faz 0 – Faz 11 (dokümantasyon paketindeki tüm fazlar)

---

## 1. Özet

| Alan                     | Durum                              |
| ------------------------ | ---------------------------------- |
| Fazlar                   | 12/12 tamamlandı (Faz 0–11)        |
| Otomatik test            | 89 test, 11 suite — **tümü geçti** |
| Typecheck                | 4 paket — **hatasız**              |
| ESLint                   | **hatasız** (uyarı yok)            |
| API derleme              | **başarılı** — 74 endpoint eşlendi |
| Admin panel derleme      | **başarılı** — 11 statik sayfa     |
| Kaynak kod               | 115 TS/TSX dosyası, ~12.700 satır  |
| Manuel uçtan uca senaryo | 40+ senaryo doğrulandı (aşağıda)   |

---

## 2. Otomatik Testler

```
packages/shared
  PASS src/__tests__/campscore.test.ts      (6 test)
  PASS src/__tests__/smart-match.test.ts    (5 test)
  Test Suites: 2 passed | Tests: 11 passed

apps/api
  PASS src/__tests__/location-privacy.test.ts     (4 test)
  PASS src/__tests__/duplicate-detection.test.ts  (9 test)
  PASS src/__tests__/businesses.service.test.ts   (7 test)
  PASS src/__tests__/localization.test.ts         (6 test)
  PASS src/__tests__/closed-report.test.ts        (4 test)
  PASS src/__tests__/mail.service.test.ts         (4 test)
  PASS src/__tests__/verification-code.test.ts    (6 test)
  PASS src/__tests__/code-cooldown.test.ts        (8 test)
  PASS src/__tests__/osm-mapping.test.ts          (30 test)
  Test Suites: 9 passed | Tests: 78 passed
```

**Toplam: 89 test, 89 geçti, 0 başarısız.**

### Test edilen iş kuralları

| Kural (doküman referansı)                          | Test                                        |
| -------------------------------------------------- | ------------------------------------------- |
| "Kapalı görünüyor" onayı noktayı kapatır (§21)     | Onay/ret/yayın durumu ayrı ayrı test edildi |
| OSM içe aktarımı: adsız/geçersiz kayıt alınmaz     | `isImportable` — ad, koordinat, 0,0 kontrolü |
| Veri fakiri içe aktarım moderasyona düşer (§14)    | `completeness_score < 45` → PENDING_REVIEW  |
| Marker önceliği içe aktarımda korunur (§9)         | Karavan > Çadır > Piknik > Mangal           |
| İçe aktarılan fotoğraf güven eşiği                 | Düşük güvenli aday PENDING kalır            |
| Moderatör kararı tekrar içe aktarımda korunur      | Yayımlanan nokta kuyruğa geri düşmüyor      |
| Fotoğraf yayın eşiği (varsayılan 0.6 ≈ 300 m)      | Eşik altı PENDING, üstü PUBLISHED           |
| İşletme sahipliği: nokta başına tek talep (§17)    | Kendi/başkasının talebi ayrı hata döner     |
| Resmî yanıt yalnızca VERIFIED sahibe açık (§15)    | PENDING sahipte null döner                  |
| Çeviri yoksa varsayılan metne düşülür (docs/06)    | Boş alan ve eksik dil kaydı test edildi     |
| CampScore = F×0.45 + U×0.35 + A×0.20 (§10)         | 4→5→3 girdisi 4.2 sonucu doğrulandı         |
| Skorlar tek ondalıkla gösterilir (§10)             | 4.267 → 4.3, 4.24 → 4.2                     |
| Ağırlıklar konfigüre edilebilir (docs/02 §8)       | Özel ağırlıkla hesap doğrulandı             |
| Skor 0–5 aralığında kırpılır                       | 9 → 5, −3 → 0                               |
| Smart Match = eşleşen/toplam × 100 (§7.2)          | 2/4 → %50, eksik kriterler listelendi       |
| Tüm kriterler eşit ağırlıklı (§7.2)                | Kriter sırası sonucu değiştirmiyor          |
| Kriter seçilmezse sıfıra bölme olmaz               | Boş liste → %0                              |
| Yaklaşık konumda gerçek koordinat gizlenir (§12)   | Bulanık merkez ≠ gerçek koordinat           |
| Bulanıklaştırma 500 m yarıçap içinde (§12)         | Mesafe 0 < d ≤ 500 m                        |
| Bulanıklaştırma deterministik (üçgenleme koruması) | Aynı nokta → aynı merkez                    |
| Farklı noktalar farklı yönlere kaydırılır          | İki nokta farklı merkez                     |
| Mükerrer: Türkçe karakter farkı yakalanır (§14)    | "Kampı" ↔ "Kampi" benzer                    |
| Mükerrer: kapsayan isimler benzer sayılır (§14)    | "Datça Gizli Koy" ↔ "…Kamp Alanı"           |
| Mükerrer: alakasız isimler ayrı kalır              | Salda ↔ Uzungöl benzer değil                |
| Mesafe hesabı (300 m eşiği, km ölçeği)             | 55 m < 300 m; Ankara–Salda ~355 km          |

---

## 3. Manuel Uçtan Uca Doğrulamalar

Aşağıdaki senaryolar gerçek PostgreSQL + çalışan API üzerinde doğrulandı.

### 3.1 Kimlik ve Profil (Faz 1)

| Senaryo                             | Sonuç                                        |
| ----------------------------------- | -------------------------------------------- |
| E-posta ile kayıt + zorunlu onaylar | ✅ Onay eksikse `AUTH_CONSENTS_REQUIRED`     |
| E-posta doğrulama token'ı           | ✅ `{"verified": true}`                      |
| Refresh token rotasyonu             | ✅ Yeni çift verildi                         |
| Eski refresh token tekrar kullanımı | ✅ 401 `AUTH_REFRESH_INVALID`                |
| `GET /me` profil                    | ✅ Doğru kullanıcı, `emailVerified: true`    |
| Yanlış şifre                        | ✅ 401 `AUTH_INVALID_CREDENTIALS`            |
| Google giriş (dev stub)             | ✅ Hesap açıldı, e-posta doğrulanmış sayıldı |
| `AUTH_AUTO_VERIFY_EMAIL=true`       | ✅ Yeni kayıt anında doğrulanmış             |

### 3.2 Yer Verisi, Filtreler, Smart Match (Faz 2–3)

| Senaryo                                   | Sonuç                                           |
| ----------------------------------------- | ----------------------------------------------- |
| Varsayılan liste (kalıcı kapalı gizli)    | ✅ 7 nokta (kalıcı kapalı hariç)                |
| `includePermanentlyClosed=true`           | ✅ 8 nokta                                      |
| `feeType=FREE&activities=TENT`            | ✅ Salda + Kazdağı                              |
| Yaklaşık konumlu nokta (liste + detay)    | ✅ Bulanık koordinat, `±500 m`, precision alanı |
| Smart Match: Çadır+Ücretsiz+Göl kenarı+WC | ✅ Salda %100; diğerleri %50 + eksikler         |
| Bilinmeyen kriter                         | ✅ 400 `SMART_MATCH_UNKNOWN_CRITERIA`           |
| Kayıtlı arama oluştur + çalıştır          | ✅ %100 sonuç, geçmişe yazıldı                  |

### 3.3 CampScore (Faz 4)

| Senaryo                           | Sonuç                                                                    |
| --------------------------------- | ------------------------------------------------------------------------ |
| `GET /places/:id/score-breakdown` | ✅ Uzungöl: 13 uygulanabilir imkândan 6 → Features 2.6, genel 3.2 "good" |
| Puan sonrası skor tazelenmesi     | ✅ Kullanıcı puanı 4.4 → bileşene `ratingCount: 1` ile yansıdı           |

### 3.4 Katkı Sistemi (Faz 5)

| Senaryo                               | Sonuç                                                  |
| ------------------------------------- | ------------------------------------------------------ |
| Nokta ekleme (yeni kullanıcı)         | ✅ `PENDING_REVIEW` + moderasyon kaydı                 |
| Mükerrer tespiti (38 m + benzer isim) | ✅ Uyarı listesi döndü, DUPLICATE kaydı düştü          |
| İmkân doğrulama ×2                    | ✅ `COMMUNITY_SUPPORTED` oldu, skor yeniden hesaplandı |
| Misafir nokta ekleme                  | ✅ 401 `AUTH_TOKEN_MISSING`                            |

### 3.5 Yorum, Puan, Fotoğraf (Faz 6)

| Senaryo                       | Sonuç                               |
| ----------------------------- | ----------------------------------- |
| 5 kategorili puan (4/5/5/3/5) | ✅ Genel 4.4, yıl 2026              |
| Puan özeti                    | ✅ `count: 1`, ortalama 4.4         |
| Yorum + faydalı + sıralama    | ✅ Faydalı 1, puan ilişkilendirildi |
| Fotoğraf yükleme              | ✅ `/storage/places/.../…jpg`       |
| İlk fotoğrafta durum değişimi | ✅ `photoStatus: PUBLISHED`         |

### 3.6 Koleksiyon ve Karşılaştırma (Faz 7)

| Senaryo                           | Sonuç                         |
| --------------------------------- | ----------------------------- |
| Koleksiyon oluştur + 2 nokta ekle | ✅ Sıra 1-2 doğru             |
| Sıralama değiştirme (reorder)     | ✅ Sıra ters çevrildi         |
| Başkasının koleksiyonu            | ✅ 404 `COLLECTION_NOT_FOUND` |
| Misafir erişimi                   | ✅ 401                        |

### 3.7 Rota ve Mesafe (Faz 8)

| Senaryo                        | Sonuç                                        |
| ------------------------------ | -------------------------------------------- |
| Rota önizleme (Ankara → Salda) | ✅ 498 km / 7 sa 40 dk, `provider: ESTIMATE` |
| Mesafe filtresi 250 km         | ✅ 2 nokta (Abant 155 km, Kapadokya 221 km)  |
| Mesafe filtresi 50 km          | ✅ 0 nokta                                   |

### 3.8 Bildirimler (Faz 9)

| Senaryo                    | Sonuç                                        |
| -------------------------- | -------------------------------------------- |
| Cihaz token kaydı          | ✅ IOS token kaydedildi                      |
| Yanıt + faydalı → bildirim | ✅ 2 bildirim (REVIEW_REPLY, REVIEW_HELPFUL) |
| Dev push log               | ✅ `[DEV PUSH] user=… cihaz=1 …`             |
| Tümünü okundu              | ✅ `{"updated": 2}`                          |
| Push tercihi kapatma       | ✅ `pushEnabled: false`                      |

### 3.9 Admin Panel (Faz 10)

| Senaryo                             | Sonuç                                                 |
| ----------------------------------- | ----------------------------------------------------- |
| Dashboard sayaçları                 | ✅ 9 sayaç doğru (6 bekleyen moderasyon, 8 yayın vb.) |
| FIFO moderasyon kuyruğu             | ✅ En eski önce, kayıt özetleriyle                    |
| Nokta onayı                         | ✅ `APPROVED` → nokta yayında görünür                 |
| Mükerrer birleştirme                | ✅ Kaynak `MERGED`, veriler hedefe taşındı            |
| Geçersiz skor ağırlığı (toplam 1.5) | ✅ 400 `SCORE_WEIGHTS_MUST_SUM_TO_ONE`                |
| Geçerli ağırlık kaydı               | ✅ 9 nokta yeniden hesaplandı                         |
| Güven seviyesi değişimi             | ✅ `TRUSTED_CONTRIBUTOR`                              |
| Denetim kayıtları                   | ✅ PLACE_APPROVE, PLACE_MERGE, SCORE_CONFIG_UPDATE    |
| Normal kullanıcı admin erişimi      | ✅ 403 `AUTH_ROLE_INSUFFICIENT`                       |

### 3.10 Güvenlik ve Kalite (Faz 11)

| Senaryo                      | Sonuç                                                                  |
| ---------------------------- | ---------------------------------------------------------------------- |
| Güvenlik başlıkları (helmet) | ✅ CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| Rate limiting (120/dk)       | ✅ 130 istekte 119×200 + 11×429                                        |
| ESLint                       | ✅ Hatasız                                                             |
| Typecheck (4 paket)          | ✅ Hatasız                                                             |

---

## 4. Bilinen Eksikler ve Bilinçli Ertelemeler

Bunlar hata değil; dokümanda sonraki fazlara bırakılmış ya da harici anahtar/varlık bekleyen maddeler.

### 4.1 Harici anahtar bekleyenler (kod hazır, `.env` ile aktifleşir)

| Konu                 | Mevcut durum                                                                                                                                                |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Google Maps / Routes | Harita çalışıyor; rota mesafe/süre **tahmini**. `GOOGLE_MAPS_API_KEY` eklenince gerçek Routes verisi bağlanacak (`provider` alanı ayrımı taşıyor).          |
| Google / Apple giriş | Dev stub (`dev:<email>:<Ad>`) çalışıyor; anahtar eklenince `SocialAuthService` gerçek doğrulamaya geçer.                                                    |
| FCM push             | `PushService` gönderimi log'a yazıyor; `FCM_SERVICE_ACCOUNT_JSON` eklenince firebase-admin bağlanacak. Cihaz token'ı alma (expo-notifications) da o adımda. |
| E-posta gönderimi    | `MailService` doğrulama token'ını log'a yazıyor; SMTP/SES sağlayıcısı eklenecek.                                                                            |

### 4.2 Varlık bekleyenler

- Logo/ikon PNG'leri `apps/mobile/assets/brand/` altında üretildi ve `app.json`'a bağlandı (Faz 12/A1). Tasarımcıdan gelen nihai dosyalar aynı adlarla üzerine yazılabilir; `app.json` değişikliği gerekmez.
- Nokta fotoğrafları: seed verisinde fotoğraf yok, tümü "Fotoğraf bekleniyor" etiketli.

### 4.3 Dokümana göre sonraki fazlar (kapsam dışı)

- Rota kaydetme, çok duraklı gezi planlama
- Koleksiyon paylaşımı (veri modelinde `share_token` hazır)
- E-posta bildirimleri (tercih alanı hazır)
- İşletme belge doğrulama (ilk sürümde manuel admin onayı)
- Premium, reklam, açık tema, offline kullanım, doğal dil arama
- İşletme resmî yorum yanıtı ucu (`is_official_response` alanı ve gösterimi hazır)

### 4.4 Cilalama listesi (Faz 11 sonrası)

| Konu                                     | Durum                                                        |
| ---------------------------------------- | ------------------------------------------------------------ |
| Koleksiyonda gerçek sürükle-bırak        | ✅ Faz 12/A2 — bağımlılıksız `DraggableList`                 |
| Smart Match sonuçlarının harita görünümü | ✅ Faz 12/A3 — `SmartMatchMap`, liste/harita geçişi          |
| İşletme resmî yorum yanıtı               | ✅ Faz 12/A4 — sahiplik talebi + otomatik resmî işaretleme   |
| Admin: işletme yönetimi ekranı           | ✅ Faz 12/A5 — `/businesses`                                 |
| Admin: yerelleştirme ekranı              | ✅ Faz 12/A6 — `/localization` + `PlaceTranslation`          |
| Mobil erişilebilirlik denetimi           | ✅ Faz 12/A7 — etiketler, roller, durumlar, dokunma alanları |
| shadcn/ui bileşen kütüphanesi            | Panel Tailwind ile yazıldı (bilinçli tercih)                 |
| E2E testler (Detox/Playwright)           | Kurulmadı                                                    |
| Integration testler (DB'li)              | Manuel curl senaryolarıyla doğrulandı; otomatik değil        |
| Crash reporting / analytics              | Eklenmedi                                                    |

### 4.5 Yayına çıkmadan önce mutlaka yapılacaklar

1. **`AUTH_AUTO_VERIFY_EMAIL=false`** — geliştirme kolaylığı için açık; production'da e-posta doğrulama zorunlu olmalı.
2. **JWT secret'ları değiştir** — `.env.example`'daki dev değerleri kullanılmamalı.
3. **Storage provider'ı S3/GCS'ye al** — şu an yerel disk.
4. **PostgreSQL kimlik bilgilerini değiştir** — docker-compose varsayılanları geliştirme içindir.
5. **Prisma migration'a geç** — şu an `db push` kullanılıyor; production için `migrate deploy`.

---

## 5. Nasıl Çalıştırılır

```bash
# Kurulum
pnpm install

# PostgreSQL (Docker Desktop açık olmalı)
pnpm db:up
cp apps/api/.env.example apps/api/.env
pnpm --filter @campulator/api db:push
pnpm --filter @campulator/api db:seed

# API — http://localhost:3399 (Swagger: /docs)
pnpm --filter @campulator/api start:dev

# Mobil — Expo; i = iOS Simulator, a = Android
pnpm --filter @campulator/mobile start

# Admin panel — http://localhost:3398
pnpm --filter @campulator/admin dev

# Kalite kontrolleri
pnpm lint && pnpm typecheck && pnpm test
```

**Admin panele giriş:** MODERATOR ve üzeri rol gerekir. Bir kullanıcıyı yükseltmek için:

```bash
psql -h localhost -U campulator -d campulator \
  -c "UPDATE users SET role='ADMIN' WHERE email='SIZIN@EMAIL.COM';"
```
