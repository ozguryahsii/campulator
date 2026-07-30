import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useQueries } from '@tanstack/react-query';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { CRITERIA_CATALOG } from '@campulator/shared';
import { apiRequest } from '../api/client';
import type { PlaceDetail } from '../api/places';
import { ACTIVITY_ICONS } from '../features/explore/markers';
import { useCompareStore } from '../store/compareStore';
import { palette, useTheme } from '../theme/tokens';

const COL_WIDTH = 132;

export function CompareScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation();
  const { places, toggle, clear } = useCompareStore();

  const detailQueries = useQueries({
    queries: places.map((place) => ({
      queryKey: ['place', place.id],
      queryFn: async () => {
        try {
          return await apiRequest<PlaceDetail>(`/places/${place.id}`);
        } catch {
          return place as unknown as PlaceDetail;
        }
      },
    })),
  });
  const details = detailQueries.map((q) => q.data).filter(Boolean) as PlaceDetail[];

  const check = (yes: boolean | undefined) => (
    <Ionicons
      name={yes ? 'checkmark-circle' : 'remove-outline'}
      size={16}
      color={yes ? theme.colors.primary : theme.colors.textSecondary}
    />
  );

  const amenityCodes = CRITERIA_CATALOG.filter((c) => c.group === 'amenity').map((c) => c.code);
  const tagDefs = CRITERIA_CATALOG.filter((c) => c.group === 'tag');

  const row = (label: string, render: (d: PlaceDetail) => React.ReactNode, key?: string) => (
    <View key={key ?? label} style={[styles.row, { borderTopColor: theme.colors.border }]}>
      <Text style={[styles.rowLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      {details.map((d) => (
        <View key={d.id} style={styles.cell}>
          {render(d)}
        </View>
      ))}
    </View>
  );

  const cellText = (value: string, color?: string) => (
    <Text style={{ color: color ?? theme.colors.textPrimary, fontSize: 12 }} numberOfLines={2}>
      {value}
    </Text>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {t('compare.title')}
        </Text>
        <Pressable onPress={clear} hitSlop={8}>
          <Text style={{ color: theme.colors.primary, fontSize: 13 }}>{t('compare.clear')}</Text>
        </Pressable>
      </View>

      {details.length < 2 ? (
        <View style={styles.empty}>
          <Ionicons name="git-compare-outline" size={44} color={theme.colors.textSecondary} />
          <Text style={{ color: theme.colors.textSecondary, textAlign: 'center', marginTop: 12 }}>
            {t('compare.hint')}
          </Text>
        </View>
      ) : (
        <ScrollView horizontal>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={styles.headerRow}>
              <View style={styles.rowLabel} />
              {details.map((d) => (
                <View key={d.id} style={styles.cell}>
                  <Pressable
                    style={styles.removeBadge}
                    onPress={() => toggle(d as never)}
                    hitSlop={6}
                  >
                    <Ionicons name="close" size={12} color={theme.colors.textSecondary} />
                  </Pressable>
                  {d.score && (
                    <View style={[styles.scoreBadge, { backgroundColor: theme.colors.primary }]}>
                      <Text style={{ color: palette.background, fontWeight: '800' }}>
                        {d.score.overall.toFixed(1)}
                      </Text>
                    </View>
                  )}
                  <Text
                    style={{ color: theme.colors.textPrimary, fontWeight: '700', fontSize: 13 }}
                    numberOfLines={2}
                  >
                    {d.name}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>{d.city}</Text>
                </View>
              ))}
            </View>

            {row(t('score.features'), (d) => cellText(d.score ? d.score.features.toFixed(1) : '—'))}
            {row(t('score.userRating'), (d) =>
              cellText(d.score ? d.score.userRating.toFixed(1) : '—'),
            )}
            {row(t('score.atmosphere'), (d) =>
              cellText(d.score ? d.score.atmosphere.toFixed(1) : '—'),
            )}
            {row(t('criteria.groups.fee'), (d) =>
              cellText(
                d.feeType === 'FREE'
                  ? t('explore.free')
                  : d.feeType === 'PAID'
                    ? t('explore.paid')
                    : '—',
                d.feeType === 'FREE' ? theme.colors.primary : palette.fireAccent,
              ),
            )}
            {row(t('filters.operatingStatus'), (d) =>
              cellText(
                d.operatingStatus === 'OPEN'
                  ? t('detail.open')
                  : t(`explore.status.${d.operatingStatus}`),
              ),
            )}
            {row(t('detail.exactLocation'), (d) => check(d.locationPrecision === 'EXACT'))}
            {(['CARAVAN', 'TENT', 'PICNIC', 'BARBECUE'] as const).map((code) =>
              row(
                t(`activity.${code.toLowerCase()}`),
                (d) => (
                  <View style={{ flexDirection: 'row', gap: 4 }}>
                    <MaterialCommunityIcons
                      name={ACTIVITY_ICONS[code]}
                      size={13}
                      color={theme.colors.textSecondary}
                    />
                    {check(d.activities.includes(code))}
                  </View>
                ),
                `act-${code}`,
              ),
            )}
            {amenityCodes.map((code) =>
              row(
                t(
                  `amenity.${code === 'WC' ? 'wc' : code.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`,
                ),
                (d) => check(d.amenities?.some((a) => a.code === code)),
                `am-${code}`,
              ),
            )}
            {tagDefs.map((def) =>
              row(t(def.labelKey), (d) => check(d.tags?.includes(def.code)), `tag-${def.code}`),
            )}
          </ScrollView>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  headerRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  rowLabel: { width: 120, fontSize: 12 },
  cell: { width: COL_WIDTH, paddingRight: 8 },
  removeBadge: { alignSelf: 'flex-end' },
  scoreBadge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
});
