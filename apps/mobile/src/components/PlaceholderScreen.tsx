import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../theme/tokens';

interface Props {
  titleKey: string;
  placeholderKey: string;
}

/** Faz 0 iskeletinde sekme içerikleri için geçici ekran. */
export function PlaceholderScreen({ titleKey, placeholderKey }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t(titleKey)}</Text>
      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <Text style={[styles.badge, { color: theme.colors.primary }]}>
          {t('common.comingSoon')}
        </Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          {t(placeholderKey)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 72,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  badge: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 1,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
  },
});
