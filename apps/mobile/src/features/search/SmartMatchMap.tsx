import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, Region } from 'react-native-maps';
import { useTranslation } from 'react-i18next';
import type { PlaceListItem } from '../../api/places';
import type { SmartMatchItem } from '../../api/search';
import { PlaceCard } from '../../components/PlaceCard';
import { useTheme } from '../../theme/tokens';
import { palette } from '../../theme/tokens';
import { darkMapStyle } from '../explore/mapStyle';

const FALLBACK_REGION: Region = {
  latitude: 39.0,
  longitude: 32.0,
  latitudeDelta: 12,
  longitudeDelta: 14,
};

interface Props {
  items: SmartMatchItem[];
  onOpenPlace: (place: PlaceListItem) => void;
}

/** Eşleşme yüzdesini gösteren marker (docs/05 §Smart Match) */
function MatchMarkerView({ percentage, selected }: { percentage: number; selected: boolean }) {
  const strong = percentage >= 75;
  return (
    <View style={styles.markerWrapper}>
      <View
        style={[
          styles.markerPin,
          strong ? styles.markerStrong : styles.markerWeak,
          selected && styles.markerSelected,
        ]}
      >
        <Text style={[styles.markerText, { color: strong ? palette.background : palette.primary }]}>
          %{percentage}
        </Text>
      </View>
      <View style={[styles.markerTail, strong ? styles.tailStrong : styles.tailWeak]} />
    </View>
  );
}

/**
 * Smart Match sonuçlarının harita görünümü. Sonuçlar geldiğinde harita
 * tüm noktaları kapsayacak şekilde otomatik yakınlaşır; markera dokununca
 * alt tarafta o noktanın kartı belirir.
 */
export function SmartMatchMap({ items, onOpenPlace }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const mapRef = useRef<MapView>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = items.find((i) => i.place.id === selectedId) ?? null;

  // Sonuç kümesi değiştikçe haritayı tüm noktalara sığdır
  useEffect(() => {
    setSelectedId(null);
    if (items.length === 0) return;
    const coordinates = items.map((i) => ({
      latitude: i.place.latitude,
      longitude: i.place.longitude,
    }));
    // Harita yerleşimi tamamlanmadan fit çağrısı yok sayılabiliyor
    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 80, right: 60, bottom: 220, left: 60 },
        animated: true,
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [items]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={FALLBACK_REGION}
        customMapStyle={darkMapStyle}
        toolbarEnabled={false}
        onPress={() => setSelectedId(null)}
      >
        {items.map((item) => (
          <Marker
            key={item.place.id}
            coordinate={{ latitude: item.place.latitude, longitude: item.place.longitude }}
            onPress={() => setSelectedId(item.place.id)}
            zIndex={item.place.id === selectedId ? 2 : 1}
          >
            <MatchMarkerView
              percentage={item.matchPercentage}
              selected={item.place.id === selectedId}
            />
          </Marker>
        ))}
        {/* Yaklaşık konumlu seçili nokta için gösterim dairesi */}
        {selected?.place.locationPrecision === 'APPROXIMATE' && (
          <Circle
            center={{
              latitude: selected.place.latitude,
              longitude: selected.place.longitude,
            }}
            radius={selected.place.approximateRadiusMeters ?? 500}
            strokeColor="rgba(120,192,67,0.8)"
            fillColor="rgba(120,192,67,0.15)"
          />
        )}
      </MapView>

      {selected && (
        <View style={styles.cardHolder}>
          {selected.missingCriteria.length > 0 && (
            <Text
              style={[
                styles.missing,
                { color: theme.colors.textSecondary, backgroundColor: theme.colors.surface },
              ]}
              numberOfLines={1}
            >
              {t('search.missing')}: {selected.missingCriteria.length}
            </Text>
          )}
          <PlaceCard place={selected.place} onPress={() => onOpenPlace(selected.place)} />
        </View>
      )}

      {items.length === 0 && (
        <View style={styles.emptyOverlay} pointerEvents="none">
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {t('search.noResults')}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  markerWrapper: { alignItems: 'center' },
  markerPin: {
    borderRadius: 999,
    borderWidth: 1.5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    minWidth: 46,
    alignItems: 'center',
  },
  markerStrong: { backgroundColor: palette.primary, borderColor: palette.primary },
  markerWeak: { backgroundColor: palette.elevatedSurface, borderColor: palette.primary },
  markerSelected: { transform: [{ scale: 1.15 }] },
  markerText: { fontWeight: '800', fontSize: 12 },
  markerTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  tailStrong: { borderTopColor: palette.primary },
  tailWeak: { borderTopColor: palette.elevatedSurface },
  cardHolder: { position: 'absolute', left: 16, right: 16, bottom: 20, gap: 6 },
  missing: {
    fontSize: 11,
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { fontSize: 14 },
});
