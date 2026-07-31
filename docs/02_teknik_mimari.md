# Campulator — Teknik Mimari

## 1. Yüksek Seviye Mimari

### Mobil

- React Native
- Expo
- TypeScript
- React Navigation
- TanStack Query
- Zustand
- react-native-maps
- i18next
- Firebase Cloud Messaging
- SecureStore

### Backend

- Node.js
- NestJS
- PostgreSQL
- Prisma veya TypeORM
- REST API
- JWT access + refresh token
- Google OAuth
- Apple Sign-In
- E-posta doğrulama
- RBAC
- Audit log
- Rate limiting
- OpenAPI / Swagger

### Admin Panel

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod

## 2. Backend Modülleri

- AuthModule
- UsersModule
- ProfilesModule
- RolesModule
- PlacesModule
- ActivitiesModule
- AmenitiesModule
- RatingsModule
- CampScoreModule
- ReviewsModule
- ReviewRepliesModule
- PhotosModule
- CollectionsModule
- SavedSearchesModule
- SmartMatchModule
- MapsModule
- RoutesModule
- ReportsModule
- ModerationModule
- TrustModule
- BusinessesModule
- NotificationsModule
- StorageModule
- AuditModule
- LocalizationModule

## 3. Kimlik Doğrulama

- Access token kısa ömürlü
- Refresh token döndürülebilir ve iptal edilebilir
- Refresh token hash’i veritabanında tutulur
- Cihaz oturumları listelenebilir
- E-posta doğrulanmadan katkı işlemleri engellenir
- Google/Apple sağlayıcı e-postası doğrulanmış kabul edilir

## 4. Yetki Modeli

Roller:

- GUEST
- USER
- CONTRIBUTOR
- TRUSTED_CONTRIBUTOR
- EXPERT_CAMPER
- BUSINESS_OWNER
- MODERATOR
- ADMIN
- SUPER_ADMIN

Rol ve güvenilirlik seviyesi ayrı kavramlardır.

## 5. Storage Abstraction

Arayüz:

- upload()
- delete()
- getPublicUrl()
- getSignedUrl()
- move()
- validate()

Geliştirmede:

- LocalStorageProvider

Production:

- S3CompatibleStorageProvider
- GCSStorageProvider

## 6. Google Maps Kullanımı

- Harita: Google Maps SDK
- Geocoding / autocomplete: kontrollü kullanım
- Routes API yalnızca kullanıcı rota istediğinde
- Kamp verisi kendi PostgreSQL veritabanından
- Harita hareketinde Google Places sorgusu yapılmaz
- API key kısıtları ve quota uygulanır

## 7. Konum Gizliliği

EXACT:

- Gerçek koordinat döner

APPROXIMATE:

- Gerçek koordinat normal istemciye dönmez
- 500 m alan için bulanıklaştırılmış merkez döner
- Gerçek koordinat yalnızca yetkili admin endpoint’inde

## 8. CampScore Servisi

CampScore hesaplaması backend’de merkezi servis olarak yapılır.

- Features Score
- User Rating
- Atmosphere Score
- Overall Score

Her onaylı özellik değişikliğinde yeniden hesaplanır.
Her aktif kullanıcı değerlendirmesi değişikliğinde yeniden hesaplanır.
Ağırlıklar konfigürasyon tablosunda tutulur.

## 9. Smart Match Servisi

Girdi:

- search text
- selected criteria
- locale
- optional map bounds

Çıktı:

- place
- matchedCriteria
- missingCriteria
- matchPercentage

Tüm kriterler eşit ağırlıklı.

## 10. Moderasyon

- FIFO varsayılan sıralama
- Moderasyon nesneleri tek generic tablo veya tip bazlı tablolarla yönetilebilir
- Her işlem audit log’a yazılır
- Şikâyet sayısı otomatik gizleme yapmaz
- Mükerrer kayıt birleştirme transaction içinde yapılır

## 11. Push Bildirim

- FCM token kullanıcı + cihaz bazında
- Birden fazla cihaz desteklenir
- Geçersiz token temizlenir
- Bildirim tercihi kullanıcı bazında
- In-app notification ve push delivery ayrı kaydedilir

## 12. i18n

- Mobil ve admin için ayrı locale dosyaları
- Backend hata kodları locale bağımsız
- İstemci hata kodunu yerelleştirir
- Tarih, sayı, mesafe ve para Intl ile formatlanır
