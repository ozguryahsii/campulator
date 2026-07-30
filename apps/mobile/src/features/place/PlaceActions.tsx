import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { collectionsApi } from '../../api/collections';
import type { PlaceListItem } from '../../api/places';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuthStore } from '../../store/authStore';
import { useCompareStore } from '../../store/compareStore';
import { RouteSheet } from './RouteSheet';
import { useTheme } from '../../theme/tokens';

/** Detay aksiyonları: Kaydet (koleksiyon seçici) + Karşılaştır. Yol Tarifi Faz 8'de. */
export function PlaceActions({ place }: { place: PlaceListItem }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const compare = useCompareStore();
  const inCompare = compare.places.some((p) => p.id === place.id);

  const [saveOpen, setSaveOpen] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [newName, setNewName] = useState('');

  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.list,
    enabled: !!user && saveOpen,
  });
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['collections'] });

  const toggleMutation = useMutation({
    mutationFn: async ({ collectionId, has }: { collectionId: string; has: boolean }) =>
      has
        ? collectionsApi.removeItem(collectionId, place.id)
        : collectionsApi.addItem(collectionId, place.id),
    onSuccess: invalidate,
  });
  const createMutation = useMutation({
    mutationFn: async () => {
      const created = await collectionsApi.create(newName.trim());
      await collectionsApi.addItem(created.id, place.id);
    },
    onSuccess: () => {
      setNewName('');
      invalidate();
    },
  });

  const savedAnywhere = collections?.some((c) => c.items.some((i) => i.placeId === place.id));

  const button = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    onPress: (() => void) | null,
    active = false,
  ) => (
    <Pressable
      key={label}
      style={[
        styles.button,
        {
          backgroundColor: active ? theme.colors.primary : theme.colors.surface,
          borderColor: active ? theme.colors.primary : theme.colors.border,
          opacity: onPress ? 1 : 0.5,
        },
      ]}
      disabled={!onPress}
      onPress={onPress ?? undefined}
    >
      <Ionicons
        name={icon}
        size={18}
        color={active ? theme.colors.background : theme.colors.primary}
      />
      <Text
        style={{
          color: active ? theme.colors.background : theme.colors.textPrimary,
          fontSize: 12,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View>
      <View style={styles.row}>
        {button(
          savedAnywhere ? 'bookmark' : 'bookmark-outline',
          t('detail.save'),
          user ? () => setSaveOpen(true) : null,
          !!savedAnywhere,
        )}
        {button('navigate-outline', t('detail.directions'), () => setRouteOpen(true))}
        {button(
          inCompare ? 'git-compare' : 'git-compare-outline',
          t('detail.compare'),
          () => compare.toggle(place),
          inCompare,
        )}
      </View>
      {compare.places.length >= 2 && (
        <Pressable
          style={[styles.comparePill, { backgroundColor: theme.colors.primary }]}
          onPress={() => navigation.navigate('Compare')}
        >
          <Text style={{ color: theme.colors.background, fontWeight: '700' }}>
            {t('compare.open', { count: compare.places.length })}
          </Text>
        </Pressable>
      )}

      <RouteSheet placeId={place.id} visible={routeOpen} onClose={() => setRouteOpen(false)} />

      <Modal visible={saveOpen} transparent animationType="fade">
        <View style={styles.overlay}>
          <View
            style={[
              styles.modal,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <Text style={{ color: theme.colors.textPrimary, fontWeight: '700', fontSize: 15 }}>
              {t('collections.saveTo')}
            </Text>
            {collections?.map((collection) => {
              const has = collection.items.some((i) => i.placeId === place.id);
              return (
                <Pressable
                  key={collection.id}
                  style={[styles.collectionRow, { borderTopColor: theme.colors.border }]}
                  onPress={() => toggleMutation.mutate({ collectionId: collection.id, has })}
                >
                  <Ionicons
                    name={has ? 'checkbox' : 'square-outline'}
                    size={18}
                    color={has ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  <Text style={{ color: theme.colors.textPrimary, flex: 1 }}>
                    {collection.name}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                    {collection.items.length}
                  </Text>
                </Pressable>
              );
            })}
            <View style={styles.newRow}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: theme.colors.elevatedSurface,
                    color: theme.colors.textPrimary,
                  },
                ]}
                placeholder={t('collections.newPlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                value={newName}
                onChangeText={setNewName}
              />
              <Pressable
                style={[
                  styles.addButton,
                  {
                    backgroundColor: newName.trim()
                      ? theme.colors.primary
                      : theme.colors.elevatedSurface,
                  },
                ]}
                disabled={!newName.trim() || createMutation.isPending}
                onPress={() => createMutation.mutate()}
              >
                <Ionicons name="add" size={18} color={theme.colors.background} />
              </Pressable>
            </View>
            <Pressable style={styles.close} onPress={() => setSaveOpen(false)}>
              <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                {t('common.done')}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, marginTop: 20 },
  button: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
  },
  comparePill: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginTop: 12,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modal: { borderRadius: 20, borderWidth: 1, padding: 20, alignSelf: 'stretch' },
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    paddingVertical: 12,
    marginTop: 8,
  },
  newRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  input: { flex: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14 },
  addButton: { borderRadius: 10, width: 40, alignItems: 'center', justifyContent: 'center' },
  close: { alignSelf: 'center', marginTop: 16 },
});
