import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/tokens';

const PAGES = [
  { icon: 'compass' as const, titleKey: 'onboarding.page1Title', bodyKey: 'onboarding.page1Body' },
  {
    icon: 'git-compare' as const,
    titleKey: 'onboarding.page2Title',
    bodyKey: 'onboarding.page2Body',
  },
  { icon: 'sparkles' as const, titleKey: 'onboarding.page3Title', bodyKey: 'onboarding.page3Body' },
];

export function OnboardingScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const [page, setPage] = useState(0);

  const isLast = page === PAGES.length - 1;
  const current = PAGES[page];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Pressable style={styles.skip} onPress={() => completeOnboarding()}>
        <Text style={{ color: theme.colors.textSecondary }}>{t('onboarding.skip')}</Text>
      </Pressable>

      <View style={styles.content}>
        <View
          style={[
            styles.iconCircle,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <Ionicons name={current.icon} size={64} color={theme.colors.primary} />
        </View>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {t(current.titleKey)}
        </Text>
        <Text style={[styles.body, { color: theme.colors.textSecondary }]}>
          {t(current.bodyKey)}
        </Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {PAGES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                {
                  backgroundColor:
                    index === page ? theme.colors.primary : theme.colors.elevatedSurface,
                },
              ]}
            />
          ))}
        </View>
        <Pressable
          style={[styles.cta, { backgroundColor: theme.colors.primary }]}
          onPress={() => (isLast ? completeOnboarding() : setPage(page + 1))}
        >
          <Text style={[styles.ctaText, { color: theme.colors.background }]}>
            {isLast ? t('onboarding.start') : t('onboarding.next')}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  skip: { alignSelf: 'flex-end', marginTop: 48, padding: 8 },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 12 },
  body: { fontSize: 16, lineHeight: 24, textAlign: 'center', paddingHorizontal: 16 },
  footer: { paddingBottom: 32 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  cta: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  ctaText: { fontSize: 17, fontWeight: '700' },
});
