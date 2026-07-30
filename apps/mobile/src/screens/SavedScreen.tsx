import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { collectionsApi } from '../api/collections';
import { DraggableList } from '../components/DraggableList';
import { searchApi } from '../api/search';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/tokens';

export function SavedScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  // Sürükleme sırasında dış ScrollView kilitlenir
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: collectionsApi.list,
    enabled: !!user,
  });
  const { data: savedSearches } = useQuery({
    queryKey: ['saved-searches'],
    queryFn: searchApi.savedSearches,
    enabled: !!user,
  });

  const invalidateCollections = () =>
    void queryClient.invalidateQueries({ queryKey: ['collections'] });

  const deleteCollection = useMutation({
    mutationFn: (id: string) => collectionsApi.remove(id),
    onSuccess: invalidateCollections,
  });
  const removeItem = useMutation({
    mutationFn: ({ id, placeId }: { id: string; placeId: string }) =>
      collectionsApi.removeItem(id, placeId),
    onSuccess: invalidateCollections,
  });
  // Sürükle-bırak ile sıralama (docs/01 §18)
  const reorder = useMutation({
    mutationFn: ({ id, placeIds }: { id: string; placeIds: string[] }) =>
      collectionsApi.reorder(id, placeIds),
    onSuccess: invalidateCollections,
  });
  const deleteSearch = useMutation({
    mutationFn: (id: string) => searchApi.deleteSavedSearch(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['saved-searches'] }),
  });

  const card = (children: React.ReactNode, key?: string) => (
    <View
      key={key}
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      {children}
    </View>
  );

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
      scrollEnabled={scrollEnabled}
    >
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('saved.title')}</Text>

      {!user ? (
        <View style={styles.gate}>
          <Ionicons name="bookmark-outline" size={44} color={theme.colors.textSecondary} />
          <Text style={{ color: theme.colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
            {t('collections.loginRequired')}
          </Text>
        </View>
      ) : (
        <>
          {/* Koleksiyonlar */}
          <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
            {t('collections.title')}
          </Text>
          {collections && collections.length > 0
            ? collections.map((collection) =>
                card(
                  <View>
                    <View style={styles.cardHeader}>
                      <Ionicons name="folder-open" size={18} color={theme.colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            color: theme.colors.textPrimary,
                            fontWeight: '700',
                            fontSize: 15,
                          }}
                        >
                          {collection.name}
                        </Text>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                          {t('collections.itemCount', { count: collection.items.length })}
                        </Text>
                      </View>
                      <Pressable onPress={() => deleteCollection.mutate(collection.id)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                      </Pressable>
                    </View>
                    <DraggableList
                      data={collection.items}
                      keyExtractor={(item) => item.placeId}
                      rowHeight={ROW_HEIGHT}
                      onDragStateChange={(dragging) => setScrollEnabled(!dragging)}
                      onReorder={(placeIds) => reorder.mutate({ id: collection.id, placeIds })}
                      renderItem={(item, _index, handle) => (
                        <View
                          style={[
                            styles.itemRow,
                            styles.draggableRow,
                            {
                              borderTopColor: theme.colors.border,
                              backgroundColor: theme.colors.surface,
                            },
                          ]}
                        >
                          <View
                            {...handle}
                            hitSlop={8}
                            accessibilityLabel={t('collections.dragHandle')}
                          >
                            <Ionicons name="reorder-three" size={20} color={theme.colors.border} />
                          </View>
                          <Pressable
                            style={{ flex: 1 }}
                            onPress={() =>
                              navigation.navigate('PlaceDetail', { placeId: item.placeId })
                            }
                          >
                            <Text
                              numberOfLines={1}
                              style={{ color: theme.colors.textPrimary, fontSize: 14 }}
                            >
                              {item.place.name}
                            </Text>
                            <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                              {[
                                item.place.city,
                                item.place.score
                                  ? `★ ${item.place.score.overall.toFixed(1)}`
                                  : null,
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </Text>
                          </Pressable>
                          <Pressable
                            onPress={() =>
                              removeItem.mutate({ id: collection.id, placeId: item.placeId })
                            }
                            hitSlop={8}
                          >
                            <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
                          </Pressable>
                        </View>
                      )}
                    />
                    {collection.items.length > 1 && (
                      <Text style={[styles.dragHint, { color: theme.colors.textSecondary }]}>
                        {t('collections.dragHint')}
                      </Text>
                    )}
                  </View>,
                  collection.id,
                ),
              )
            : card(
                <Text style={{ color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20 }}>
                  {t('collections.empty')}
                </Text>,
                'empty-collections',
              )}

          {/* Kayıtlı aramalar */}
          {savedSearches && savedSearches.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                {t('search.savedSearches')}
              </Text>
              {card(
                <View>
                  {savedSearches.map((saved) => (
                    <View
                      key={saved.id}
                      style={[styles.itemRow, { borderTopColor: theme.colors.border }]}
                    >
                      <Ionicons name="bookmark" size={16} color={theme.colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>
                          {saved.name}
                        </Text>
                        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                          {t('search.criteriaCount', { count: saved.criteria.length })}
                        </Text>
                      </View>
                      <Pressable onPress={() => deleteSearch.mutate(saved.id)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                      </Pressable>
                    </View>
                  ))}
                </View>,
                'saved-searches',
              )}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

/** DraggableList sabit satır yüksekliği ister */
const ROW_HEIGHT = 58;

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 72, paddingBottom: 48 },
  dragHint: { fontSize: 11, marginTop: 10, textAlign: 'center' },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 16 },
  gate: { alignItems: 'center', paddingVertical: 60 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 8,
  },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderTopWidth: 1,
    paddingVertical: 10,
    marginTop: 10,
  },
  // Sürüklenebilir satırlar sabit yükseklikte olmalı
  draggableRow: { height: ROW_HEIGHT, marginTop: 0, paddingVertical: 0 },
});
