import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CRITERIA_CATALOG } from '@campulator/shared';
import type { ActivityCode, PlaceFilters } from '../api/places';
import { usePlaces } from '../api/places';
import { useTheme } from '../theme/tokens';

interface Props {
  visible: boolean;
  initial: PlaceFilters;
  onClose: () => void;
  onApply: (filters: PlaceFilters) => void;
}

const RATING_STEPS = [0, 3, 3.5, 4, 4.5];

/**
 * Gelişmiş filtre paneli (docs/01 §8): gruplu kartlar, canlı sonuç sayısıyla
 * "Sonuçları Göster" butonu ve Sıfırla.
 */
export function FiltersModal({ visible, initial, onClose, onApply }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  const [feeType, setFeeType] = useState(initial.feeType);
  const [activities, setActivities] = useState<ActivityCode[]>(initial.activities ?? []);
  const [amenities, setAmenities] = useState<string[]>(initial.amenities ?? []);
  const [tags, setTags] = useState<string[]>(initial.tags ?? []);
  const [minRating, setMinRating] = useState(initial.minRating ?? 0);
  const [includeClosed, setIncludeClosed] = useState(initial.includePermanentlyClosed ?? false);

  const pending: PlaceFilters = {
    search: initial.search,
    feeType,
    activities: activities.length ? activities : undefined,
    amenities: amenities.length ? amenities : undefined,
    tags: tags.length ? tags : undefined,
    minRating: minRating || undefined,
    includePermanentlyClosed: includeClosed || undefined,
  };

  // Canlı sonuç sayısı
  const { data: preview } = usePlaces(pending);
  const count = preview?.data.total;

  const toggle = <T,>(list: T[], set: (v: T[]) => void, value: T) =>
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const reset = () => {
    setFeeType(undefined);
    setActivities([]);
    setAmenities([]);
    setTags([]);
    setMinRating(0);
    setIncludeClosed(false);
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

  const section = (titleKey: string, children: React.ReactNode) => (
    <View
      style={[
        styles.section,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>{t(titleKey)}</Text>
      {children}
    </View>
  );

  const amenityDefs = CRITERIA_CATALOG.filter((c) => c.group === 'amenity');
  const tagDefs = CRITERIA_CATALOG.filter((c) => c.group === 'tag');

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color={theme.colors.textPrimary} />
          </Pressable>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            {t('filters.title')}
          </Text>
          <Pressable onPress={reset} style={styles.headerButton}>
            <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
              {t('filters.reset')}
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {section(
            'filters.accessFees',
            <View style={styles.chips}>
              {([undefined, 'FREE', 'PAID'] as const).map((value) => (
                <Pressable
                  key={String(value)}
                  style={chip(feeType === value)}
                  onPress={() => setFeeType(value)}
                >
                  <Text style={chipText(feeType === value)}>
                    {value === undefined
                      ? t('filters.all')
                      : value === 'FREE'
                        ? t('explore.free')
                        : t('explore.paid')}
                  </Text>
                </Pressable>
              ))}
            </View>,
          )}

          {section(
            'criteria.groups.activity',
            <View style={styles.chips}>
              {(['CARAVAN', 'TENT', 'PICNIC', 'BARBECUE'] as ActivityCode[]).map((code) => (
                <Pressable
                  key={code}
                  style={chip(activities.includes(code))}
                  onPress={() => toggle(activities, setActivities, code)}
                >
                  <Text style={chipText(activities.includes(code))}>
                    {t(`activity.${code.toLowerCase()}`)}
                  </Text>
                </Pressable>
              ))}
            </View>,
          )}

          {section(
            'criteria.groups.amenity',
            <View style={styles.chips}>
              {amenityDefs.map((def) => (
                <Pressable
                  key={def.id}
                  style={chip(amenities.includes(def.code))}
                  onPress={() => toggle(amenities, setAmenities, def.code)}
                >
                  <Text style={chipText(amenities.includes(def.code))}>{t(def.labelKey)}</Text>
                </Pressable>
              ))}
            </View>,
          )}

          {section(
            'criteria.groups.tag',
            <View style={styles.chips}>
              {tagDefs.map((def) => (
                <Pressable
                  key={def.id}
                  style={chip(tags.includes(def.code))}
                  onPress={() => toggle(tags, setTags, def.code)}
                >
                  <Text style={chipText(tags.includes(def.code))}>{t(def.labelKey)}</Text>
                </Pressable>
              ))}
            </View>,
          )}

          {section(
            'filters.minRating',
            <View style={styles.chips}>
              {RATING_STEPS.map((value) => (
                <Pressable
                  key={value}
                  style={chip(minRating === value)}
                  onPress={() => setMinRating(value)}
                >
                  <Text style={chipText(minRating === value)}>
                    {value === 0
                      ? t('filters.minRatingAny')
                      : t('filters.minRatingValue', { value: value.toFixed(1) })}
                  </Text>
                </Pressable>
              ))}
            </View>,
          )}

          {section(
            'filters.operatingStatus',
            <View style={styles.switchRow}>
              <Text style={{ color: theme.colors.textPrimary, flex: 1, fontSize: 14 }}>
                {t('filters.includeClosed')}
              </Text>
              <Switch
                value={includeClosed}
                onValueChange={setIncludeClosed}
                trackColor={{ true: theme.colors.primary }}
              />
            </View>,
          )}
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            style={[styles.cta, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              onApply(pending);
              onClose();
            }}
          >
            <Ionicons name="search" size={18} color={theme.colors.background} />
            <Text style={[styles.ctaText, { color: theme.colors.background }]}>
              {t('filters.showResults')}
              {count !== undefined ? ` · ${t('explore.resultCount', { count })}` : ''}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerButton: { padding: 8, minWidth: 60, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 32 },
  section: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center' },
  footer: { padding: 16, paddingBottom: 32 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 16,
  },
  ctaText: { fontSize: 16, fontWeight: '700' },
});
