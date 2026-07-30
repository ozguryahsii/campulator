import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PlaceListItem } from '../api/places';
import { ACTIVITY_ICONS } from '../features/explore/markers';
import { palette, useTheme } from '../theme/tokens';

interface Props {
  place: PlaceListItem;
  width?: number;
  selected?: boolean;
  onPress?: () => void;
}

export function PlaceCard({ place, width, selected, onPress }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        width !== undefined && { width },
        {
          backgroundColor: theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
        },
      ]}
    >
      <View style={[styles.photo, { backgroundColor: theme.colors.elevatedSurface }]}>
        <Ionicons name="image-outline" size={22} color={theme.colors.textSecondary} />
        <Text style={[styles.photoText, { color: theme.colors.textSecondary }]}>
          {t('explore.photoPending')}
        </Text>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.name, { color: theme.colors.textPrimary }]} numberOfLines={1}>
            {place.name}
          </Text>
          {place.score && (
            <View style={[styles.score, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.scoreText}>{place.score.overall.toFixed(1)}</Text>
            </View>
          )}
        </View>

        <Text style={[styles.meta, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {[place.city, place.region].filter(Boolean).join(' · ')}
          {place.locationPrecision === 'APPROXIMATE' &&
            `  ·  ${t('explore.approximate', { radius: place.approximateRadiusMeters ?? 500 })}`}
        </Text>

        <View style={styles.footer}>
          <View style={styles.activities}>
            {place.activities.map((code) => (
              <MaterialCommunityIcons
                key={code}
                name={ACTIVITY_ICONS[code]}
                size={15}
                color={theme.colors.primary}
              />
            ))}
          </View>
          <Text
            style={[
              styles.fee,
              { color: place.feeType === 'FREE' ? theme.colors.primary : palette.fireAccent },
            ]}
          >
            {place.feeType === 'FREE' ? t('explore.free') : t('explore.paid')}
          </Text>
          {place.operatingStatus !== 'OPEN' && (
            <Text style={[styles.status, { color: theme.colors.warning }]}>
              {t(`explore.status.${place.operatingStatus}`)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  photo: {
    width: 86,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoText: { fontSize: 9, textAlign: 'center', paddingHorizontal: 4 },
  body: { flex: 1, padding: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: '700' },
  score: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  scoreText: { color: palette.background, fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 4 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  activities: { flexDirection: 'row', gap: 6 },
  fee: { fontSize: 12, fontWeight: '700' },
  status: { fontSize: 11, fontWeight: '600' },
});
