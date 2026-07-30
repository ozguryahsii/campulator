# Campulator — Geliştirme İlerlemesi

Bu dosya faz bazlı ilerlemeyi takip eder. Her oturum sonunda güncellenir.
Faz tanımları: `docs/07_gelistirme_fazlari.md`

## Durum Özeti

| Faz    | Konu                          | Durum         |
| ------ | ----------------------------- | ------------- |
| Faz 0  | Temel kurulum                 | 🟢 Tamamlandı |
| Faz 1  | Kimlik ve profil              | ⚪ Başlanmadı |
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

## Sıradaki: Faz 1 — Kimlik ve Profil

Kapsam (`docs/07_gelistirme_fazlari.md`):

- [ ] E-posta kayıt + şifre (argon2/bcrypt)
- [ ] E-posta doğrulama akışı (token üretimi; gönderim dev'de konsola/log'a)
- [ ] JWT access + refresh token (rotasyon + iptal, hash'li saklama)
- [ ] Google login (stub sağlayıcı, anahtar eklenince gerçek)
- [ ] Apple login (stub sağlayıcı)
- [ ] Misafir kullanım kuralları (katkı işlemlerinde giriş zorunluluğu)
- [ ] Profil CRUD (GET/PATCH /me, GET /users/:id)
- [ ] Rol ve güven seviyesi altyapısı (RBAC guard'ları)
- [ ] Yasal onay kayıtları
- [ ] Mobil: onboarding (dil seçimi + 3 sayfa), giriş/kayıt ekranları, misafir modu
