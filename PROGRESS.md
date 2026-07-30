# Campulator — Geliştirme İlerlemesi

Bu dosya faz bazlı ilerlemeyi takip eder. Her oturum sonunda güncellenir.
Faz tanımları: `docs/07_gelistirme_fazlari.md`

## Durum Özeti

| Faz    | Konu                          | Durum         |
| ------ | ----------------------------- | ------------- |
| Faz 0  | Temel kurulum                 | 🟢 Tamamlandı |
| Faz 1  | Kimlik ve profil              | 🟢 Tamamlandı |
| Faz 2  | Yer verisi ve harita          | 🟢 Tamamlandı |
| Faz 3  | Gelişmiş filtre + Smart Match | 🟢 Tamamlandı |
| Faz 4  | CampScore                     | 🟢 Tamamlandı |
| Faz 5  | Katkı sistemi                 | 🟢 Tamamlandı |
| Faz 6  | Yorum, puan, fotoğraf         | 🟢 Tamamlandı |
| Faz 7  | Kaydedilenler + karşılaştırma | 🟢 Tamamlandı |
| Faz 8  | Rota                          | 🟢 Tamamlandı |
| Faz 9  | Bildirim                      | 🟢 Tamamlandı |
| Faz 10 | Admin panel                   | 🟢 Tamamlandı |
| Faz 11 | Kalite ve yayına hazırlık     | 🟢 Tamamlandı |
| Faz 12 | Cilalama (A grubu)            | 🟢 Tamamlandı |

## Faz 0 — Temel Kurulum (Tamamlandı)

- [x] pnpm monorepo (apps/mobile, apps/api, apps/admin, packages/shared)
- [x] Docker Compose ile PostgreSQL 16
- [x] Tam Prisma şeması (`docs/03_veri_modeli.md` birebir karşılığı)
- [x] NestJS iskeleti: ConfigModule, PrismaModule, HealthController, Swagger (/docs)
- [x] Seed script (aktiviteler, imkânlar, skor konfigürasyonu, örnek noktalar)
- [x] Expo mobil iskeleti: koyu tema design token'ları, i18next (TR/EN),
      5 sekmeli navigasyon (Keşfet / Ara / Ekle / Kaydedilenler / Profil), logo (SVG)
- [x] Next.js admin iskeleti: koyu tema, bölüm menüsü, TR arayüz metinleri sözlük üzerinden
- [x] packages/shared: enum'lar, CampScore formülü + ağırlıklar, Smart Match yüzdesi
- [x] Prettier + typecheck script'leri, GitHub Actions CI
- [x] Ürün dokümantasyonu repoya kopyalandı (`docs/`)

### Faz 0 notları / bilinçli ertelemeler

- Gerçek logo/icon PNG'leri henüz repoda yok; mobilde SVG yaklaşık versiyonu kullanılıyor.
  Gerçek görseller `apps/mobile/assets/brand/` altına eklenecek (bkz. oradaki README).
- Harita, Google/Apple giriş ve FCM anahtarsız stub modunda; `.env` anahtarları eklenince
  gerçek entegrasyona geçilecek.
- shadcn/ui bileşen kütüphanesi admin'e Faz 10'da eklenecek; şimdilik Tailwind ile
  koyu iskelet mevcut.
- ESLint konfigürasyonu Faz 1 başında eklenecek (şimdilik typecheck + prettier).

## Faz 1 — Kimlik ve Profil (Tamamlandı)

Backend:

- [x] E-posta kayıt + şifre (bcryptjs), zorunlu yasal onay kontrolü
- [x] E-posta doğrulama akışı (hash'li token, 24 saat geçerli; gönderim dev'de API log'una)
- [x] JWT access + refresh token — refresh opak, hash'li saklanır, rotasyonda eski iptal
- [x] Google/Apple giriş: anahtar yokken dev stub ("dev:<email>:<Ad>"), anahtar gelince
      gerçek doğrulamaya bağlanacak soyutlama (`SocialAuthService`)
- [x] Misafir kuralları: `OptionalAuthGuard` + katkılar için `VerifiedEmailGuard`
- [x] Profil: GET/PATCH /me, GET /users/:id (herkese açık; sayısal güven puanı gizli,
      katkı istatistikleriyle)
- [x] RBAC: `RolesGuard` + rol hiyerarşisi (USER < BUSINESS_OWNER < MODERATOR < ADMIN < SUPER_ADMIN)
- [x] Yasal onay kayıtları (`user_consents`), pazarlama izni isteğe bağlı
- [x] Hesap silme: kamusal katkılar "Silinmiş Kullanıcı" olarak anonimleşir; özel veriler,
      token'lar ve koleksiyonlar silinir
- [x] Smoke test: kayıt → doğrulama → refresh rotasyonu → /me → yanlış şifre → Google stub

Mobil:

- [x] Açılış akışı: dil seçimi → 3 sayfalık onboarding → giriş/kayıt → uygulama
- [x] Misafir olarak devam (keşif serbest; katkı için hesap uyarısı)
- [x] Auth store: zustand + SecureStore (refresh token güvenli saklama, otomatik oturum yenileme)
- [x] API client: 401'de tek seferlik refresh + retry
- [x] Profil sekmesi: kullanıcı bilgisi, doğrulama bekliyor uyarısı + yeniden gönder, çıkış

Notlar:

- E-posta gönderimi `MailService` soyutlaması arkasında; dev'de doğrulama token'ı API
  log'una yazılır. Gerçek SMTP/SES sağlayıcısı sonraki fazda.
- ESLint hâlâ eklenmedi; Faz 11 kalite kapsamına alındı (typecheck + prettier CI'da mevcut).

## Faz 2 — Yer Verisi ve Harita (Tamamlandı)

Backend:

- [x] GET /places: bounds, search (ad/şehir/bölge), activities, amenities, feeType,
      minRating, operatingStatus, sıralama (skor/ad/yeni), sayfalama
- [x] Filtreleme desteklenen TÜM aktiviteler üzerinden (yalnızca ana ikon değil)
- [x] Kalıcı kapalı noktalar varsayılan gizli; includePermanentlyClosed ile açılır
- [x] GET /places/:id: imkânlar, erişim, atmosfer, skorlar, son doğrulama
- [x] Konum gizliliği: APPROXIMATE noktalarda deterministik bulanıklaştırma
      (`location-privacy.ts`); liste ve detayda yalnızca public koordinat döner
- [x] Seed 8 noktaya çıkarıldı: yaklaşık konumlu, mevsimlik, geçici/kalıcı kapalı
      örnekler + skorlar

Mobil:

- [x] react-native-maps: koyu Google harita stili (Campulator paleti)
- [x] Marker: yeşil gövde + öncelikli aktivite ikonu (Karavan > Çadır > Piknik > Mangal) + "+N" rozeti; kapalı noktalar soluk
- [x] Grid tabanlı cluster; dokununca yakınlaşma
- [x] Alt yatay kart listesi ↔ marker çift yönlü senkron (snap scroll)
- [x] Harita / liste görünümü geçişi
- [x] Hızlı filtre çipleri: ₺0 Ücretsiz + 4 aktivite; metin araması
- [x] Yaklaşık konumlu seçili noktada 500 m daire gösterimi
- [x] Konum izni yalnızca "konumuma git" butonuna basılınca istenir
- [x] API erişilemezse paketlenmiş örnek veriyle çevrimdışı demo modu

Not: Gelişmiş filtre paneli Faz 3'te, nokta detay ekranı Faz 4'te (CampScore ile) gelecek.

## Faz 3 — Gelişmiş Filtre ve Smart Match (Tamamlandı)

Ortak:

- [x] Kriter kataloğu `packages/shared/src/criteria.ts`: aktivite, ücret, 13 imkân,
      izin/doğa etiketleri, erişim, atmosfer eşikleri — backend + mobil aynı kimlikleri kullanır
- [x] `Place.tags` enum dizisi (FIRE_ALLOWED, PET_FRIENDLY, LAKESIDE, SEASIDE, FOREST,
      MOUNTAIN, FAMILY_FRIENDLY, QUIET); seed etiketlerle güncellendi

Backend:

- [x] GET /places `tags` filtresi (hasEvery)
- [x] POST /smart-match/search: eşit ağırlıklı yüzde, eşleşen/eksik kriterler, tüm
      noktalar görünür, %'ye göre sıralı; bilinmeyen kriter reddi; girişli kullanıcıda
      arama geçmişine yazma
- [x] /saved-searches CRUD + /:id/run (Smart Match ile çalıştırma) + /history

Mobil:

- [x] Gelişmiş filtre paneli: erişim/ücret, aktiviteler, imkânlar, izin+doğa, kullanıcı
      puanı, kalıcı kapalı toggle; canlı sonuç sayılı "Sonuçları Göster" + Sıfırla
- [x] Keşfet'te "Filtreler (N)" çipi panelle entegre
- [x] Ara sekmesi: Standart / Smart Match modları
- [x] Smart Match: gruplu kriter çipleri, % rozetli sonuçlar, eksik kriter listesi,
      aramayı kaydet, kayıtlı + son aramalar üstte
- [x] Kaydedilenler sekmesi: kayıtlı aramalar listesi + silme

Ertelenenler (bilinçli):

- Mesafe filtresi: kullanıcı konumu gerektirir; Faz 8 (rota) ile birlikte eklenecek
- Smart Match sonuçlarının harita görünümü: liste mevcut; harita geçişi Faz 4 detay
  ekranıyla birlikte eklenecek

## Faz 4 — CampScore (Tamamlandı)

Backend:

- [x] CampScoreService: Features Score (imkân ağırlıkları, nokta türüne uygulanmayan
      imkânlar paydaya girmez), Atmosphere Score (kalabalık ters çevrilir),
      User Rating (aktif değerlendirme ortalaması; henüz puan yokken seed değeri korunur)
- [x] Ağırlıklar score_config tablosundan okunur (varsayılan 0.45/0.35/0.20)
- [x] recalculate(placeId): place_scores tablosunu günceller — Faz 5/6'daki onay ve
      puan akışları bu metodu çağıracak
- [x] GET /places/:id/score-breakdown: bileşen skorları + ağırlıklar + etiket

Mobil:

- [x] Stack navigasyon + PlaceDetail ekranı; Keşfet kartları (haritada seçiliyken
      ikinci dokunuş), liste modu ve Ara sonuçları detaya gider
- [x] Detay: galeri yer tutucusu, tam/yaklaşık konum + durum + ücret rozetleri,
      CampScore kartı (büyük rozet + etiket + üç ağırlıklı bar), aktiviteler,
      imkânlar (doğrulama ikonlarıyla), atmosfer barları, açıklama + sezon,
      son doğrulama tarihi
- [x] Kaydet / Yol Tarifi / Karşılaştır butonları görünür ama pasif (Faz 7-8'de aktif)
- [x] Çevrimdışıysa karttan gelen özet veriyle detay gösterimi

## Faz 5 — Katkı Sistemi (Tamamlandı)

Backend:

- [x] POST /places: zorunlu ad + konum + ≥1 aktivite; isteğe bağlı açıklama, şehir,
      ücret, imkânlar, etiketler, erişim, atmosfer; slug üretimi; katkı puanı (trust event)
- [x] Tam/yaklaşık konum + APPROXIMATE'ta deterministik bulanıklaştırma
- [x] Mükerrer kontrol: ~300 m yakınlık + normalize isim benzerliği (TR aksan temizliği,
      Levenshtein); adaylar yanıtla döner, kayıt DUPLICATE tipiyle moderasyona düşer
- [x] Güvenilirlik kuralı: TRUSTED_CONTRIBUTOR/EXPERT_CAMPER doğrudan PUBLISHED
      (güçlü mükerrer şüphesi hariç), diğerleri PENDING_REVIEW + moderasyon kaydı
- [x] GET /places/duplicate-check (form sırasında canlı kontrol için)
- [x] POST /places/:id/verifications: imkân onay/itiraz sayaçları
      (2 onay → COMMUNITY_SUPPORTED, itiraz > onay → DISPUTED, admin onayı ezilmez),
      "kapalı görünüyor" bildirimi moderasyona düşer; skor otomatik yeniden hesaplanır
- [x] POST /places/:id/change-requests ve /report → moderasyon kuyruğu
- [x] Tüm katkı uçları JwtAuthGuard + VerifiedEmailGuard arkasında
- [x] Smoke test: ekleme (PENDING_REVIEW + moderasyon kaydı), mükerrer uyarısı
      (0 m / 38 m adaylarla), 2x doğrulama → COMMUNITY_SUPPORTED, misafir 401

Mobil:

- [x] 5 adımlı Ekle formu: Bilgiler → Konum (haritaya dokun + tam/yaklaşık ±500 m
      dairesi) → Aktivite+Ücret → İmkân+Etiket → Özet
- [x] Form doluluk yüzdesi çubuğu; adım bazlı zorunlu alan kontrolü
- [x] "Fotoğraf bekleniyor" bilgilendirmesi (yükleme Faz 6'da)
- [x] Sonuç ekranı: yayınlandı / moderasyona gönderildi + mükerrer uyarı listesi
- [x] Misafir → giriş uyarısı; doğrulanmamış e-posta → doğrulama uyarısı

## Faz 6 — Yorum, Puan ve Fotoğraf (Tamamlandı)

Backend:

- [x] Puanlama: 5 alt kategori (temizlik/güvenlik/manzara/ulaşım/fiyat-perf), tam
      yıldız 1-5; overall = ortalama (küsuratlı olabilir)
- [x] Yıllık tek puan kuralı: user+place+yıl unique; aynı yıl güncelleme, yeni yıl
      yeni kayıt + eski pasif; her değişimde CampScore recalculate
- [x] GET ratings/summary + ratings/me
- [x] Yorumlar: anında yayın, aktif puanla otomatik ilişkilendirme, sahibi
      düzenler/siler, tek seviyeli yanıt, faydalı işaretleme (upsert + sayaç),
      şikâyet → moderasyon (içerik yayında kalır)
- [x] Sıralamalar: newest / helpful / highest / lowest / with_photos
- [x] StorageService (local provider; mime + 10MB doğrulama) — S3/GCS aynı arayüze
      eklenecek; /storage statik servis
- [x] Fotoğraf: POST places/:id/photos, reviews/:id/photos, DELETE photos/:id;
      ilk fotoğrafta photo_status PUBLISHED
- [x] Smoke test: puan 4.4 → CampScore userRating bileşenine gerçek sayımla yansıdı;
      yorum + faydalı + sıralama; fotoğraf yükleme → photoStatus PUBLISHED

Mobil:

- [x] Detay ekranında Yorumlar bölümü: özet yıldızlar, sıralama çipleri, yorum
      yazma (anında), faydalı butonu, yanıt gösterimi (resmî yanıt rozetiyle)
- [x] Puan verme modalı: 5 kategori × tam yıldız; gönderince skorlar tazelenir
- [x] Fotoğraf ekleme (galeriden seçim + multipart upload)
- [x] Misafir/doğrulanmamış kullanıcıda katkı aksiyonları gizli

Not: İşletme resmî yanıtı ucu (POST /reviews/:id/official-reply) Faz 10 işletme
yönetimiyle birlikte gelecek; veri modeli hazır (is_official_response).

## Faz 7 — Kaydedilenler ve Karşılaştırma (Tamamlandı)

Backend:

- [x] /collections CRUD (özel koleksiyonlar; share_token alanı paylaşım fazı için hazır)
- [x] POST/DELETE items — bir nokta birden fazla koleksiyonda olabilir (upsert)
- [x] PATCH /:id/reorder — sıralama transaction içinde güncellenir
- [x] Sahiplik kontrolü: başkasının koleksiyonu 404, misafir 401
- [x] Smoke test: oluştur → 2 nokta ekle → sırayı ters çevir → sahiplik/misafir reddi

Mobil:

- [x] Detayda "Kaydet": koleksiyon seçici modal (çoklu koleksiyon işaretleme +
      satır içi yeni koleksiyon oluşturma); kayıtlıysa ikon dolu
- [x] Detayda "Karşılaştır": seçim toggle'ı, en fazla 3 nokta (compareStore),
      2+ seçiliyken "Karşılaştır (N)" butonu
- [x] Karşılaştırma ekranı: yatay kaydırmalı sütunlar, CampScore rozeti + üç alt skor,
      ücret, çalışma durumu, tam/yaklaşık konum, 4 aktivite, 13 imkân ve 8 izin/doğa
      etiketi için ✓ / — matrisi; sütundan çıkarma ve temizleme
- [x] Kaydedilenler sekmesi: koleksiyon listesi (nokta sayısı, noktaya git, çıkar,
      yukarı taşıma ile sıralama, koleksiyon silme) + kayıtlı aramalar

Not: Sürükle-bırak yerine "yukarı taşı" ile sıralama uygulandı (reorder API'si aynı);
gerçek drag-drop Faz 11 cilalama kapsamına alındı. Koleksiyon paylaşımı dokümana göre
sonraki faz.

## Faz 8 — Rota (Tamamlandı)

Backend:

- [x] POST /routes/preview: başlangıç + hedef, mesafe, tahmini süre, iki noktalı
      polyline, harici Google Maps yol tarifi bağlantısı; misafir erişebilir
- [x] Anahtarsız modda tahmin (kuş uçuşu × 1.3 karayolu katsayısı, mod bazlı
      ortalama hız); GOOGLE_MAPS_API_KEY eklendiğinde gerçek Routes çağrısı
      buraya bağlanacak (provider alanı ESTIMATE/GOOGLE ayrımını taşır)
- [x] APPROXIMATE noktalarda rota bulanık merkeze kadar (docs/01 §12)
- [x] Mesafe filtresi: nearLatitude/nearLongitude/maxDistanceKm + distance sıralaması;
      yanıt distanceMeters içerir
- [x] Smoke test: Ankara → Salda 498 km / 7 sa 40 dk; 250 km filtresi 2 nokta, 50 km 0

Mobil:

- [x] Detayda "Yol Tarifi" butonu aktif: alttan açılan rota sayfası (araç/yürüyüş
      modu, mesafe + süre kartları, "Haritalarda aç")
- [x] Konum izni yalnızca rota hesaplanırken istenir; izin reddi ve hata durumları
- [x] Yaklaşık konum ve tahmini veri uyarıları
- [x] Filtre panelinde mesafe filtresi (10/50/100/250/500 km); seçimde konum izni
      istenir, reddedilirse uyarı gösterilir
- [x] Mesafe ve süre Intl ile yerelleştirilmiş; birim etiketleri i18n'den

Not: Rota kaydetme ve çok duraklı planlama dokümana göre kapsam dışı (sonraki fazlar).

## Faz 9 — Bildirim (Tamamlandı)

Backend:

- [x] NotificationsService: in-app kayıt + tercih açıksa push; metinler locale
      bağımsız anahtar olarak saklanır, istemci yerelleştirir (docs/02 §12)
- [x] GET /notifications (okunmamış sayısıyla), PATCH /:id/read, /read-all
- [x] GET/PATCH /notifications/preferences (push; e-posta alanı sonraki faz için hazır)
- [x] POST /devices/fcm-token (çoklu cihaz, upsert + yeniden aktifleştirme),
      DELETE /devices/fcm-token/:id
- [x] PushService soyutlaması: FCM_SERVICE_ACCOUNT_JSON yokken gönderim log'a yazılır,
      anahtar eklenince firebase-admin buraya bağlanır
- [x] Gerçek olay bağlantıları: yoruma yanıt → REVIEW_REPLY, faydalı işaretleme →
      REVIEW_HELPFUL (kendi içeriğine yapılan işlemde bildirim gönderilmez)
- [x] Bildirim tipleri: PLACE_APPROVED/REJECTED, REVIEW_REPLY, REVIEW_HELPFUL,
      CHANGE_REQUEST_RESOLVED, TRUST_LEVEL_UP, SYSTEM (moderasyon bağlantıları Faz 10'da)
- [x] Smoke test: cihaz token kaydı → yanıt + faydalı → 2 bildirim + dev push log →
      tümünü okundu → push tercihi kapatma

Mobil:

- [x] Bildirim merkezi ekranı: okunmamış sayısı, tipe göre ikon, okundu işaretleme,
      tümünü okundu, boş durum
- [x] Deep link: bildirimde placeId varsa nokta detayına gider
- [x] Push tercihi anahtarı; e-posta bildirimi notu
- [x] Profil sekmesinden bildirim merkezine erişim
- [x] TR/EN bildirim başlık ve gövde metinleri (7 tip)

Not: Gerçek FCM cihaz token'ı alınması (expo-notifications ile) anahtar teslimi
sonrasında eklenecek; API sözleşmesi ve istemci çağrısı hazır.

## Faz 10 — Admin Panel (Tamamlandı)

Backend (/admin, MODERATOR ve üzeri; kritik işlemler ADMIN):

- [x] GET /admin/dashboard: 9 sayaç (bekleyen moderasyon, onay bekleyen nokta,
      değişiklik talebi, açık şikâyet, aktif kullanıcı, yorum, fotoğraf, işletme, yayın)
- [x] GET /admin/moderation: FIFO kuyruk + ilgili kaydın özeti (nokta/değişiklik/şikâyet)
- [x] POST /admin/moderation/:id/resolve: onayla/reddet/arşivle — nokta onayında
      PUBLISHED + CampScore recalculate + kullanıcıya bildirim; dahili not desteği
- [x] POST /admin/places/merge: transaction'lı mükerrer birleştirme — yorum, fotoğraf,
      puan (çakışan yıl pasifleşir), doğrulama, değişiklik talebi, imkân/aktivite ve
      koleksiyon bağlantıları korunur; kaynak MERGED olur
- [x] GET /admin/places: yönetim listesi (yaklaşık konumlarda gerçek koordinat dahil)
- [x] GET /admin/users + trust-level + status (askıya alma oturumları kapatır);
      sayısal güven puanı yalnızca burada görünür
- [x] GET /admin/reports + resolve/dismiss
- [x] GET/PATCH /admin/score-config: ağırlık toplamı 1 doğrulaması, kaydedince tüm
      yayınlanmış noktalar yeniden hesaplanır; imkân ağırlıkları listelenir
- [x] GET /admin/businesses + verify (manuel doğrulama; onayda rol BUSINESS_OWNER)
- [x] GET /admin/audit-logs — tüm moderasyon/skor işlemleri eski-yeni değerle kaydedilir
- [x] Smoke test: dashboard sayaçları, FIFO kuyruk, nokta onayı → yayında,
      birleştirme → kaynak MERGED, geçersiz ağırlık reddi, geçerli ağırlık → 9 nokta
      yeniden hesaplandı, güven seviyesi değişimi, audit log kayıtları,
      normal kullanıcıda 403

Panel (Next.js, port 3398):

- [x] Rol kontrollü giriş ekranı (MODERATOR+ değilse reddedilir), token localStorage
- [x] Dashboard: sayaç kartları (bekleyen işler yeşil vurgulu)
- [x] Moderasyon kuyruğu: kayıt özeti, dahili not, onayla/reddet/arşivle,
      DUPLICATE kayıtlarında hedef id ile birleştirme
- [x] Noktalar: arama + durum filtreleri, gerçek koordinat kolonu, CampScore
- [x] Kullanıcılar: güven seviyesi seçici, güven puanı, katkı istatistikleri,
      askıya al/aktifleştir
- [x] Şikâyetler: kategori, hedef, çöz/reddet
- [x] Skor konfigürasyonu: üç ağırlık slider'ı, toplam doğrulaması, imkân ağırlık tablosu
- [x] Denetim kayıtları tablosu
- [x] TanStack Query ile canlı veri; tüm metinler sözlük üzerinden

Ertelenenler: shadcn/ui bileşen kütüphanesi yerine Tailwind ile yazıldı; işletme
yönetimi ekranı ve yerelleştirme editörü sonraki iterasyona bırakıldı (API hazır).

## Faz 11 — Kalite ve Yayına Hazırlık (Tamamlandı)

- [x] ESLint flat config (tüm workspace) — hatasız geçiyor
- [x] Jest + 24 unit test: CampScore formülü/yuvarlama/kırpma, Smart Match yüzdesi ve
      eşit ağırlık, konum bulanıklaştırma (500 m sınırı + determinizm), mükerrer tespiti
      (Türkçe normalizasyon, benzerlik, mesafe)
- [x] Rate limiting (@nestjs/throttler, 120 istek/dk) — 130 istekte 11×429 doğrulandı
- [x] Güvenlik başlıkları (helmet): CSP, HSTS, X-Frame-Options, X-Content-Type-Options,
      Referrer-Policy; fotoğraf servisi için cross-origin resource policy
- [x] `TEST_RAPORU.md`: 24 otomatik test + 40+ manuel senaryo, bilinen eksikler,
      yayın öncesi kontrol listesi
- [x] Kök script'ler: `pnpm lint`, `pnpm test`, `pnpm typecheck`

Ertelenenler (rapora işlendi): e2e testler (Detox/Playwright), DB'li integration testleri,
crash reporting/analytics, kapsamlı erişilebilirlik denetimi.

## Faz 12 — Cilalama, A Grubu (Tamamlandı)

Anahtar gerektirmeyen tüm cilalama maddeleri tamamlandı.

- [x] **A1 Marka varlıkları**: `assets/brand/` altında icon (1024, opak), adaptive-icon,
      splash-icon, logo ve favicon PNG'leri; `app.json` icon/splash/adaptiveIcon/favicon
      alanlarına bağlandı. `BrandLogo` artık gerçek görseli kullanıyor. Varlıklar
      `generate.py` ile vektörel tanımdan yeniden üretilebilir; tasarımdan gelen
      dosyalar aynı adlarla üzerine yazılabilir.
- [x] **A2 Koleksiyon sürükle-bırak**: Bağımlılıksız `DraggableList` (çekirdek
      PanResponder). Sürükleme sırasında dış ScrollView kilitlenir; bırakınca mevcut
      reorder API'si çağrılır. "Yukarı taşı" düğmesi kaldırıldı.
- [x] **A3 Smart Match harita görünümü**: `SmartMatchMap` — eşleşme yüzdesini gösteren
      marker'lar (≥%75 dolu yeşil), sonuçlara otomatik sığdırma, markera dokununca alt
      kart, yaklaşık konumda 500 m dairesi. Liste/harita geçişi sonuç başlığında.
- [x] **A4 İşletme resmî yanıtı**: Yeni `businesses` modülü (`GET /businesses/me`,
      `POST /businesses/claim`). Yanıt yazan kişi noktanın VERIFIED işletme sahibiyse
      yanıt otomatik `isOfficialResponse` işaretlenir. Mobilde yorum altında yanıt
      kutusu ve nokta detayında sahiplik talep formu.
- [x] **A5 Admin işletme yönetimi**: `/businesses` ekranı — durum filtreleri, sahiplik
      beyanı gösterimi, onayla/reddet. Onayda kullanıcı rolü BUSINESS_OWNER olur.
- [x] **A6 Yerelleştirme**: `PlaceTranslation` modeli, admin `/localization` ekranı ve
      `GET/PUT /admin/places/:id/translations`. Nokta uçları `locale` parametresiyle
      çeviri döner; çeviri yoksa varsayılan (TR) metne düşer. Mobil, arayüz diline göre
      `locale` gönderir.
- [x] **A7 Erişilebilirlik**: Tüm ikon-butonlara `accessibilityLabel`, seçim
      kontrollerine `accessibilityRole` + `accessibilityState`, dokunma alanları
      `hitSlop` ile ≥44 px'e çıkarıldı, `PlaceCard` tek parça okunur etiket alır.
- [x] **A8 Testler**: `businesses.service.test.ts` (sahte Prisma ile talep kuralları ve
      resmî yanıt yetkisi) ve `localization.test.ts` eklendi. Toplam 26 otomatik test.

Şema değişikliği: `Business.evidence`, `Business.createdAt` ve `PlaceTranslation`
eklendi — çekildikten sonra `pnpm --filter @campulator/api db:push` gerekir.

---

## Faz 12 — Ek Düzeltmeler

- [x] Smart Match haritasında marker'a dokunma çalışmıyordu: iOS'ta marker dokunuşu
      MapView.onPress'i de tetikleyip seçimi anında temizliyordu. Harita tıklaması
      marker dokunuşundan ayrıldı, marker'lar `tracksViewChanges={false}` ile sabitlendi.
- [x] Profil fotoğrafı: `POST/DELETE /me/avatar` + mobil `AvatarPicker`
      (dokunarak değiştir, basılı tutarak kaldır). Eski dosya diskten silinir.
- [x] Şifre değiştirme: `PATCH /auth/password`; doğrulama sonrası tüm refresh
      token'lar iptal edilir ve oturum kapanır.
- [x] Gerçek marka görselleri `source/` altına alındı; `generate.py` platform
      kurallarına uygun çıktıları (opak iOS ikonu, şeffaf adaptif ön katman,
      şeffaf uygulama içi logo) bunlardan türetiyor.
- [x] Topluluk katkı araçları mobilde eksikti — API'si Faz 5'te vardı ama arayüzü
      yoktu. Nokta detayına `ContributeSection` eklendi: bilgileri onayla,
      düzeltme öner (moderasyona düşer), kapalı bildir, şikâyet et.

### API'si olup mobilde bağlı olmayan uçlar tamamlandı

Denetimde 11 uç mobilde kullanılmıyordu; hepsi bağlandı:

- [x] `DELETE /auth/account` — hesap silme (App Store zorunluluğu + KVKK). Onay için
      "SİL" yazma adımı var; sunucu kişisel veriyi anonimleştirir.
- [x] `POST /auth/verify-email` — e-posta doğrulama. `campulator://verify-email?token=`
      derin bağlantısı uygulama açıkken de kapalıyken de işlenir; bağlantı çalışmazsa
      kod elle girilebilir. MailService artık log'a bağlantıyı da yazıyor.
- [x] `PATCH /me` — profil düzenleme (görünen ad, hakkında, arayüz dili)
- [x] `PATCH /reviews/:id`, `DELETE /reviews/:id` — kendi yorumunu düzenle/sil
- [x] `POST /reviews/:id/report` — yorum şikâyeti (kategori çipleri)
- [x] `DELETE /reviews/:id/helpful` — faydalı işaretini geri alma (artık aç/kapa)
- [x] `POST /reviews/:id/photos`, `DELETE /photos/:id` — yoruma fotoğraf ekleme/silme
- [x] `GET /places/duplicate-check` — form doldururken anlık mükerrer uyarısı
- [x] `GET /users/:id` — başka kullanıcının profili (yorumdaki isme dokunma)
- [x] `DELETE /devices/fcm-token/:id` — istemci metodu eklendi; cihaz kaydı FCM
      entegrasyonuyla birlikte oluşacağı için çağrısı o adımda devreye girecek.

### E-posta akışları 6 haneli koda geçirildi

Bağlantılı (derin link) akış kaldırıldı; hem e-posta doğrulama hem şifre
sıfırlama artık e-postayla gönderilen 6 haneli kodla çalışıyor.

- Kod `randomInt` ile kriptografik olarak üretilir, hash'lenerek saklanır.
- 15 dakika geçerli, tek kullanımlık; yeni kod öncekini geçersiz kılar.
- Kısa kod kaba kuvvete açık olduğu için: token tablolarına `attempts` sayacı
  eklendi (5 hatalı deneme → kod iptal) ve uçlara ayrıca dakikalık istek sınırı
  kondu (`@Throttle`).
- Kod global değil kullanıcıya özel doğrulanır: uçlar artık **e-posta + kod**
  ister (`POST /auth/verify-email`, `POST /auth/reset-password`). Aksi halde
  rastgele 6 hane başka bir hesabın koduyla eşleşebilirdi.
- `expo-linking` bağımlılığı kaldırıldı; derin bağlantı kodu tamamen silindi.
- Testler: `verification-code.test.ts` (6 test — doğru/yanlış kod, deneme
  sınırı, süre dolumu, hesap sızdırmama).

### Kod gönderiminde spam koruması ve doğrulama zorunluluğu

- [x] **Bekleme süresi**: İlk koddan sonra 1 dakika, sonraki her istekte
      5 dakika beklenir (30 dakikalık pencere; pencere dolunca sayaç sıfırlanır).
      Kayıt sırasında üretilen kod da sayılır, yani kayıttan hemen sonra
      1 dakika beklenir. Hem doğrulama hem şifre sıfırlama için geçerli.
- [x] **Kayıtlı olmayan adrese e-posta gönderilmez** (zaten gönderilmiyordu;
      artık testle güvence altında). Yanıt yine "gönderildi" der — hesabın
      var olup olmadığı sızdırılmaz.
- [x] Uçlar `{ sent, retryAfterSeconds }` döner; mobilde yeniden gönder
      düğmesi geri sayımla kilitlenir (`useCountdown`).
- [x] **Doğrulanmamış kullanıcı uygulamaya giremez**: giriş sonrası sekmeler
      yerine `VerifyEmailGate` ekranı açılır. Ekranda kod girişi, yeniden
      gönderme (geri sayımlı), misafir olarak devam ve çıkış seçenekleri var.
- [x] Testler: `code-cooldown.test.ts` (8 test).

### Düzeltilen hatalar

- [x] **Keşfet haritasında markera dokununca marker sol üst köşeye sıçrıyordu.**
      Marker'ın içeriği seçim durumuna göre değişiyordu; react-native-maps iOS
      tarafında var olan bir marker'ın alt görünümü değişince marker'ı haritanın
      sol üst köşesine taşıyor. Marker anahtarına seçim durumu eklendi (seçim
      değişince marker güncellenmek yerine yeniden oluşturuluyor) ve tüm
      marker'lar `tracksViewChanges={false}` ile tek sefer çiziliyor.
- [x] **"Kapalı görünüyor" onayı hiçbir şey yapmıyordu.** `resolveModerationItem`
      içinde `PLACE_CLOSED_REPORT` için karar dalı yazılmamıştı; moderatör onaylasa
      da nokta açık kalıyordu. Onayda artık `operatingStatus` kalıcı kapalıya çekiliyor,
      CampScore yeniden hesaplanıyor ve noktayı ekleyen kullanıcıya bildirim gidiyor.
      Regresyon testi: `closed-report.test.ts` (4 test).

---

## Gerçek Veri (OpenStreetMap İçe Aktarımı)

- [x] **Pipeline depoya alındı** — `tools/global-pipeline` (Python). PBF yolunun
      yanına **Overpass API** yolu eklendi (`fetch` komutu): pyosmium derlemeden,
      PBF indirmeden bölge bazlı veri çekilebiliyor. pyosmium artık isteğe bağlı
      (`pip install -e ".[pbf]"`).
- [x] **Şema** — `Place.externalId/dataSource/sourceUrl/attribution` ve
      `Photo.externalUrl/externalId/attribution/license/sourceUrl` eklendi.
- [x] **Eşleme katmanı** — `apps/api/src/import/osm-mapping.ts`: OSM etiketleri →
      aktivite, imkân (RV_HOOKUP dâhil), doğa etiketleri (FOREST/LAKESIDE/MOUNTAIN…),
      adres, açıklama, ücret tipi, slug, yayın durumu. 22 birim testi.
- [x] **İçe aktarıcı** — `pnpm --filter @campulator/api import:places`.
      `external_id` üzerinden idempotent; `--bbox`, `--limit`, `--dry-run`;
      aktivite/imkân bağları her çalıştırmada eşitlenir, sonunda CampScore
      yeniden hesaplanır. Kullanıcı katkısı noktalara dokunmaz.
- [x] **API yanıtları** — fotoğraflar artık tek `url` alanı döner (yerel depo ya da
      dış kaynak) ve `attribution/license/sourceUrl` taşır; nokta listesine
      `coverPhoto`, detaya kaynak künyesi eklendi.
- [x] **Mobil** — nokta detayında gerçek fotoğraf galerisi (yatay, sayfalı),
      fotoğraf üzerinde lisans künyesi ve altta "Veri kaynağı: © OpenStreetMap
      contributors" satırı (ODbL gereği).

## Kalan İşler

Anahtar/hesap bekleyenler (kod hazır, `.env` ile aktifleşir):

- Google Maps / Routes — gerçek rota verisi
- Google / Apple ile giriş
- FCM push (Apple Developer üyeliği bekliyor)
- SMTP ile e-posta gönderimi

Ayrıca `TEST_RAPORU.md` **§4.5 Yayına çıkmadan önce mutlaka yapılacaklar** listesi
(en kritiği `AUTH_AUTO_VERIFY_EMAIL=false`) ve e2e testler / crash reporting.
