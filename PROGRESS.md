# Campulator — Geliştirme İlerlemesi

Bu dosya faz bazlı ilerlemeyi takip eder. Her oturum sonunda güncellenir.
Faz tanımları: `docs/07_gelistirme_fazlari.md`

## Durum Özeti

| Faz    | Konu                          | Durum         |
| ------ | ----------------------------- | ------------- |
| Faz 0  | Temel kurulum                 | 🟢 Tamamlandı |
| Faz 1  | Kimlik ve profil              | 🟢 Tamamlandı |
| Faz 2  | Yer verisi ve harita          | ⚪ Başlanmadı |
| Faz 3  | Gelişmiş filtre + Smart Match | ⚪ Başlanmadı |
| Faz 4  | CampScore                     | ⚪ Başlanmadı |
| Faz 5  | Katkı sistemi                 | ⚪ Başlanmadı |
| Faz 6  | Yorum, puan, fotoğraf         | ⚪ Başlanmadı |
| Faz 7  | Kaydedilenler + karşılaştırma | ⚪ Başlanmadı |
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

## Sıradaki: Faz 2 — Yer Verisi ve Harita

Kapsam (`docs/07_gelistirme_fazlari.md`):

- [ ] GET /places (bounds, temel filtreler) + GET /places/:id
- [ ] Konum gizliliği: APPROXIMATE noktalarda public koordinat bulanıklaştırma
- [ ] Mobil: Keşfet haritası (react-native-maps), koyu tema
- [ ] Marker sistemi: yeşil gövde + öncelikli aktivite ikonu + "+N" rozeti
- [ ] Cluster (sayısal kümeleme, dokununca yakınlaşma)
- [ ] Alt yatay kart listesi + marker-kart senkronizasyonu
- [ ] Harita / liste görünümü geçişi
- [ ] Temel filtre çipleri (aktivite, ücret)
- [ ] Kalıcı kapalı noktalar varsayılan gizli
