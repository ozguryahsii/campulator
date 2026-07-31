import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { RatingInput } from '../../api/reviews';
import { reviewsApi } from '../../api/reviews';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/tokens';

const CATEGORIES = ['cleanliness', 'safety', 'scenery', 'accessibility', 'valueForMoney'] as const;

export function Stars({
  value,
  onChange,
  size = 22,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          disabled={!onChange}
          onPress={() => onChange?.(star)}
          hitSlop={8}
          accessibilityRole={onChange ? 'radio' : 'image'}
          accessibilityState={{ selected: star <= value }}
          accessibilityLabel={`${star}`}
        >
          <Ionicons
            name={star <= value ? 'star' : 'star-outline'}
            size={size}
            color={star <= value ? theme.colors.primary : theme.colors.textSecondary}
          />
        </Pressable>
      ))}
    </View>
  );
}

/**
 * Puanlama, CampScore kutusunun altındaki belirgin bir butondan açılır.
 * Daha önce yorumlar başlığındaki yıldız ikonundaydı; ne yaptığı anlaşılmıyor
 * ve yorum yazmakla karışıyordu.
 */
export function RatingSheet({ placeId }: { placeId: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canContribute = !!user?.emailVerified;

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<RatingInput>({
    cleanliness: 0,
    safety: 0,
    scenery: 0,
    accessibility: 0,
    valueForMoney: 0,
  });

  const rate = useMutation({
    mutationFn: () => reviewsApi.rate(placeId, draft),
    onSuccess: () => {
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey: ['rating-summary', placeId] });
      void queryClient.invalidateQueries({ queryKey: ['score-breakdown', placeId] });
      void queryClient.invalidateQueries({ queryKey: ['place', placeId] });
      void queryClient.invalidateQueries({ queryKey: ['reviews', placeId] });
    },
  });

  const valid = CATEGORIES.every((category) => draft[category] >= 1);

  if (!canContribute) return null;

  return (
    <>
      <Pressable
        style={[styles.trigger, { backgroundColor: theme.colors.primary }]}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('reviews.rateTitle')}
      >
        <Ionicons name="star" size={16} color={theme.colors.background} />
        <Text style={[styles.triggerText, { color: theme.colors.background }]}>
          {t('reviews.rateAction')}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade">
        <View style={styles.overlay}>
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
              {t('reviews.rateTitle')}
            </Text>
            {CATEGORIES.map((category) => (
              <View key={category} style={styles.row}>
                <Text style={{ color: theme.colors.textSecondary, flex: 1, fontSize: 13 }}>
                  {t(`reviews.categories.${category}`)}
                </Text>
                <Stars
                  value={draft[category]}
                  onChange={(value) => setDraft({ ...draft, [category]: value })}
                />
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Pressable
                style={[styles.button, { borderColor: theme.colors.border, borderWidth: 1 }]}
                onPress={() => setOpen(false)}
                accessibilityRole="button"
              >
                <Text style={{ color: theme.colors.textPrimary }}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.button,
                  {
                    backgroundColor: valid ? theme.colors.primary : theme.colors.elevatedSurface,
                    flex: 1,
                  },
                ]}
                disabled={!valid || rate.isPending}
                onPress={() => rate.mutate()}
                accessibilityRole="button"
                accessibilityState={{ disabled: !valid }}
              >
                {rate.isPending ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <Text
                    style={{
                      color: valid ? theme.colors.background : theme.colors.textSecondary,
                      fontWeight: '700',
                    }}
                  >
                    {t('reviews.submitRating')}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 16,
  },
  triggerText: { fontSize: 14, fontWeight: '700' },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  card: { borderRadius: 20, borderWidth: 1, padding: 20 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
