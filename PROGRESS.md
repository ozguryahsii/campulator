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
| Faz 8  | Rota                          | ⚪ Başlanmadı |
| Faz 9  | Bildirim                      | ⚪ Başlanmadı |
| Faz 10 | Admin panel                   | ⚪ Başlanmadı |
| Faz 11 | Kalite ve yayına hazırlık     | ⚪ Başlanmadı |

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

## Sıradaki: Faz 8 — Rota

- [ ] POST /routes/preview (başlangıç + hedef, mesafe, süre, polyline)
- [ ] Anahtarsız modda mock rota (kuş uçuşu mesafe + tahmini süre)
- [ ] Detaydaki "Yol Tarifi" butonunun aktifleşmesi
- [ ] Mesafe filtresi (Faz 3'ten ertelenmişti; kullanıcı konumu ile)
