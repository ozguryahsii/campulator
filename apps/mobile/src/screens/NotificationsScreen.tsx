import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { notificationsApi } from '../api/notifications';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useTheme } from '../theme/tokens';

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  PLACE_APPROVED: 'checkmark-circle',
  PLACE_REJECTED: 'close-circle',
  REVIEW_REPLY: 'chatbubble-ellipses',
  REVIEW_HELPFUL: 'thumbs-up',
  CHANGE_REQUEST_RESOLVED: 'create',
  TRUST_LEVEL_UP: 'trophy',
  SYSTEM: 'information-circle',
};

/** Bildirim merkezi (docs/01 §22): in-app liste + tercihler + deep link */
export function NotificationsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationsApi.list,
    retry: 0,
  });
  const { data: preferences } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: notificationsApi.preferences,
    retry: 0,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    void queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
  };

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: invalidate,
  });
  const markAllRead = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: invalidate,
  });
  const updatePrefs = useMutation({
    mutationFn: (body: { pushEnabled?: boolean }) => notificationsApi.updatePreferences(body),
    onSuccess: invalidate,
  });

  // Deep link: bildirim payload'ındaki placeId varsa nokta detayına git
  const open = (id: string, payload: Record<string, unknown> | null) => {
    markRead.mutate(id);
    const placeId = typeof payload?.placeId === 'string' ? payload.placeId : null;
    if (placeId) navigation.navigate('PlaceDetail', { placeId });
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {t('notifications.title')}
          {data && data.unreadCount > 0 ? ` (${data.unreadCount})` : ''}
        </Text>
        <Pressable onPress={() => markAllRead.mutate()} hitSlop={8}>
          <Text style={{ color: theme.colors.primary, fontSize: 13 }}>
            {t('notifications.markAllRead')}
          </Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        {/* Tercihler */}
        <View
          style={[
            styles.card,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <View style={styles.prefRow}>
            <Ionicons name="notifications-outline" size={18} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.textPrimary, flex: 1, fontSize: 14 }}>
              {t('notifications.pushEnabled')}
            </Text>
            <Switch
              value={preferences?.pushEnabled ?? true}
              onValueChange={(value) => updatePrefs.mutate({ pushEnabled: value })}
              trackColor={{ true: theme.colors.primary }}
            />
          </View>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 6 }}>
            {t('notifications.emailSoon')}
          </Text>
        </View>

        {/* Liste */}
        {data && data.items.length > 0 ? (
          data.items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => open(item.id, item.payload)}
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: item.readAt ? theme.colors.border : theme.colors.primary,
                },
              ]}
            >
              <View style={styles.notifRow}>
                <Ionicons
                  name={TYPE_ICONS[item.type] ?? 'information-circle'}
                  size={20}
                  color={item.readAt ? theme.colors.textSecondary : theme.colors.primary}
                />
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      color: theme.colors.textPrimary,
                      fontWeight: item.readAt ? '400' : '700',
                      fontSize: 14,
                    }}
                  >
                    {t(item.titleKey, { defaultValue: t('notifications.fallbackTitle') })}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                    {t(item.bodyKey, { defaultValue: '' })}
                  </Text>
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 11, marginTop: 4 }}>
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))
        ) : (
          <View style={styles.empty}>
            <Ionicons
              name="notifications-off-outline"
              size={40}
              color={theme.colors.textSecondary}
            />
            <Text style={{ color: theme.colors.textSecondary, marginTop: 12 }}>
              {t('notifications.empty')}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '700' },
  body: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  prefRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  notifRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  empty: { alignItems: 'center', paddingVertical: 60 },
});
