import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { avatarUri, profileApi } from '../api/profile';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useTheme } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'UserProfile'>;

const STAT_KEYS = ['addedPlaces', 'reviews', 'ratings', 'photos', 'approvedChanges'] as const;

/** Başka bir kullanıcının herkese açık profili (docs/01 §16) */
export function UserProfileScreen({ route, navigation }: Props) {
  const { userId, displayName } = route.params;
  const { t } = useTranslation();
  const theme = useTheme();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: () => profileApi.publicProfile(userId),
    retry: 0,
  });

  const uri = avatarUri(profile?.avatarUrl);
  const initials = (profile?.displayName ?? displayName ?? '?').trim().charAt(0).toUpperCase();

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
    >
      <Pressable
        onPress={() => navigation.goBack()}
        hitSlop={8}
        style={styles.back}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
      >
        <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
      </Pressable>

      {isLoading && <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 40 }} />}

      {profile && (
        <>
          <View style={styles.header}>
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor: theme.colors.elevatedSurface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              {uri ? (
                <Image source={{ uri }} style={styles.avatarImage} accessibilityRole="image" />
              ) : (
                <Text style={{ color: theme.colors.primary, fontSize: 30, fontWeight: '800' }}>
                  {initials}
                </Text>
              )}
            </View>
            <Text style={[styles.name, { color: theme.colors.textPrimary }]}>
              {profile.displayName}
            </Text>
            <Text style={[styles.trust, { color: theme.colors.primary }]}>
              {t(`profile.trustLevels.${profile.trustLevel}`, { defaultValue: profile.trustLevel })}
            </Text>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 6 }}>
              {t('profile.memberSince', {
                date: new Date(profile.memberSince).toLocaleDateString(),
              })}
            </Text>
          </View>

          {profile.bio && (
            <View
              style={[
                styles.card,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <Text style={{ color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21 }}>
                {profile.bio}
              </Text>
            </View>
          )}

          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
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
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 60, paddingBottom: 48 },
  back: { alignSelf: 'flex-start', marginBottom: 12 },
  header: { alignItems: 'center', marginBottom: 20 },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: 88, height: 88 },
  name: { fontSize: 20, fontWeight: '700', marginTop: 12 },
  trust: { fontSize: 12, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
  card: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  stat: { minWidth: 72 },
  statValue: { fontSize: 20, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2 },
});
