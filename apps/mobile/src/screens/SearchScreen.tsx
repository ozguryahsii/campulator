import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { CRITERIA_BY_ID } from '@campulator/shared';
import type { PlaceListItem } from '../api/places';
import { usePlaces } from '../api/places';
import type { SmartMatchItem } from '../api/search';
import { searchApi } from '../api/search';
import { CriteriaChips } from '../components/CriteriaChips';
import { PlaceCard } from '../components/PlaceCard';
import { SmartMatchMap } from '../features/search/SmartMatchMap';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/tokens';

type Mode = 'standard' | 'smart';

export function SearchScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const openDetail = (place: PlaceListItem) =>
    navigation.navigate('PlaceDetail', { placeId: place.id, fallback: place });

  const [mode, setMode] = useState<Mode>('standard');
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [criteria, setCriteria] = useState<string[]>([]);
  const [smartResults, setSmartResults] = useState<SmartMatchItem[] | null>(null);
  const [saveName, setSaveName] = useState('');
  const [showSave, setShowSave] = useState(false);
  // Smart Match sonuçları liste ya da harita olarak gösterilir
  const [smartView, setSmartView] = useState<'list' | 'map'>('list');

  // Standart arama
  const { data: standardResult, isLoading: standardLoading } = usePlaces({
    search: submitted || undefined,
  });

  // Kayıtlı ve son aramalar (yalnızca girişli kullanıcı)
  const { data: savedSearches } = useQuery({
    queryKey: ['saved-searches'],
    queryFn: searchApi.savedSearches,
    enabled: !!user,
  });
  const { data: history } = useQuery({
    queryKey: ['search-history'],
    queryFn: searchApi.history,
    enabled: !!user,
  });

  const smartMutation = useMutation({
    mutationFn: () => searchApi.smartMatch({ criteria }),
    onSuccess: (response) => {
      setSmartResults(response.items);
      void queryClient.invalidateQueries({ queryKey: ['search-history'] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: () => searchApi.createSavedSearch({ name: saveName.trim(), criteria }),
    onSuccess: () => {
      setShowSave(false);
      setSaveName('');
      void queryClient.invalidateQueries({ queryKey: ['saved-searches'] });
    },
  });

  const runSaved = async (id: string) => {
    const response = await searchApi.runSavedSearch(id);
    const saved = savedSearches?.find((s) => s.id === id);
    if (saved) setCriteria(saved.criteria);
    setMode('smart');
    setSmartResults(response.items);
  };

  const toggleCriterion = (id: string) => {
    setCriteria((current) =>
      current.includes(id) ? current.filter((c) => c !== id) : [...current, id],
    );
    setSmartResults(null);
  };

  const criterionLabel = (id: string) => {
    const def = CRITERIA_BY_ID.get(id);
    return def ? t(def.labelKey) : id;
  };

  const tabStyle = (active: boolean) => [
    styles.tab,
    active && { backgroundColor: theme.colors.elevatedSurface },
  ];

  /** Smart Match sonuçları için liste/harita geçişi */
  const viewToggle = (
    <View style={[styles.viewToggle, { backgroundColor: theme.colors.surface }]}>
      {(['list', 'map'] as const).map((v) => (
        <Pressable
          key={v}
          style={[
            styles.viewToggleButton,
            smartView === v && { backgroundColor: theme.colors.elevatedSurface },
          ]}
          onPress={() => setSmartView(v)}
          accessibilityRole="button"
          accessibilityState={{ selected: smartView === v }}
          accessibilityLabel={v === 'list' ? t('explore.listView') : t('explore.mapView')}
        >
          <Ionicons
            name={v === 'list' ? 'list' : 'map'}
            size={15}
            color={smartView === v ? theme.colors.primary : theme.colors.textSecondary}
          />
        </Pressable>
      ))}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('search.title')}</Text>

      <View style={[styles.tabs, { backgroundColor: theme.colors.surface }]}>
        {(['standard', 'smart'] as const).map((m) => (
          <Pressable key={m} style={tabStyle(mode === m)} onPress={() => setMode(m)}>
            <Text
              style={{
                color: mode === m ? theme.colors.primary : theme.colors.textSecondary,
                fontWeight: '600',
                fontSize: 13,
              }}
            >
              {m === 'standard' ? t('search.standardTab') : t('search.smartTab')}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === 'standard' ? (
        <FlatList
          data={submitted ? (standardResult?.data.items ?? []) : []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListHeaderComponent={
            <View
              style={[
                styles.searchBox,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
              ]}
            >
              <Ionicons name="search" size={16} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary }]}
                placeholder={t('search.textPlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                value={text}
                onChangeText={setText}
                onSubmitEditing={() => setSubmitted(text)}
                returnKeyType="search"
              />
            </View>
          }
          ListEmptyComponent={
            submitted ? (
              standardLoading ? (
                <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 32 }} />
              ) : (
                <Text style={[styles.empty, { color: theme.colors.textSecondary }]}>
                  {t('search.noResults')}
                </Text>
              )
            ) : null
          }
          renderItem={({ item }) => <PlaceCard place={item} onPress={() => openDetail(item)} />}
        />
      ) : smartResults && smartView === 'map' ? (
        <View style={{ flex: 1 }}>
          <View style={styles.viewToggleBar}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
              {t('search.resultCount', { count: smartResults.length })}
            </Text>
            {viewToggle}
          </View>
          <SmartMatchMap items={smartResults} onOpenPlace={openDetail} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>
          {/* Kayıtlı ve son aramalar üstte (docs/05) */}
          {user && (savedSearches?.length || history?.length) ? (
            <View style={styles.savedBlock}>
              {savedSearches && savedSearches.length > 0 && (
                <>
                  <Text style={[styles.blockTitle, { color: theme.colors.textSecondary }]}>
                    {t('search.savedSearches')}
                  </Text>
                  <View style={styles.savedChips}>
                    {savedSearches.map((saved) => (
                      <Pressable
                        key={saved.id}
                        style={[
                          styles.savedChip,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.primary,
                          },
                        ]}
                        onPress={() => void runSaved(saved.id)}
                      >
                        <Ionicons name="bookmark" size={12} color={theme.colors.primary} />
                        <Text style={{ color: theme.colors.textPrimary, fontSize: 13 }}>
                          {saved.name}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
              {history && history.length > 0 && (
                <>
                  <Text style={[styles.blockTitle, { color: theme.colors.textSecondary }]}>
                    {t('search.recentSearches')}
                  </Text>
                  <View style={styles.savedChips}>
                    {history.slice(0, 5).map((entry) => (
                      <Pressable
                        key={entry.id}
                        style={[
                          styles.savedChip,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.border,
                          },
                        ]}
                        onPress={() => {
                          setCriteria(entry.criteria);
                          setSmartResults(null);
                        }}
                      >
                        <Ionicons name="time" size={12} color={theme.colors.textSecondary} />
                        <Text
                          style={{ color: theme.colors.textSecondary, fontSize: 13 }}
                          numberOfLines={1}
                        >
                          {entry.criteria.slice(0, 3).map(criterionLabel).join(', ')}
                          {entry.criteria.length > 3 ? '…' : ''}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              )}
            </View>
          ) : null}

          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
            {t('search.selectCriteria')}
          </Text>
          <CriteriaChips selected={criteria} onToggle={toggleCriterion} />

          <Pressable
            style={[
              styles.cta,
              {
                backgroundColor:
                  criteria.length > 0 ? theme.colors.primary : theme.colors.elevatedSurface,
              },
            ]}
            disabled={criteria.length === 0 || smartMutation.isPending}
            onPress={() => smartMutation.mutate()}
          >
            {smartMutation.isPending ? (
              <ActivityIndicator color={theme.colors.background} />
            ) : (
              <Text
                style={{
                  color: criteria.length > 0 ? theme.colors.background : theme.colors.textSecondary,
                  fontWeight: '700',
                  fontSize: 15,
                }}
              >
                {t('search.smartRun')} · {t('search.criteriaCount', { count: criteria.length })}
              </Text>
            )}
          </Pressable>

          {smartResults && (
            <View style={{ marginTop: 16 }}>
              <View style={styles.resultsHeader}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 13, flex: 1 }}>
                  {t('search.resultCount', { count: smartResults.length })}
                </Text>
                {viewToggle}
              </View>
              {user &&
                (showSave ? (
                  <View style={styles.saveRow}>
                    <TextInput
                      style={[
                        styles.saveInput,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.border,
                          color: theme.colors.textPrimary,
                        },
                      ]}
                      placeholder={t('search.searchName')}
                      placeholderTextColor={theme.colors.textSecondary}
                      value={saveName}
                      onChangeText={setSaveName}
                    />
                    <Pressable
                      style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                      disabled={!saveName.trim() || saveMutation.isPending}
                      onPress={() => saveMutation.mutate()}
                    >
                      <Ionicons name="checkmark" size={18} color={theme.colors.background} />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable style={styles.saveLink} onPress={() => setShowSave(true)}>
                    <Ionicons name="bookmark-outline" size={14} color={theme.colors.primary} />
                    <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
                      {t('search.saveSearch')}
                    </Text>
                  </Pressable>
                ))}

              {smartResults.map((item) => (
                <View key={item.place.id} style={styles.resultBlock}>
                  <View style={styles.matchRow}>
                    <View
                      style={[
                        styles.matchBadge,
                        {
                          backgroundColor:
                            item.matchPercentage >= 75
                              ? theme.colors.primary
                              : theme.colors.elevatedSurface,
                          borderColor: theme.colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color:
                            item.matchPercentage >= 75
                              ? theme.colors.background
                              : theme.colors.primary,
                          fontWeight: '700',
                          fontSize: 13,
                        }}
                      >
                        %{item.matchPercentage}
                      </Text>
                    </View>
                    {item.missingCriteria.length > 0 && (
                      <Text
                        style={[styles.missing, { color: theme.colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {t('search.missing')}: {item.missingCriteria.map(criterionLabel).join(', ')}
                      </Text>
                    )}
                  </View>
                  <PlaceCard place={item.place} onPress={() => openDetail(item.place)} />
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56 },
  title: { fontSize: 28, fontWeight: '700', paddingHorizontal: 16, marginBottom: 12 },
  tabs: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  listContent: { padding: 16, paddingBottom: 32 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  input: { flex: 1, fontSize: 14, padding: 0 },
  empty: { textAlign: 'center', marginTop: 32, fontSize: 14 },
  savedBlock: { marginBottom: 16 },
  blockTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 8,
  },
  savedChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    maxWidth: 240,
  },
  hint: { fontSize: 13, marginBottom: 12 },
  cta: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  saveInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  saveButton: {
    borderRadius: 10,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-end',
    marginBottom: 12,
  },
  resultsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  viewToggleBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  viewToggle: { flexDirection: 'row', borderRadius: 10, padding: 3, gap: 2 },
  viewToggleButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  resultBlock: { marginBottom: 16 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  matchBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  missing: { flex: 1, fontSize: 11 },
});
