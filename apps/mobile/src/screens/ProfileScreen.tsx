import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '../api/client';
import { profileApi } from '../api/profile';
import { AvatarPicker } from '../features/profile/AvatarPicker';
import { ChangePassword } from '../features/profile/ChangePassword';
import { DeleteAccount } from '../features/profile/DeleteAccount';
import { EditProfile } from '../features/profile/EditProfile';
import { VerifyEmail } from '../features/profile/VerifyEmail';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/tokens';

interface PublicProfile {
  displayName: string;
  trustLevel: string;
  memberSince: string;
  stats: {
    reviews: number;
    ratings: number;
    addedPlaces: number;
    photos: number;
    approvedChanges: number;
  };
}

export function ProfileScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user, isGuest, signOut, exitGuest } = useAuthStore();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  // Kendi profilim (avatar, bio)
  const { data: me } = useQuery({
    queryKey: ['my-profile'],
    queryFn: profileApi.me,
    enabled: !!user,
    retry: 0,
  });

  // Katkı istatistikleri (docs/01 §16)
  const { data: profile } = useQuery({
    queryKey: ['public-profile', user?.id],
    queryFn: () => apiRequest<PublicProfile>(`/users/${user!.id}`),
    enabled: !!user,
    retry: 0,
  });

  const card = (children: React.ReactNode, key?: string) => (
    <View
      key={key}
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      {children}
    </View>
  );

  const STAT_KEYS = ['addedPlaces', 'reviews', 'ratings', 'photos', 'approvedChanges'] as const;

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('profile.title')}</Text>

      {card(
        <>
          <View style={styles.row}>
            {user ? (
              <AvatarPicker
                avatarUrl={me?.avatarUrl ?? null}
                displayName={me?.displayName ?? user.displayName}
                size={64}
              />
            ) : (
              <View style={styles.guestAvatar}>
                <Ionicons name="person-outline" size={28} color={theme.colors.textSecondary} />
              </View>
            )}
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
                <Text style={[styles.trust, { color: theme.colors.primary }]}>
                  {t(`profile.trustLevels.${user.trustLevel}`, { defaultValue: user.trustLevel })}
                </Text>
              )}
            </View>
          </View>

          {user && !user.emailVerified && <VerifyEmail email={user.email} />}

          {/* Hesap yönetimi: profil düzenleme, şifre, hesap silme */}
          {user && me && (
            <View style={[styles.passwordBox, { borderTopColor: theme.colors.border }]}>
              <EditProfile profile={me} />
            </View>
          )}
          {user && (
            <View style={[styles.passwordBox, { borderTopColor: theme.colors.border }]}>
              <ChangePassword />
            </View>
          )}
          {user && (
            <View style={[styles.passwordBox, { borderTopColor: theme.colors.border }]}>
              <DeleteAccount />
            </View>
          )}

          {user && (
            <Pressable
              style={[styles.signOut, { borderColor: theme.colors.border }]}
              onPress={() => void signOut()}
              accessibilityRole="button"
              accessibilityLabel={t('auth.signOut')}
            >
              <Text style={{ color: theme.colors.danger, fontWeight: '600' }}>
                {t('auth.signOut')}
              </Text>
            </Pressable>
          )}
        </>,
        'identity',
      )}

      {/* Misafir modunda giriş/kayıt ekranına dönüş */}
      {!user && (
        <>
          {card(
            <>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21 }}>
                {t('profile.guestNote')}
              </Text>
              <Pressable
                style={[styles.cta, { backgroundColor: theme.colors.primary }]}
                onPress={exitGuest}
                accessibilityRole="button"
                accessibilityLabel={t('profile.loginOrRegister')}
              >
                <Ionicons name="log-in-outline" size={18} color={theme.colors.background} />
                <Text style={{ color: theme.colors.background, fontWeight: '700' }}>
                  {t('profile.loginOrRegister')}
                </Text>
              </Pressable>
            </>,
            'guest-cta',
          )}
        </>
      )}

      {/* Katkı istatistikleri */}
      {user &&
        profile &&
        card(
          <>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              {t('profile.contributions')}
            </Text>
            <View style={styles.statsGrid}>
              {STAT_KEYS.map((key) => (
                <View key={key} style={styles.stat}>
                  <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                    {profile.stats[key]}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                    {t(`profile.stats.${key}`)}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 12 }}>
              {t('profile.memberSince', {
                date: new Date(profile.memberSince).toLocaleDateString(),
              })}
            </Text>
          </>,
          'stats',
        )}

      {user &&
        card(
          <Pressable
            style={styles.row}
            onPress={() => navigation.navigate('Notifications')}
            accessibilityRole="button"
            accessibilityLabel={t('notifications.open')}
          >
            <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.textPrimary, flex: 1, fontWeight: '600' }}>
              {t('notifications.open')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
          </Pressable>,
          'notifications',
        )}

      {isGuest && !user && (
        <Text style={[styles.footNote, { color: theme.colors.textSecondary }]}>
          {t('profile.guestFootnote')}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 72, paddingBottom: 48 },
  guestAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordBox: { borderTopWidth: 1, marginTop: 16, paddingTop: 14 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 24 },
  card: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  info: { flex: 1 },
  name: { fontSize: 18, fontWeight: '700' },
  email: { fontSize: 13, marginTop: 2 },
  trust: { fontSize: 12, fontWeight: '700', marginTop: 6, letterSpacing: 0.5 },
  verifyBox: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 16 },
  signOut: { borderTopWidth: 1, marginTop: 16, paddingTop: 14, alignItems: 'center' },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  stat: { minWidth: 72 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2 },
  footNote: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
