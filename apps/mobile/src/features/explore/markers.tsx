import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { ActivityCode } from '../../api/places';
import { palette } from '../../theme/tokens';

export const ACTIVITY_ICONS: Record<ActivityCode, keyof typeof MaterialCommunityIcons.glyphMap> = {
  CARAVAN: 'caravan',
  TENT: 'tent',
  PICNIC: 'table-picnic',
  BARBECUE: 'grill',
};

interface PlaceMarkerViewProps {
  primaryActivity: ActivityCode | null;
  extraCount: number;
  dimmed?: boolean;
  selected?: boolean;
}

/**
 * Marker görseli (docs/01 §9): ana gövde her zaman Campulator yeşili,
 * öncelikli aktivite ikonu içeride, ek aktiviteler "+N" rozetiyle.
 */
export function PlaceMarkerView({
  primaryActivity,
  extraCount,
  dimmed,
  selected,
}: PlaceMarkerViewProps) {
  return (
    <View style={styles.wrapper}>
      <View style={[styles.pin, selected && styles.pinSelected, dimmed && styles.pinDimmed]}>
        <MaterialCommunityIcons
          name={primaryActivity ? ACTIVITY_ICONS[primaryActivity] : 'map-marker'}
          size={18}
          color={palette.background}
        />
      </View>
      {extraCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>+{extraCount}</Text>
        </View>
      )}
      <View style={[styles.tail, dimmed && styles.pinDimmed]} />
    </View>
  );
}

export function ClusterMarkerView({ count }: { count: number }) {
  return (
    <View style={styles.cluster}>
      <Text style={styles.clusterText}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  pin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.background,
  },
  pinSelected: {
    borderColor: palette.primaryBright,
    transform: [{ scale: 1.15 }],
  },
  pinDimmed: { opacity: 0.55 },
  tail: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: palette.primary,
    marginTop: -2,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: palette.elevatedSurface,
    borderRadius: 9,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: palette.primary,
  },
  badgeText: { color: palette.primaryBright, fontSize: 10, fontWeight: '700' },
  cluster: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(120,192,67,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: palette.primary,
  },
  clusterText: { color: palette.textPrimary, fontSize: 15, fontWeight: '700' },
});
