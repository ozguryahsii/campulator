import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/client';
import { BrandLogo } from '../components/BrandLogo';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/tokens';

export function ProfileScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user, isGuest, signOut } = useAuthStore();
  const [resent, setResent] = useState(false);

  const resend = async () => {
    if (!user?.email) return;
    try {
      await authApi.resendVerification(user.email);
      setResent(true);
    } catch {
      // sessizce geç; kullanıcı tekrar deneyebilir
    }
  };

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('profile.title')}</Text>

      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <View style={styles.row}>
          <BrandLogo size={48} />
          <View style={styles.info}>
            <Text style={[styles.name, { color: theme.colors.textPrimary }]}>
              {user ? user.displayName : t('profile.guest')}
            </Text>
            {user?.email && (
              <Text style={[styles.email, { color: theme.colors.textSecondary }]}>
                {user.email}
              </Text>
            )}
            {user && (
              <Text style={[styles.trust, { color: theme.colors.primary }]}>{user.trustLevel}</Text>
            )}
          </View>
        </View>

        {user && !user.emailVerified && (
          <View style={[styles.verifyBox, { borderColor: theme.colors.warning }]}>
            <Text style={{ color: theme.colors.warning, fontWeight: '600' }}>
              {t('auth.verificationPending')}
            </Text>
            <Pressable onPress={resend} disabled={resent}>
              <Text style={{ color: theme.colors.primary, marginTop: 8 }}>
                {resent ? t('auth.verificationSent') : t('auth.resendVerification')}
              </Text>
            </Pressable>
          </View>
        )}

        {(user || isGuest) && user && (
          <Pressable
            style={[styles.signOut, { borderColor: theme.colors.border }]}
            onPress={() => void signOut()}
          >
            <Text style={{ color: theme.colors.danger, fontWeight: '600' }}>
              {t('auth.signOut')}
            </Text>
          </Pressable>
        )}
      </View>

      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <Text style={[styles.badge, { color: theme.colors.primary }]}>
          {t('common.comingSoon')}
        </Text>
        <Text style={[styles.placeholder, { color: theme.colors.textSecondary }]}>
          {t('profile.placeholder')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 72 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 24 },
  card: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  info: { flex: 1 },
  name: { fontSize: 18, fontWeight: '700' },
  email: { fontSize: 13, marginTop: 2 },
  trust: { fontSize: 12, fontWeight: '700', marginTop: 6, letterSpacing: 0.5 },
  verifyBox: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 16 },
  signOut: { borderTopWidth: 1, marginTop: 16, paddingTop: 14, alignItems: 'center' },
  badge: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 1,
  },
  placeholder: { fontSize: 15, lineHeight: 22 },
});
