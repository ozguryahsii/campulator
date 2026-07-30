import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CRITERIA_CATALOG, type CriterionGroup } from '@campulator/shared';
import { useTheme } from '../theme/tokens';

const GROUP_ORDER: CriterionGroup[] = ['activity', 'fee', 'amenity', 'tag', 'access', 'atmosphere'];

interface Props {
  selected: string[];
  onToggle: (id: string) => void;
}

/** Smart Match kriter seçimi: gruplu çip listesi. */
export function CriteriaChips({ selected, onToggle }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <View>
      {GROUP_ORDER.map((group) => {
        const items = CRITERIA_CATALOG.filter((c) => c.group === group);
        if (items.length === 0) return null;
        return (
          <View key={group} style={styles.group}>
            <Text style={[styles.groupTitle, { color: theme.colors.textSecondary }]}>
              {t(`criteria.groups.${group}`)}
            </Text>
            <View style={styles.chips}>
              {items.map((criterion) => {
                const active = selected.includes(criterion.id);
                return (
                  <Pressable
                    key={criterion.id}
                    onPress={() => onToggle(criterion.id)}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                        borderColor: active ? theme.colors.primary : theme.colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color: active ? theme.colors.background : theme.colors.textPrimary,
                        fontSize: 13,
                        fontWeight: active ? '700' : '400',
                      }}
                    >
                      {t(criterion.labelKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { marginBottom: 16 },
  groupTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
});
