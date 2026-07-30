import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import MapView, { Circle, Marker } from 'react-native-maps';
import { CRITERIA_CATALOG } from '@campulator/shared';
import { contributionsApi } from '../api/contributions';
import type { ActivityCode, CreatePlaceResult } from '../api/places';
import { placesApi } from '../api/places';
import { darkMapStyle } from '../features/explore/mapStyle';
import { ACTIVITY_ICONS } from '../features/explore/markers';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/tokens';

const STEPS = ['info', 'location', 'activity', 'extras', 'summary'] as const;

export function AddPlaceScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  // Konum ve ad girildikten sonra anlık mükerrer uyarısı (docs/01 §14)
  const { data: duplicateCandidates } = useQuery({
    queryKey: ['duplicate-check', coords?.latitude, coords?.longitude, name.trim()],
    queryFn: () =>
      contributionsApi.duplicateCheck(coords!.latitude, coords!.longitude, name.trim()),
    enabled: !!coords && name.trim().length >= 3,
    retry: 0,
  });
  const [precision, setPrecision] = useState<'EXACT' | 'APPROXIMATE'>('EXACT');
  const [activities, setActivities] = useState<ActivityCode[]>([]);
  const [feeType, setFeeType] = useState<'FREE' | 'PAID' | 'UNKNOWN'>('UNKNOWN');
  const [amenities, setAmenities] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [result, setResult] = useState<CreatePlaceResult | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      placesApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        city: city.trim() || undefined,
        latitude: coords!.latitude,
        longitude: coords!.longitude,
        locationPrecision: precision,
        activities,
        feeType,
        amenities: amenities.length ? amenities : undefined,
        tags: tags.length ? tags : undefined,
      }),
    onSuccess: setResult,
  });

  // Form doluluk yüzdesi (docs/01 §13)
  const progress = useMemo(() => {
    const fields = [
      name.trim().length >= 3,
      coords !== null,
      activities.length > 0,
      description.trim().length > 0,
      city.trim().length > 0,
      feeType !== 'UNKNOWN',
      amenities.length > 0,
      tags.length > 0,
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  }, [name, coords, activities, description, city, feeType, amenities, tags]);

  const stepValid =
    step === 0
      ? name.trim().length >= 3
      : step === 1
        ? coords !== null
        : step === 2
          ? activities.length > 0
          : true;

  const toggle = <T,>(list: T[], set: (v: T[]) => void, value: T) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const resetForm = () => {
    setStep(0);
    setName('');
    setDescription('');
    setCity('');
    setCoords(null);
    setPrecision('EXACT');
    setActivities([]);
    setFeeType('UNKNOWN');
    setAmenities([]);
    setTags([]);
    setResult(null);
    mutation.reset();
  };

  const chip = (active: boolean) => [
    styles.chip,
    {
      backgroundColor: active ? theme.colors.primary : theme.colors.elevatedSurface,
      borderColor: active ? theme.colors.primary : theme.colors.border,
    },
  ];
  const chipText = (active: boolean) => ({
    color: active ? theme.colors.background : theme.colors.textPrimary,
    fontSize: 13,
    fontWeight: active ? ('700' as const) : ('400' as const),
  });
  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      color: theme.colors.textPrimary,
    },
  ];

  // Misafir / doğrulanmamış e-posta durumları (docs/01 §5)
  if (!user || !user.emailVerified) {
    return (
      <View style={[styles.gate, { backgroundColor: theme.colors.background }]}>
        <Ionicons
          name={!user ? 'log-in-outline' : 'mail-unread-outline'}
          size={48}
          color={theme.colors.primary}
        />
        <Text style={[styles.gateText, { color: theme.colors.textSecondary }]}>
          {!user ? t('add.loginRequired') : t('add.verifyRequired')}
        </Text>
      </View>
    );
  }

  // Gönderim sonucu ekranı
  if (result) {
    return (
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.gate}
      >
        <Ionicons
          name={result.publicationStatus === 'PUBLISHED' ? 'checkmark-circle' : 'time-outline'}
          size={56}
          color={theme.colors.primary}
        />
        <Text style={[styles.resultTitle, { color: theme.colors.textPrimary }]}>
          {result.publicationStatus === 'PUBLISHED'
            ? t('add.successPublished')
            : t('add.successPending')}
        </Text>
        {result.duplicateWarning && result.duplicateWarning.length > 0 && (
          <View
            style={[
              styles.dupBox,
              { borderColor: theme.colors.warning, backgroundColor: theme.colors.surface },
            ]}
          >
            <Text style={{ color: theme.colors.warning, fontWeight: '600', marginBottom: 6 }}>
              {t('add.duplicateWarning')}
            </Text>
            {result.duplicateWarning.map((dup) => (
              <Text key={dup.id} style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                • {t('add.duplicateItem', { name: dup.name, distance: dup.distanceMeters })}
              </Text>
            ))}
          </View>
        )}
        <Pressable
          style={[styles.cta, { backgroundColor: theme.colors.primary, marginTop: 24 }]}
          onPress={resetForm}
        >
          <Text style={{ color: theme.colors.background, fontWeight: '700' }}>
            {t('add.addAnother')}
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('add.title')}</Text>

      {/* İlerleme */}
      <View style={styles.progressRow}>
        <View style={[styles.progressTrack, { backgroundColor: theme.colors.elevatedSurface }]}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%`, backgroundColor: theme.colors.primary },
            ]}
          />
        </View>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
          {t('add.progress', { percent: progress })}
        </Text>
      </View>

      {/* Adım göstergesi */}
      <View style={styles.stepsRow}>
        {STEPS.map((key, index) => (
          <Text
            key={key}
            style={{
              color: index === step ? theme.colors.primary : theme.colors.textSecondary,
              fontSize: 11,
              fontWeight: index === step ? '700' : '400',
            }}
          >
            {t(`add.steps.${key}`)}
          </Text>
        ))}
      </View>

      <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <View>
            <TextInput
              style={inputStyle}
              placeholder={t('add.namePlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={[...inputStyle, styles.multiline]}
              placeholder={t('add.descriptionPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <TextInput
              style={inputStyle}
              placeholder={t('add.cityPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              value={city}
              onChangeText={setCity}
            />
          </View>
        )}

        {step === 1 && (
          <View>
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
              {coords ? t('add.locationSelected') : t('add.locationHint')}
            </Text>
            <View style={styles.mapWrap}>
              <MapView
                style={styles.map}
                customMapStyle={darkMapStyle}
                initialRegion={{
                  latitude: 39,
                  longitude: 32,
                  latitudeDelta: 12,
                  longitudeDelta: 14,
                }}
                onPress={(event) => setCoords(event.nativeEvent.coordinate)}
              >
                {coords && <Marker coordinate={coords} pinColor={theme.colors.primary} />}
                {coords && precision === 'APPROXIMATE' && (
                  <Circle
                    center={coords}
                    radius={500}
                    strokeColor="rgba(120,192,67,0.8)"
                    fillColor="rgba(120,192,67,0.15)"
                  />
                )}
              </MapView>
            </View>
            <View style={[styles.chips, { marginTop: 12 }]}>
              {(['EXACT', 'APPROXIMATE'] as const).map((value) => (
                <Pressable
                  key={value}
                  style={chip(precision === value)}
                  onPress={() => setPrecision(value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: precision === value }}
                  accessibilityLabel={
                    value === 'EXACT' ? t('add.precisionExact') : t('add.precisionApprox')
                  }
                >
                  <Text style={chipText(precision === value)}>
                    {value === 'EXACT' ? t('add.precisionExact') : t('add.precisionApprox')}
                  </Text>
                </Pressable>
              ))}
            </View>
            {precision === 'APPROXIMATE' && (
              <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
                {t('add.precisionApproxNote')}
              </Text>
            )}

            {/* Anlık mükerrer uyarısı: kullanıcı formu boşuna doldurmasın */}
            {duplicateCandidates && duplicateCandidates.length > 0 && (
              <View style={[styles.duplicateBox, { borderColor: theme.colors.warning }]}>
                <Text style={{ color: theme.colors.warning, fontWeight: '600', fontSize: 12 }}>
                  {t('add.duplicateLive')}
                </Text>
                {duplicateCandidates.slice(0, 3).map((dup) => (
                  <Text
                    key={dup.id}
                    style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 4 }}
                  >
                    • {t('add.duplicateItem', { name: dup.name, distance: dup.distanceMeters })}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
              {t('add.activityHint')}
            </Text>
            <View style={styles.chips}>
              {(['CARAVAN', 'TENT', 'PICNIC', 'BARBECUE'] as ActivityCode[]).map((code) => (
                <Pressable
                  key={code}
                  style={chip(activities.includes(code))}
                  onPress={() => toggle(activities, setActivities, code)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: activities.includes(code) }}
                  accessibilityLabel={t(`activity.${code.toLowerCase()}`)}
                >
                  <MaterialCommunityIcons
                    name={ACTIVITY_ICONS[code]}
                    size={15}
                    color={
                      activities.includes(code)
                        ? theme.colors.background
                        : theme.colors.textSecondary
                    }
                  />
                  <Text style={chipText(activities.includes(code))}>
                    {t(`activity.${code.toLowerCase()}`)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
              {t('criteria.groups.fee')}
            </Text>
            <View style={styles.chips}>
              {(['UNKNOWN', 'FREE', 'PAID'] as const).map((value) => (
                <Pressable
                  key={value}
                  style={chip(feeType === value)}
                  onPress={() => setFeeType(value)}
                >
                  <Text style={chipText(feeType === value)}>
                    {value === 'UNKNOWN'
                      ? t('add.feeUnknown')
                      : value === 'FREE'
                        ? t('explore.free')
                        : t('explore.paid')}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
              {t('criteria.groups.amenity')}
            </Text>
            <View style={styles.chips}>
              {CRITERIA_CATALOG.filter((c) => c.group === 'amenity').map((def) => (
                <Pressable
                  key={def.id}
                  style={chip(amenities.includes(def.code))}
                  onPress={() => toggle(amenities, setAmenities, def.code)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: amenities.includes(def.code) }}
                  accessibilityLabel={t(def.labelKey)}
                >
                  <Text style={chipText(amenities.includes(def.code))}>{t(def.labelKey)}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
              {t('criteria.groups.tag')}
            </Text>
            <View style={styles.chips}>
              {CRITERIA_CATALOG.filter((c) => c.group === 'tag').map((def) => (
                <Pressable
                  key={def.id}
                  style={chip(tags.includes(def.code))}
                  onPress={() => toggle(tags, setTags, def.code)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: tags.includes(def.code) }}
                  accessibilityLabel={t(def.labelKey)}
                >
                  <Text style={chipText(tags.includes(def.code))}>{t(def.labelKey)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {step === 4 && (
          <View>
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <Text style={[styles.summaryName, { color: theme.colors.textPrimary }]}>{name}</Text>
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
                {[
                  city,
                  precision === 'EXACT' ? t('add.precisionExact') : t('add.precisionApprox'),
                  activities.map((c) => t(`activity.${c.toLowerCase()}`)).join(', '),
                  feeType === 'UNKNOWN'
                    ? null
                    : feeType === 'FREE'
                      ? t('explore.free')
                      : t('explore.paid'),
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {amenities.length > 0 && (
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12, marginTop: 6 }}>
                  {amenities.length} {t('criteria.groups.amenity').toLowerCase()} · {tags.length}{' '}
                  {t('criteria.groups.tag').toLowerCase()}
                </Text>
              )}
            </View>
            <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
              {t('add.photoNote')}
            </Text>
            {mutation.isError && (
              <Text style={{ color: theme.colors.danger, marginTop: 8 }}>{t('add.error')}</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* Alt gezinme */}
      <View style={styles.footer}>
        {step > 0 && (
          <Pressable
            style={[styles.navButton, { borderColor: theme.colors.border }]}
            onPress={() => setStep(step - 1)}
            accessibilityRole="button"
            accessibilityLabel={t('add.back')}
          >
            <Text style={{ color: theme.colors.textPrimary }}>{t('add.back')}</Text>
          </Pressable>
        )}
        <Pressable
          style={[
            styles.cta,
            {
              backgroundColor: stepValid ? theme.colors.primary : theme.colors.elevatedSurface,
              flex: 1,
            },
          ]}
          disabled={!stepValid || mutation.isPending}
          onPress={() => (step < STEPS.length - 1 ? setStep(step + 1) : mutation.mutate())}
          accessibilityRole="button"
          accessibilityState={{ disabled: !stepValid || mutation.isPending }}
          accessibilityLabel={step < STEPS.length - 1 ? t('add.next') : t('add.submit')}
        >
          {mutation.isPending ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Text
              style={{
                color: stepValid ? theme.colors.background : theme.colors.textSecondary,
                fontWeight: '700',
              }}
            >
              {step < STEPS.length - 1 ? t('add.next') : t('add.submit')}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56 },
  title: { fontSize: 28, fontWeight: '700', paddingHorizontal: 16 },
  gate: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  gateText: { fontSize: 15, lineHeight: 22, textAlign: 'center', marginTop: 16 },
  resultTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginTop: 16 },
  dupBox: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 16, alignSelf: 'stretch' },
  progressRow: { paddingHorizontal: 16, marginTop: 12, gap: 4 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
  },
  body: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 15,
    marginBottom: 12,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  hint: { fontSize: 13, marginBottom: 10 },
  duplicateBox: { borderWidth: 1, borderRadius: 12, padding: 12, marginTop: 12 },
  note: { fontSize: 12, lineHeight: 18, marginTop: 10 },
  mapWrap: { borderRadius: 16, overflow: 'hidden', height: 260 },
  map: { flex: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sectionLabel: { fontSize: 14, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  summaryCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  summaryName: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  footer: { flexDirection: 'row', gap: 10, padding: 16, paddingBottom: 28 },
  navButton: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  cta: { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
});
