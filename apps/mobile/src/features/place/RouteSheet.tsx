import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import * as Location from 'expo-location';
import React, { useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { RoutePreview } from '../../api/routes';
import { formatDistance, formatDuration, routesApi } from '../../api/routes';
import { useTheme } from '../../theme/tokens';

interface Props {
  placeId: string;
  visible: boolean;
  onClose: () => void;
}

/**
 * Rota önizleme sayfası (docs/01 §20): başlangıç kullanıcı konumu, hedef nokta,
 * mesafe + tahmini süre. Rota kaydetme / çok duraklı planlama sonraki fazda.
 */
export function RouteSheet({ placeId, visible, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const [mode, setMode] = useState<'DRIVE' | 'WALK'>('DRIVE');
  const [permissionDenied, setPermissionDenied] = useState(false);

  const mutation = useMutation({
    mutationFn: async (travelMode: 'DRIVE' | 'WALK'): Promise<RoutePreview | null> => {
      // Konum izni yalnızca rota istendiğinde sorulur (docs/01 §6)
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        return null;
      }
      setPermissionDenied(false);
      const position = await Location.getCurrentPositionAsync({});
      return routesApi.preview({
        origin: {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        },
        placeId,
        travelMode,
      });
    },
  });

  const route = mutation.data;
  const units = { hour: t('route.hourShort'), minute: t('route.minuteShort') };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.sheet,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <View style={styles.header}>
            <Text style={{ color: theme.colors.textPrimary, fontWeight: '700', fontSize: 16 }}>
              {t('route.title')}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.modes}>
            {(['DRIVE', 'WALK'] as const).map((value) => (
              <Pressable
                key={value}
                style={[
                  styles.modeChip,
                  {
                    backgroundColor:
                      mode === value ? theme.colors.primary : theme.colors.elevatedSurface,
                  },
                ]}
                onPress={() => {
                  setMode(value);
                  mutation.reset();
                }}
              >
                <Ionicons
                  name={value === 'DRIVE' ? 'car-outline' : 'walk-outline'}
                  size={15}
                  color={mode === value ? theme.colors.background : theme.colors.textSecondary}
                />
                <Text
                  style={{
                    color: mode === value ? theme.colors.background : theme.colors.textSecondary,
                    fontSize: 13,
                    fontWeight: '600',
                  }}
                >
                  {t(`route.mode.${value}`)}
                </Text>
              </Pressable>
            ))}
          </View>

          {!route && (
            <Pressable
              style={[styles.cta, { backgroundColor: theme.colors.primary }]}
              disabled={mutation.isPending}
              onPress={() => mutation.mutate(mode)}
            >
              {mutation.isPending ? (
                <ActivityIndicator color={theme.colors.background} />
              ) : (
                <Text style={{ color: theme.colors.background, fontWeight: '700' }}>
                  {t('route.calculate')}
                </Text>
              )}
            </Pressable>
          )}

          {permissionDenied && (
            <Text style={{ color: theme.colors.warning, fontSize: 13, marginTop: 12 }}>
              {t('route.permissionDenied')}
            </Text>
          )}
          {mutation.isError && (
            <Text style={{ color: theme.colors.danger, fontSize: 13, marginTop: 12 }}>
              {t('route.error')}
            </Text>
          )}

          {route && (
            <View style={{ marginTop: 16 }}>
              <View style={styles.statsRow}>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                    {formatDistance(route.distanceMeters, i18n.language)}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                    {t('route.distance')}
                  </Text>
                </View>
                <View style={styles.stat}>
                  <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                    {formatDuration(route.estimatedDurationSeconds, i18n.language, units)}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                    {t('route.duration')}
                  </Text>
                </View>
              </View>

              {route.destinationPrecision === 'APPROXIMATE' && (
                <Text style={{ color: theme.colors.warning, fontSize: 12, marginTop: 12 }}>
                  {t('route.approximateNote')}
                </Text>
              )}
              {route.provider !== 'GOOGLE' && (
                <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 8 }}>
                  {t('route.estimateNote')}
                </Text>
              )}

              <Pressable
                style={[styles.cta, { backgroundColor: theme.colors.primary, marginTop: 16 }]}
                onPress={() => void Linking.openURL(route.externalMapsUrl)}
              >
                <Ionicons name="map-outline" size={17} color={theme.colors.background} />
                <Text style={{ color: theme.colors.background, fontWeight: '700' }}>
                  {t('route.openInMaps')}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modes: { flexDirection: 'row', gap: 8 },
  modeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    marginTop: 16,
  },
  statsRow: { flexDirection: 'row', gap: 12 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '800' },
});
