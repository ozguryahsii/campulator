import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { searchApi } from '../api/search';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../theme/tokens';

export function SavedScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: savedSearches } = useQuery({
    queryKey: ['saved-searches'],
    queryFn: searchApi.savedSearches,
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => searchApi.deleteSavedSearch(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['saved-searches'] }),
  });

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.background }}
      contentContainerStyle={styles.container}
    >
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>{t('saved.title')}</Text>

      {/* Kayıtlı aramalar (docs/01 §18) */}
      {user && savedSearches && savedSearches.length > 0 && (
        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.cardTitle, { color: theme.colors.textPrimary }]}>
            {t('search.savedSearches')}
          </Text>
          {savedSearches.map((saved) => (
            <View key={saved.id} style={[styles.savedRow, { borderTopColor: theme.colors.border }]}>
              <Ionicons name="bookmark" size={16} color={theme.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.textPrimary, fontWeight: '600' }}>
                  {saved.name}
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                  {t('search.criteriaCount', { count: saved.criteria.length })}
                </Text>
              </View>
              <Pressable onPress={() => deleteMutation.mutate(saved.id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Koleksiyonlar Faz 7'de */}
      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <Text style={[styles.badge, { color: theme.colors.primary }]}>
          {t('common.comingSoon')}
        </Text>
        <Text style={[styles.placeholder, { color: theme.colors.textSecondary }]}>
          {t('saved.placeholder')}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingTop: 72 },
  title: { fontSize: 28, fontWeight: '700', marginBottom: 24 },
  card: { borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  badge: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 8,
    letterSpacing: 1,
  },
  placeholder: { fontSize: 15, lineHeight: 22 },
});
