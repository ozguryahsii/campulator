import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { collectionsApi } from '../api/collections';
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
  // Sürükle-bırak yerine yukarı taşıma ile sıralama (docs/01 §18)
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
                    {collection.items.map((item, index) => (
                      <View
                        key={item.placeId}
                        style={[styles.itemRow, { borderTopColor: theme.colors.border }]}
                      >
                        <Pressable
                          disabled={index === 0}
                          onPress={() => {
                            const ids = collection.items.map((i) => i.placeId);
                            [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
                            reorder.mutate({ id: collection.id, placeIds: ids });
                          }}
                          hitSlop={6}
                        >
                          <Ionicons
                            name="chevron-up"
                            size={16}
                            color={index === 0 ? theme.colors.border : theme.colors.textSecondary}
                          />
                        </Pressable>
                        <Pressable
                          style={{ flex: 1 }}
                          onPress={() =>
                            navigation.navigate('PlaceDetail', { placeId: item.placeId })
                          }
                        >
                          <Text style={{ color: theme.colors.textPrimary, fontSize: 14 }}>
                            {item.place.name}
                          </Text>
                          <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                            {[
                              item.place.city,
                              item.place.score ? `★ ${item.place.score.overall.toFixed(1)}` : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() =>
                            removeItem.mutate({ id: collection.id, placeId: item.placeId })
                          }
                          hitSlop={6}
                        >
                          <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
                        </Pressable>
                      </View>
                    ))}
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

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 72, paddingBottom: 48 },
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
});
