import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { businessesApi, hasPendingClaim, isVerifiedOwner } from '../../api/businesses';
import { ApiError } from '../../api/client';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/tokens';

/**
 * Nokta detayında işletme sahipliği talebi (docs/01 §17). Talep admin
 * panelinden manuel doğrulanır; onaylanınca kullanıcı bu noktadaki
 * yorumlara resmî yanıt yazabilir.
 */
export function BusinessClaim({ placeId, placeName }: { placeId: string; placeName: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState(placeName);
  const [evidence, setEvidence] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { data: businesses } = useQuery({
    queryKey: ['my-businesses'],
    queryFn: businessesApi.mine,
    enabled: !!user,
    retry: 0,
  });

  const claim = useMutation({
    mutationFn: () =>
      businessesApi.claim({ placeId, name: name.trim(), evidence: evidence.trim() }),
    onSuccess: () => {
      setOpen(false);
      setEvidence('');
      void queryClient.invalidateQueries({ queryKey: ['my-businesses'] });
    },
    onError: (err) => {
      const code = err instanceof ApiError ? err.code : 'generic';
      setError(t([`business.errors.${code}`, 'business.errors.generic']));
    },
  });

  if (!user?.emailVerified) return null;

  const verified = isVerifiedOwner(businesses, placeId);
  const pending = hasPendingClaim(businesses, placeId);

  const box = (icon: 'checkmark-circle' | 'time-outline', color: string, label: string) => (
    <View style={[styles.status, { borderColor: theme.colors.border }]}>
      <Ionicons name={icon} size={16} color={color} />
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, flex: 1 }}>{label}</Text>
    </View>
  );

  if (verified) return box('checkmark-circle', theme.colors.primary, t('business.verifiedOwner'));
  if (pending) return box('time-outline', theme.colors.warning, t('business.claimPending'));

  if (!open) {
    return (
      <Pressable style={styles.link} onPress={() => setOpen(true)} accessibilityRole="button">
        <Ionicons name="briefcase-outline" size={14} color={theme.colors.textSecondary} />
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
          {t('business.claimCta')}
        </Text>
      </Pressable>
    );
  }

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.elevatedSurface,
      borderColor: theme.colors.border,
      color: theme.colors.textPrimary,
    },
  ];
  const canSubmit = name.trim().length >= 2 && evidence.trim().length >= 10;

  return (
    <View style={[styles.form, { borderColor: theme.colors.border }]}>
      <Text style={{ color: theme.colors.textPrimary, fontWeight: '700', fontSize: 14 }}>
        {t('business.claimTitle')}
      </Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
        {t('business.claimHint')}
      </Text>
      <TextInput
        style={inputStyle}
        placeholder={t('business.namePlaceholder')}
        placeholderTextColor={theme.colors.textSecondary}
        value={name}
        onChangeText={setName}
      />
      <TextInput
        style={[...inputStyle, styles.multiline]}
        placeholder={t('business.evidencePlaceholder')}
        placeholderTextColor={theme.colors.textSecondary}
        value={evidence}
        onChangeText={setEvidence}
        multiline
      />
      {error && <Text style={{ color: theme.colors.danger, fontSize: 12 }}>{error}</Text>}
      <View style={styles.buttonRow}>
        <Pressable style={styles.cancel} onPress={() => setOpen(false)} accessibilityRole="button">
          <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>
            {t('common.cancel')}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.submit,
            { backgroundColor: canSubmit ? theme.colors.primary : theme.colors.elevatedSurface },
          ]}
          disabled={!canSubmit || claim.isPending}
          onPress={() => {
            setError(null);
            claim.mutate();
          }}
          accessibilityRole="button"
        >
          {claim.isPending ? (
            <ActivityIndicator color={theme.colors.background} size="small" />
          ) : (
            <Text
              style={{
                color: canSubmit ? theme.colors.background : theme.colors.textSecondary,
                fontWeight: '700',
              }}
            >
              {t('business.claimSubmit')}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingVertical: 12,
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
  },
  form: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 12, gap: 10 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  multiline: { minHeight: 76, textAlignVertical: 'top' },
  buttonRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', alignItems: 'center' },
  cancel: { paddingHorizontal: 14, paddingVertical: 10 },
  submit: {
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 90,
    alignItems: 'center',
  },
});
