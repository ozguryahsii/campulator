import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { businessesApi, isVerifiedOwner } from '../../api/businesses';
import { mediaUri } from '../../api/client';
import type { RatingInput, ReviewSort } from '../../api/reviews';
import { reviewsApi } from '../../api/reviews';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/tokens';

const SORTS: ReviewSort[] = ['newest', 'helpful', 'highest', 'lowest', 'with_photos'];
/** Yorum şikâyetinde kullanılan kategoriler (docs/01 §20) */
const REVIEW_REPORT_CATEGORIES = ['SPAM', 'ABUSE', 'FAKE_USER_OR_REVIEW', 'OTHER'] as const;
const CATEGORIES = ['cleanliness', 'safety', 'scenery', 'accessibility', 'valueForMoney'] as const;

function Stars({
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

export function ReviewsSection({ placeId }: { placeId: string }) {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const canContribute = !!user?.emailVerified;

  const [sort, setSort] = useState<ReviewSort>('newest');
  const [reviewText, setReviewText] = useState('');
  // Hangi yoruma yanıt yazılıyor ve yanıt metni
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  // Düzenlenen yorum ve şikâyet edilen yorum
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [reporting, setReporting] = useState<string | null>(null);
  // Faydalı işaretini geri alabilmek için yerel takip
  const [markedHelpful, setMarkedHelpful] = useState<Record<string, boolean>>({});
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingDraft, setRatingDraft] = useState<RatingInput>({
    cleanliness: 0,
    safety: 0,
    scenery: 0,
    accessibility: 0,
    valueForMoney: 0,
  });

  const { data: summary } = useQuery({
    queryKey: ['rating-summary', placeId],
    queryFn: () => reviewsApi.summary(placeId),
    retry: 0,
  });
  const { data: reviews, isLoading } = useQuery({
    queryKey: ['reviews', placeId, sort],
    queryFn: () => reviewsApi.list(placeId, sort),
    retry: 0,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['reviews', placeId] });
    void queryClient.invalidateQueries({ queryKey: ['rating-summary', placeId] });
    void queryClient.invalidateQueries({ queryKey: ['score-breakdown', placeId] });
    void queryClient.invalidateQueries({ queryKey: ['place', placeId] });
  };

  const rateMutation = useMutation({
    mutationFn: () => reviewsApi.rate(placeId, ratingDraft),
    onSuccess: () => {
      setRatingOpen(false);
      invalidate();
    },
  });
  const reviewMutation = useMutation({
    mutationFn: () => reviewsApi.create(placeId, { body: reviewText.trim() }),
    onSuccess: () => {
      setReviewText('');
      invalidate();
    },
  });
  // Doğrulanmış işletme sahibinin yanıtları otomatik "resmî" işaretlenir
  const { data: myBusinesses } = useQuery({
    queryKey: ['my-businesses'],
    queryFn: businessesApi.mine,
    enabled: !!user,
    retry: 0,
  });
  const officialResponder = isVerifiedOwner(myBusinesses, placeId);

  const replyMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => reviewsApi.reply(id, body),
    onSuccess: () => {
      setReplyTo(null);
      setReplyText('');
      invalidate();
    },
  });
  const editMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => reviewsApi.update(id, body),
    onSuccess: () => {
      setEditing(null);
      invalidate();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => reviewsApi.remove(id),
    onSuccess: invalidate,
  });
  const reportMutation = useMutation({
    mutationFn: ({ id, category }: { id: string; category: string }) =>
      reviewsApi.report(id, { category }),
    onSuccess: () => setReporting(null),
  });
  const reviewPhotoMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      const picked = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
      if (picked.canceled || !picked.assets[0]) return null;
      const asset = picked.assets[0];
      return reviewsApi.uploadReviewPhoto(reviewId, asset.uri, asset.mimeType ?? 'image/jpeg');
    },
    onSuccess: invalidate,
  });
  const deletePhotoMutation = useMutation({
    mutationFn: (photoId: string) => reviewsApi.deletePhoto(photoId),
    onSuccess: invalidate,
  });
  const helpfulMutation = useMutation({
    mutationFn: ({ id, on }: { id: string; on: boolean }) => reviewsApi.helpful(id, on),
    onSuccess: (_data, variables) => {
      setMarkedHelpful((current) => ({ ...current, [variables.id]: variables.on }));
      invalidate();
    },
  });
  const photoMutation = useMutation({
    mutationFn: async () => {
      const picked = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
      if (picked.canceled || !picked.assets[0]) return null;
      const asset = picked.assets[0];
      return reviewsApi.uploadPlacePhoto(placeId, asset.uri, asset.mimeType ?? 'image/jpeg');
    },
    onSuccess: invalidate,
  });

  const ratingValid = CATEGORIES.every((c) => ratingDraft[c] >= 1);

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {t('reviews.title')}
          {summary && summary.count > 0 ? ` (${summary.count})` : ''}
        </Text>
        {canContribute && (
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <Pressable
              onPress={() => photoMutation.mutate()}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('reviews.addPhoto')}
            >
              <Ionicons name="camera-outline" size={20} color={theme.colors.primary} />
            </Pressable>
            <Pressable
              onPress={() => setRatingOpen(true)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('reviews.rateTitle')}
            >
              <Ionicons name="star-outline" size={20} color={theme.colors.primary} />
            </Pressable>
          </View>
        )}
      </View>

      {summary && summary.count > 0 && (
        <View style={styles.summaryRow}>
          <Stars value={Math.round(summary.overall)} size={16} />
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
            {summary.overall.toFixed(1)} · {t('reviews.ratingCount', { count: summary.count })}
          </Text>
        </View>
      )}

      {/* Sıralama çipleri */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {SORTS.map((value) => (
            <Pressable
              key={value}
              onPress={() => setSort(value)}
              accessibilityRole="radio"
              accessibilityState={{ selected: sort === value }}
              accessibilityLabel={t(`reviews.sort.${value}`)}
              style={[
                styles.sortChip,
                {
                  backgroundColor:
                    sort === value ? theme.colors.primary : theme.colors.elevatedSurface,
                },
              ]}
            >
              <Text
                style={{
                  color: sort === value ? theme.colors.background : theme.colors.textSecondary,
                  fontSize: 11,
                  fontWeight: '600',
                }}
              >
                {t(`reviews.sort.${value}`)}
              </Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* Yorum yaz */}
      {canContribute && (
        <View style={styles.writeRow}>
          <TextInput
            style={[
              styles.writeInput,
              {
                backgroundColor: theme.colors.elevatedSurface,
                color: theme.colors.textPrimary,
              },
            ]}
            placeholder={t('reviews.writePlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={reviewText}
            onChangeText={setReviewText}
            multiline
          />
          <Pressable
            disabled={reviewText.trim().length < 5 || reviewMutation.isPending}
            onPress={() => reviewMutation.mutate()}
            accessibilityRole="button"
            accessibilityLabel={t('reviews.writePlaceholder')}
            style={[
              styles.sendButton,
              {
                backgroundColor:
                  reviewText.trim().length >= 5
                    ? theme.colors.primary
                    : theme.colors.elevatedSurface,
              },
            ]}
          >
            <Ionicons name="send" size={16} color={theme.colors.background} />
          </Pressable>
        </View>
      )}

      {/* Liste */}
      {isLoading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 16 }} />
      ) : reviews && reviews.items.length > 0 ? (
        reviews.items.map((review) => (
          <View key={review.id} style={[styles.review, { borderTopColor: theme.colors.border }]}>
            <View style={styles.reviewHeader}>
              <Pressable
                onPress={() =>
                  navigation.navigate('UserProfile', {
                    userId: review.user.id,
                    displayName: review.user.displayName,
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={review.user.displayName}
              >
                <Text style={{ color: theme.colors.textPrimary, fontWeight: '600', fontSize: 13 }}>
                  {review.user.displayName}
                </Text>
              </Pressable>
              {review.rating !== null && (
                <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '700' }}>
                  ★ {review.rating.toFixed(1)}
                </Text>
              )}
              <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                {new Date(review.createdAt).toLocaleDateString()}
              </Text>
            </View>
            {editing === review.id ? (
              <View style={styles.replyComposer}>
                <TextInput
                  style={[
                    styles.replyInput,
                    {
                      backgroundColor: theme.colors.elevatedSurface,
                      borderColor: theme.colors.border,
                      color: theme.colors.textPrimary,
                    },
                  ]}
                  value={editText}
                  onChangeText={setEditText}
                  multiline
                  autoFocus
                  accessibilityLabel={t('reviews.edit')}
                />
                <Pressable
                  style={[
                    styles.replySend,
                    {
                      backgroundColor:
                        editText.trim().length >= 5
                          ? theme.colors.primary
                          : theme.colors.elevatedSurface,
                    },
                  ]}
                  disabled={editText.trim().length < 5 || editMutation.isPending}
                  onPress={() => editMutation.mutate({ id: review.id, body: editText.trim() })}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.save')}
                >
                  <Ionicons name="checkmark" size={16} color={theme.colors.background} />
                </Pressable>
              </View>
            ) : (
              <Text style={{ color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19 }}>
                {review.body}
              </Text>
            )}

            {/* Yorum fotoğrafları */}
            {review.photos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
                {review.photos.map((photo) => (
                  <View key={photo.id} style={styles.photoWrapper}>
                    <Image
                      source={{ uri: mediaUri(photo.url) ?? '' }}
                      style={styles.photo}
                      accessibilityRole="image"
                    />
                    {review.isMine && (
                      <Pressable
                        style={[styles.photoRemove, { backgroundColor: theme.colors.background }]}
                        onPress={() => deletePhotoMutation.mutate(photo.id)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={t('common.delete')}
                      >
                        <Ionicons name="close" size={12} color={theme.colors.danger} />
                      </Pressable>
                    )}
                  </View>
                ))}
              </ScrollView>
            )}
            <View style={styles.actionRow}>
              <Pressable
                style={styles.helpfulRow}
                disabled={!user}
                onPress={() =>
                  helpfulMutation.mutate({ id: review.id, on: !markedHelpful[review.id] })
                }
                accessibilityRole="button"
                accessibilityState={{ selected: !!markedHelpful[review.id] }}
              >
                <Ionicons
                  name={markedHelpful[review.id] ? 'thumbs-up' : 'thumbs-up-outline'}
                  size={13}
                  color={theme.colors.primary}
                />
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                  {t('reviews.helpful')} ({review.helpfulCount})
                </Text>
              </Pressable>
              {canContribute && (
                <Pressable
                  style={styles.helpfulRow}
                  onPress={() => {
                    setReplyTo(replyTo === review.id ? null : review.id);
                    setReplyText('');
                  }}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="return-down-forward-outline"
                    size={13}
                    color={theme.colors.primary}
                  />
                  <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                    {officialResponder ? t('reviews.replyOfficial') : t('reviews.reply')}
                  </Text>
                </Pressable>
              )}
              {review.isMine ? (
                <>
                  <Pressable
                    style={styles.helpfulRow}
                    onPress={() => {
                      setEditing(editing === review.id ? null : review.id);
                      setEditText(review.body);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('reviews.edit')}
                  >
                    <Ionicons name="pencil-outline" size={13} color={theme.colors.primary} />
                  </Pressable>
                  <Pressable
                    style={styles.helpfulRow}
                    onPress={() => reviewPhotoMutation.mutate(review.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t('reviews.addPhoto')}
                  >
                    <Ionicons name="camera-outline" size={13} color={theme.colors.primary} />
                  </Pressable>
                  <Pressable
                    style={styles.helpfulRow}
                    onPress={() => deleteMutation.mutate(review.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t('common.delete')}
                  >
                    <Ionicons name="trash-outline" size={13} color={theme.colors.danger} />
                  </Pressable>
                </>
              ) : (
                canContribute && (
                  <Pressable
                    style={styles.helpfulRow}
                    onPress={() => setReporting(reporting === review.id ? null : review.id)}
                    accessibilityRole="button"
                    accessibilityLabel={t('reviews.report')}
                  >
                    <Ionicons name="flag-outline" size={13} color={theme.colors.textSecondary} />
                  </Pressable>
                )
              )}
            </View>

            {/* Yorum şikâyeti: kategori seçince gönderilir */}
            {reporting === review.id && (
              <View style={styles.reportRow}>
                {REVIEW_REPORT_CATEGORIES.map((value) => (
                  <Pressable
                    key={value}
                    style={[styles.reportChip, { borderColor: theme.colors.border }]}
                    onPress={() => reportMutation.mutate({ id: review.id, category: value })}
                    accessibilityRole="button"
                    accessibilityLabel={t(`contribute.categories.${value}`)}
                  >
                    <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
                      {t(`contribute.categories.${value}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
            {review.replies.map((reply) => (
              <View
                key={reply.id}
                style={[styles.reply, { borderLeftColor: theme.colors.primary }]}
              >
                <Text style={{ color: theme.colors.textPrimary, fontSize: 12, fontWeight: '600' }}>
                  {reply.user.displayName}
                  {reply.isOfficialResponse ? ` · ${t('reviews.official')}` : ''}
                </Text>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
                  {reply.body}
                </Text>
              </View>
            ))}

            {replyTo === review.id && (
              <View style={styles.replyComposer}>
                <TextInput
                  style={[
                    styles.replyInput,
                    {
                      backgroundColor: theme.colors.elevatedSurface,
                      borderColor: theme.colors.border,
                      color: theme.colors.textPrimary,
                    },
                  ]}
                  placeholder={
                    officialResponder
                      ? t('reviews.replyOfficialPlaceholder')
                      : t('reviews.replyPlaceholder')
                  }
                  placeholderTextColor={theme.colors.textSecondary}
                  value={replyText}
                  onChangeText={setReplyText}
                  multiline
                  autoFocus
                />
                <Pressable
                  style={[
                    styles.replySend,
                    {
                      backgroundColor:
                        replyText.trim().length >= 2
                          ? theme.colors.primary
                          : theme.colors.elevatedSurface,
                    },
                  ]}
                  disabled={replyText.trim().length < 2 || replyMutation.isPending}
                  onPress={() => replyMutation.mutate({ id: review.id, body: replyText.trim() })}
                  accessibilityRole="button"
                  accessibilityLabel={t('reviews.reply')}
                >
                  {replyMutation.isPending ? (
                    <ActivityIndicator color={theme.colors.background} size="small" />
                  ) : (
                    <Ionicons name="send" size={15} color={theme.colors.background} />
                  )}
                </Pressable>
              </View>
            )}
          </View>
        ))
      ) : (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 13, marginTop: 14 }}>
          {t('reviews.empty')}
        </Text>
      )}

      {/* Puan verme modalı */}
      <Modal visible={ratingOpen} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.title, { color: theme.colors.textPrimary, marginBottom: 12 }]}>
              {t('reviews.rateTitle')}
            </Text>
            {CATEGORIES.map((category) => (
              <View key={category} style={styles.ratingRow}>
                <Text style={{ color: theme.colors.textSecondary, flex: 1, fontSize: 13 }}>
                  {t(`reviews.categories.${category}`)}
                </Text>
                <Stars
                  value={ratingDraft[category]}
                  onChange={(v) => setRatingDraft({ ...ratingDraft, [category]: v })}
                />
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Pressable
                style={[styles.modalButton, { borderColor: theme.colors.border, borderWidth: 1 }]}
                onPress={() => setRatingOpen(false)}
                accessibilityRole="button"
              >
                <Text style={{ color: theme.colors.textPrimary }}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: ratingValid
                      ? theme.colors.primary
                      : theme.colors.elevatedSurface,
                    flex: 1,
                  },
                ]}
                disabled={!ratingValid || rateMutation.isPending}
                onPress={() => rateMutation.mutate()}
              >
                {rateMutation.isPending ? (
                  <ActivityIndicator color={theme.colors.background} />
                ) : (
                  <Text
                    style={{
                      color: ratingValid ? theme.colors.background : theme.colors.textSecondary,
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 15, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  sortChip: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  writeRow: { flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'flex-end' },
  writeInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    maxHeight: 90,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  review: { borderTopWidth: 1, marginTop: 14, paddingTop: 12 },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  helpfulRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  reply: { borderLeftWidth: 2, paddingLeft: 10, marginTop: 8 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  replyComposer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 10 },
  replyInput: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    minHeight: 40,
    maxHeight: 110,
  },
  photoRow: { marginTop: 8 },
  photoWrapper: { marginRight: 8 },
  photo: { width: 84, height: 84, borderRadius: 10 },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  reportChip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  replySend: {
    borderRadius: 10,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { borderRadius: 20, borderWidth: 1, padding: 20, alignSelf: 'stretch' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  modalButton: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
});
