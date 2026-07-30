import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import tr from './locales/tr.json';

const deviceLanguage = Localization.getLocales()[0]?.languageCode ?? 'tr';

void i18n.use(initReactI18next).init({
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  // Onboarding'deki dil seçimi Faz 1'de bu değeri güncelleyecek
  lng: deviceLanguage === 'en' ? 'en' : 'tr',
  fallbackLng: 'tr',
  interpolation: { escapeValue: false },
});

export default i18n;
