import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '../../components/BrandLogo';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/tokens';

export function LanguageSelectScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const setLanguage = useAuthStore((s) => s.setLanguage);

  const choose = async (language: 'tr' | 'en') => {
    await i18n.changeLanguage(language);
    await setLanguage(language);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <BrandLogo size={110} />
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('language.title')}</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
        {t('language.subtitle')}
      </Text>
      <View style={styles.buttons}>
        {(['tr', 'en'] as const).map((lang) => (
          <Pressable
            key={lang}
            onPress={() => choose(lang)}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: theme.colors.surface,
                borderColor: pressed ? theme.colors.primary : theme.colors.border,
              },
            ]}
          >
            <Text style={[styles.buttonText, { color: theme.colors.textPrimary }]}>
              {lang === 'tr' ? t('language.turkish') : t('language.english')}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 26, fontWeight: '700', marginTop: 32 },
  subtitle: { fontSize: 15, marginTop: 4 },
  buttons: { marginTop: 40, width: '100%', gap: 12 },
  button: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: { fontSize: 17, fontWeight: '600' },
});
