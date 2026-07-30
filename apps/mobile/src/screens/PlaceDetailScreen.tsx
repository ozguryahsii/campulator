import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PlaceDetail, PlaceListItem } from '../api/places';
import { usePlaceDetail, useScoreBreakdown } from '../api/places';
import { ACTIVITY_ICONS } from '../features/explore/markers';
import { BusinessClaim } from '../features/place/BusinessClaim';
import { PlaceActions } from '../features/place/PlaceActions';
import { ReviewsSection } from '../features/place/ReviewsSection';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { palette, useTheme } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'PlaceDetail'>;

const isDetail = (place: PlaceDetail | PlaceListItem): place is PlaceDetail => 'amenities' in place;

function ScoreBar({
  label,
  value,
  weight,
  color,
}: {
  label: string;
  value: number;
  weight?: number;
  color: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.scoreRow}>
      <Text style={[styles.scoreLabel, { color: theme.colors.textSecondary }]}>
        {label}
        {weight !== undefined ? ` · %${Math.round(weight * 100)}` : ''}
      </Text>
      <View style={[styles.barTrack, { backgroundColor: theme.colors.elevatedSurface }]}>
        <View
          style={[styles.barFill, { width: `${(value / 5) * 100}%`, backgroundColor: color }]}
        />
      </View>
      <Text style={[styles.scoreValue, { color: theme.colors.textPrimary }]}>
        {value.toFixed(1)}
      </Text>
    </View>
  );
}

export function PlaceDetailScreen({ route, navigation }: Props) {
  const { placeId, fallback } = route.params;
  const { t } = useTranslation();
  const theme = useTheme();
  const { data: result, isLoading } = usePlaceDetail(placeId, fallback);
  const { data: breakdown } = useScoreBreakdown(placeId);

  const place = result?.data;

  if (isLoading || !place) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  const detail = isDetail(place) ? place : null;
  const score = place.score;

  const card = (children: React.ReactNode) => (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      {children}
    </View>
  );

  const atmosphereEntries = detail?.atmosphere
    ? (
        [
          ['cellSignal', detail.atmosphere.cellSignal],
          ['quietness', detail.atmosphere.quietness],
          ['crowdLevel', detail.atmosphere.crowdLevel],
          ['privacy', detail.atmosphere.privacy],
          ['nightCalm', detail.atmosphere.nightCalm],
          ['socialLevel', detail.atmosphere.socialLevel],
        ] as const
      ).filter(([, value]) => value !== null)
    : [];

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
    >
      {/* Fotoğraf galerisi / bekleniyor yer tutucusu */}
      <View style={[styles.gallery, { backgroundColor: theme.colors.surface }]}>
        <Pressable style={styles.back} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Ionicons name="image-outline" size={40} color={theme.colors.textSecondary} />
        <Text style={{ color: theme.colors.textSecondary, marginTop: 8, fontSize: 13 }}>
          {t('explore.photoPending')}
        </Text>
      </View>

      <View style={styles.body}>
        <Text style={[styles.name, { color: theme.colors.textPrimary }]}>{place.name}</Text>
        <Text style={[styles.meta, { color: theme.colors.textSecondary }]}>
          {[place.city, place.region].filter(Boolean).join(' · ')}
        </Text>

        {/* Rozetler */}
        <View style={styles.badges}>
          <View style={[styles.badge, { borderColor: theme.colors.border }]}>
            <Ionicons
              name={place.locationPrecision === 'EXACT' ? 'location' : 'location-outline'}
              size={12}
              color={theme.colors.primary}
            />
            <Text style={[styles.badgeText, { color: theme.colors.textSecondary }]}>
              {place.locationPrecision === 'EXACT'
                ? t('detail.exactLocation')
                : t('explore.approximate', { radius: place.approximateRadiusMeters ?? 500 })}
            </Text>
          </View>
          <View style={[styles.badge, { borderColor: theme.colors.border }]}>
            <Text
              style={[
                styles.badgeText,
                {
                  color:
                    place.operatingStatus === 'OPEN' ? theme.colors.primary : theme.colors.warning,
                },
              ]}
            >
              {place.operatingStatus === 'OPEN'
                ? t('detail.open')
                : t(`explore.status.${place.operatingStatus}`)}
            </Text>
          </View>
          <View style={[styles.badge, { borderColor: theme.colors.border }]}>
            <Text
              style={[
                styles.badgeText,
                { color: place.feeType === 'FREE' ? theme.colors.primary : palette.fireAccent },
              ]}
            >
              {place.feeType === 'FREE' ? t('explore.free') : t('explore.paid')}
            </Text>
          </View>
        </View>

        {/* CampScore */}
        {score &&
          card(
            <View>
              <View style={styles.scoreHeader}>
                <View>
                  <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                    {t('score.campScore')}
                  </Text>
                  {breakdown && (
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                      {t(`score.${breakdown.label}`)}
                    </Text>
                  )}
                </View>
                <View style={[styles.overallBadge, { backgroundColor: theme.colors.primary }]}>
                  <Text style={styles.overallText}>
                    {(breakdown?.overall ?? score.overall).toFixed(1)}
                  </Text>
                </View>
              </View>
              <ScoreBar
                label={t('score.features')}
                value={breakdown?.components.features.score ?? score.features}
                weight={breakdown?.components.features.weight}
                color={theme.colors.primary}
              />
              <ScoreBar
                label={t('score.userRating')}
                value={breakdown?.components.userRating.score ?? score.userRating}
                weight={breakdown?.components.userRating.weight}
                color={theme.colors.primaryBright}
              />
              <ScoreBar
                label={t('score.atmosphere')}
                value={breakdown?.components.atmosphere.score ?? score.atmosphere}
                weight={breakdown?.components.atmosphere.weight}
                color={palette.fireAccent}
              />
            </View>,
          )}

        {/* Aktiviteler */}
        {card(
          <View>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              {t('criteria.groups.activity')}
            </Text>
            <View style={styles.chips}>
              {place.activities.map((code) => (
                <View
                  key={code}
                  style={[styles.activityChip, { backgroundColor: theme.colors.elevatedSurface }]}
                >
                  <MaterialCommunityIcons
                    name={ACTIVITY_ICONS[code]}
                    size={16}
                    color={theme.colors.primary}
                  />
                  <Text style={{ color: theme.colors.textPrimary, fontSize: 13 }}>
                    {t(`activity.${code.toLowerCase()}`)}
                  </Text>
                </View>
              ))}
            </View>
          </View>,
        )}

        {/* İmkânlar */}
        {detail &&
          detail.amenities.length > 0 &&
          card(
            <View>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                {t('criteria.groups.amenity')}
              </Text>
              <View style={styles.chips}>
                {detail.amenities.map((amenity) => (
                  <View
                    key={amenity.code}
                    style={[styles.amenityChip, { borderColor: theme.colors.border }]}
                  >
                    <Ionicons
                      name={
                        amenity.verificationStatus === 'ADMIN_VERIFIED' ||
                        amenity.verificationStatus === 'COMMUNITY_SUPPORTED'
                          ? 'checkmark-circle'
                          : 'ellipse-outline'
                      }
                      size={13}
                      color={
                        amenity.verificationStatus === 'UNVERIFIED'
                          ? theme.colors.textSecondary
                          : theme.colors.primary
                      }
                    />
                    <Text style={{ color: theme.colors.textPrimary, fontSize: 13 }}>
                      {t(amenity.nameKey)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>,
          )}

        {/* Atmosfer */}
        {atmosphereEntries.length > 0 &&
          card(
            <View>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                {t('criteria.groups.atmosphere')}
              </Text>
              {atmosphereEntries.map(([key, value]) => (
                <ScoreBar
                  key={key}
                  label={t(`detail.atmosphere.${key}`)}
                  value={value as number}
                  color={theme.colors.primaryBright}
                />
              ))}
            </View>,
          )}

        {/* Açıklama */}
        {detail?.description &&
          card(
            <View>
              <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                {t('detail.about')}
              </Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21 }}>
                {detail.description}
              </Text>
              {detail.seasonalOpenFrom && detail.seasonalOpenTo && (
                <Text style={{ color: theme.colors.warning, fontSize: 13, marginTop: 8 }}>
                  {t('detail.season', {
                    from: detail.seasonalOpenFrom,
                    to: detail.seasonalOpenTo,
                  })}
                </Text>
              )}
            </View>,
          )}

        {/* Kaydet / Yol Tarifi / Karşılaştır (Yol Tarifi Faz 8'de) */}
        <PlaceActions place={place} />

        <ReviewsSection placeId={placeId} />

        {/* İşletme sahipliği talebi (onaylanınca resmî yanıt hakkı doğar) */}
        <BusinessClaim placeId={placeId} placeName={place.name} />

        {detail?.lastVerifiedAt && (
          <Text style={[styles.verified, { color: theme.colors.textSecondary }]}>
            {t('detail.lastVerified', {
              date: new Date(detail.lastVerifiedAt).toLocaleDateString(),
            })}
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  container: { paddingBottom: 48 },
  gallery: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  back: {
    position: 'absolute',
    top: 56,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(8,19,31,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 16 },
  name: { fontSize: 24, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { fontSize: 12, fontWeight: '600' },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  overallBadge: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  overallText: { color: palette.background, fontSize: 20, fontWeight: '800' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  scoreLabel: { width: 130, fontSize: 12 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  scoreValue: { width: 32, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  activityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    opacity: 0.6,
  },
  comingSoon: { fontSize: 11, textAlign: 'center', marginTop: 8 },
  verified: { fontSize: 12, textAlign: 'center', marginTop: 16 },
});
