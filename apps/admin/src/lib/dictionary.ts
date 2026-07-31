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
  'nav.photos': 'Fotoğraf Onayı',
  'nav.auditLogs': 'Denetim Kayıtları',
  'nav.settings': 'Sistem Ayarları',
  'dashboard.welcome': 'Campulator yönetim paneline hoş geldiniz.',
  'dashboard.phase':
    'Faz 0 iskeleti — modüller Faz 10 kapsamında API bağlantılarıyla doldurulacak.',
  'common.comingSoon': 'Yakında',
  'common.loading': 'Yükleniyor...',
  'common.empty': 'Kayıt yok',
  'common.search': 'Ara...',
  'common.approve': 'Onayla',
  'common.reject': 'Reddet',
  'common.archive': 'Arşivle',
  'common.save': 'Kaydet',
  'common.error': 'İşlem başarısız',
  'login.email': 'E-posta',
  'login.password': 'Şifre',
  'login.submit': 'Giriş Yap',
  'login.logout': 'Çıkış yap',
  'login.failed': 'Giriş başarısız. Bilgileri kontrol edin.',
  'login.notAuthorized': 'Bu hesabın yönetim paneli yetkisi yok.',
  'dashboard.pendingModeration': 'Bekleyen moderasyon',
  'dashboard.pendingPlaces': 'Onay bekleyen nokta',
  'dashboard.changeRequests': 'Değişiklik talebi',
  'dashboard.openReports': 'Açık şikâyet',
  'dashboard.activeUsers': 'Aktif kullanıcı',
  'dashboard.reviews': 'Yorum',
  'dashboard.photos': 'Fotoğraf',
  'dashboard.pendingPhotos': 'Onay bekleyen fotoğraf',
  'dashboard.verifiedBusinesses': 'Doğrulanmış işletme',
  'dashboard.publishedPlaces': 'Yayınlanan nokta',
  'moderation.fifoNote': 'Kuyruk en eski kayıt önce (FIFO) sıralanır.',
  'moderation.note': 'Dahili not (isteğe bağlı)',
  'moderation.mergeInto': 'Şununla birleştir (hedef nokta id)',
  'moderation.merge': 'Birleştir',
  'moderation.submittedBy': 'Ekleyen',
  'places.exactCoords': 'Gerçek koordinat',
  'places.publicCoords': 'Public koordinat',
  'users.trustLevel': 'Güven seviyesi',
  'users.trustScore': 'Güven puanı',
  'users.suspend': 'Askıya al',
  'users.activate': 'Aktifleştir',
  'users.stats': 'Katkı',
  'reports.category': 'Kategori',
  'reports.resolve': 'Çözüldü',
  'reports.dismiss': 'Reddet',
  'score.features': 'Özellikler Puanı',
  'score.userRating': 'Kullanıcı Puanı',
  'score.atmosphere': 'Atmosfer Puanı',
  'score.sumWarning': 'Ağırlıkların toplamı 1.00 olmalı.',
  'score.recalculated': '{count} nokta yeniden hesaplandı.',
  'score.amenityWeights': 'İmkân ağırlıkları',
  'businesses.hint':
    'İşletme sahipliği talepleri manuel incelenir. Onaylanan sahip, noktasındaki yorumlara resmî yanıt yazabilir.',
  'businesses.evidence': 'Sahiplik beyanı',
  'businesses.places': 'Bağlı noktalar',
  'businesses.status.PENDING': 'Bekliyor',
  'businesses.status.VERIFIED': 'Doğrulandı',
  'businesses.status.REJECTED': 'Reddedildi',
  'businesses.status.ALL': 'Tümü',
  'localization.hint':
    'Nokta adı ve açıklamalarının dil sürümleri. Boş bırakılan alanlarda varsayılan (TR) metin gösterilir.',
  'localization.field': 'Alan',
  'localization.default': 'Varsayılan (TR)',
  'localization.english': 'İngilizce',
  'localization.name': 'Nokta adı',
  'localization.description': 'Açıklama',
  'localization.saved': 'Çeviriler kaydedildi.',
  'localization.selectPlace': 'Nokta seçin',
  'audit.actor': 'İşlemi yapan',
  'audit.action': 'İşlem',
  'audit.entity': 'Kayıt',
  'audit.date': 'Tarih',
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
