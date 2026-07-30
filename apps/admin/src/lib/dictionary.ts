/**
 * Admin i18n iskeleti — kullanıcıya görünen metinler sözlük anahtarları üzerinden gelir,
 * modüllerde hardcoded string kullanılmaz (docs/06). Faz 10'da tam i18n altyapısına
 * (locale seçimi, EN sözlüğü) genişletilecek.
 */

export type Locale = 'tr' | 'en';

const tr = {
  'app.title': 'Campulator Yönetim',
  'app.subtitle': 'Yönetici ve moderasyon paneli',
  'nav.dashboard': 'Panel',
  'nav.moderation': 'Moderasyon Kuyruğu',
  'nav.places': 'Noktalar',
  'nav.duplicates': 'Mükerrer İnceleme',
  'nav.changeRequests': 'Değişiklik Talepleri',
  'nav.reports': 'Şikâyetler',
  'nav.reviewsPhotos': 'Yorumlar ve Fotoğraflar',
  'nav.users': 'Kullanıcılar',
  'nav.trust': 'Güven Seviyeleri',
  'nav.businesses': 'İşletmeler',
  'nav.scoreConfig': 'Skor Konfigürasyonu',
  'nav.amenities': 'İmkânlar ve Aktiviteler',
  'nav.notifications': 'Bildirimler',
  'nav.localization': 'Yerelleştirme',
  'nav.auditLogs': 'Denetim Kayıtları',
  'nav.settings': 'Sistem Ayarları',
  'dashboard.welcome': 'Campulator yönetim paneline hoş geldiniz.',
  'dashboard.phase':
    'Faz 0 iskeleti — modüller Faz 10 kapsamında API bağlantılarıyla doldurulacak.',
  'common.comingSoon': 'Yakında',
} as const;

export type DictionaryKey = keyof typeof tr;

const dictionaries: Record<Locale, Record<DictionaryKey, string>> = {
  tr,
  // EN çevirileri Faz 10'da tamamlanacak; şimdilik TR'ye düşer
  en: tr,
};

export function t(key: DictionaryKey, locale: Locale = 'tr'): string {
  return dictionaries[locale][key] ?? key;
}
