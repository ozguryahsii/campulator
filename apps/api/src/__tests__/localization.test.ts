import { localized } from '../places/places.service';

/**
 * İçerik yerelleştirme kuralı (docs/06): istenen dilde çeviri varsa o,
 * yoksa varsayılan (TR) metin döner.
 */
describe('localized', () => {
  const translations = [
    { locale: 'en', name: 'Cirali Beach Campsite', description: 'Seaside camping area.' },
    { locale: 'de', name: null, description: null },
  ];

  it('TR istendiğinde varsayılan metin döner (çeviri aranmaz)', () => {
    expect(localized(translations, 'tr', 'name', 'Çıralı Sahil Kamp Alanı')).toBe(
      'Çıralı Sahil Kamp Alanı',
    );
  });

  it('dil belirtilmezse varsayılan metin döner', () => {
    expect(localized(translations, undefined, 'name', 'Çıralı Sahil Kamp Alanı')).toBe(
      'Çıralı Sahil Kamp Alanı',
    );
  });

  it('EN çevirisi varsa onu döner', () => {
    expect(localized(translations, 'en', 'name', 'Çıralı Sahil Kamp Alanı')).toBe(
      'Cirali Beach Campsite',
    );
    expect(localized(translations, 'en', 'description', 'Deniz kenarında kamp alanı.')).toBe(
      'Seaside camping area.',
    );
  });

  it('çeviri kaydı var ama alan boşsa varsayılana düşer', () => {
    expect(localized(translations, 'de', 'name', 'Çıralı Sahil Kamp Alanı')).toBe(
      'Çıralı Sahil Kamp Alanı',
    );
  });

  it('istenen dilde kayıt yoksa varsayılana düşer', () => {
    expect(localized([], 'en', 'name', 'Çıralı Sahil Kamp Alanı')).toBe('Çıralı Sahil Kamp Alanı');
  });

  it('varsayılan da yoksa null döner', () => {
    expect(localized([], 'en', 'description', null)).toBeNull();
  });
});
