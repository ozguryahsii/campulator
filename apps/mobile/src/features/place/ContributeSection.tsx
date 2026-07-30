import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ChangeRequestType, ReportCategory } from '../../api/contributions';
import { CHANGE_REQUEST_TYPES, contributionsApi, REPORT_CATEGORIES } from '../../api/contributions';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/tokens';

type Panel = 'change' | 'report' | null;

/**
 * Topluluk katkı araçları (docs/01 §13, §20, §21):
 * - Bilgileri doğrula / kapalı bildir (tek dokunuş)
 * - Düzeltme öner (moderasyon onayına düşer)
 * - Şikâyet et
 */
export function ContributeSection({ placeId }: { placeId: string }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [panel, setPanel] = useState<Panel>(null);
  const [changeType, setChangeType] = useState<ChangeRequestType>('AMENITY');
  const [note, setNote] = useState('');
  const [category, setCategory] = useState<ReportCategory>('INCORRECT_INFO');
  const [description, setDescription] = useState('');
  const [sent, setSent] = useState<Panel | 'verified'>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['place', placeId] });
    void queryClient.invalidateQueries({ queryKey: ['score-breakdown', placeId] });
  };

  const verify = useMutation({
    mutationFn: (verdict: 'CONFIRMED' | 'CLOSED_REPORTED') =>
      contributionsApi.verify(placeId, verdict),
    onSuccess: () => {
      setSent('verified');
      invalidate();
    },
  });

  const changeRequest = useMutation({
    mutationFn: () =>
      contributionsApi.changeRequest(placeId, { type: changeType, note: note.trim() }),
    onSuccess: () => {
      setPanel(null);
      setNote('');
      setSent('change');
    },
  });

  const report = useMutation({
    mutationFn: () =>
      contributionsApi.report(placeId, {
        category,
        description: description.trim() || undefined,
      }),
    onSuccess: () => {
      setPanel(null);
      setDescription('');
      setSent('report');
    },
  });

  // Katkı için doğrulanmış hesap gerekir (docs/01 §13)
  if (!user?.emailVerified) {
    return (
      <View
        style={[
          styles.card,
          { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {t('contribute.title')}
        </Text>
        <Text style={{ color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
          {user ? t('contribute.verifyRequired') : t('contribute.loginRequired')}
        </Text>
      </View>
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

  const chip = (active: boolean) => [
    styles.chip,
    {
      backgroundColor: active ? theme.colors.primary : theme.colors.elevatedSurface,
      borderColor: active ? theme.colors.primary : theme.colors.border,
    },
  ];
  const chipText = (active: boolean) => ({
    color: active ? theme.colors.background : theme.colors.textPrimary,
    fontSize: 12,
    fontWeight: active ? ('700' as const) : ('400' as const),
  });

  const action = (
    icon: keyof typeof Ionicons.glyphMap,
    label: string,
    onPress: () => void,
    color = theme.colors.primary,
  ) => (
    <Pressable
      style={[styles.action, { borderColor: theme.colors.border }]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={16} color={color} />
      <Text style={{ color: theme.colors.textPrimary, fontSize: 12, flex: 1 }}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={theme.colors.textSecondary} />
    </Pressable>
  );

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        {t('contribute.title')}
      </Text>
      <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
        {t('contribute.hint')}
      </Text>

      {sent && (
        <View style={styles.sentRow}>
          <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
          <Text style={{ color: theme.colors.primary, fontSize: 12, flex: 1 }}>
            {t(`contribute.sent.${sent}`)}
          </Text>
        </View>
      )}

      {panel === null && (
        <View style={styles.actions}>
          {action('checkmark-done-outline', t('contribute.confirm'), () =>
            verify.mutate('CONFIRMED'),
          )}
          {action('create-outline', t('contribute.suggestEdit'), () => {
            setSent(null);
            setPanel('change');
          })}
          {action('close-circle-outline', t('contribute.reportClosed'), () =>
            verify.mutate('CLOSED_REPORTED'),
          )}
          {action(
            'flag-outline',
            t('contribute.report'),
            () => {
              setSent(null);
              setPanel('report');
            },
            theme.colors.danger,
          )}
          {verify.isPending && <ActivityIndicator color={theme.colors.primary} />}
        </View>
      )}

      {/* Düzeltme önerisi */}
      {panel === 'change' && (
        <View style={styles.panel}>
          <Text style={[styles.panelTitle, { color: theme.colors.textPrimary }]}>
            {t('contribute.suggestEdit')}
          </Text>
          <View style={styles.chips}>
            {CHANGE_REQUEST_TYPES.map((type) => (
              <Pressable
                key={type}
                style={chip(changeType === type)}
                onPress={() => setChangeType(type)}
                accessibilityRole="radio"
                accessibilityState={{ selected: changeType === type }}
                accessibilityLabel={t(`contribute.types.${type}`)}
              >
                <Text style={chipText(changeType === type)}>{t(`contribute.types.${type}`)}</Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={[...inputStyle, styles.multiline]}
            placeholder={t('contribute.notePlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={note}
            onChangeText={setNote}
            multiline
          />
          {changeRequest.isError && (
            <Text style={{ color: theme.colors.danger, fontSize: 12 }}>
              {t('contribute.error')}
            </Text>
          )}
          <Buttons
            onCancel={() => setPanel(null)}
            onSubmit={() => changeRequest.mutate()}
            canSubmit={note.trim().length >= 10}
            pending={changeRequest.isPending}
            submitLabel={t('contribute.submit')}
            hint={note.trim().length < 10 ? t('contribute.noteHint') : null}
          />
        </View>
      )}

      {/* Şikâyet */}
      {panel === 'report' && (
        <View style={styles.panel}>
          <Text style={[styles.panelTitle, { color: theme.colors.textPrimary }]}>
            {t('contribute.report')}
          </Text>
          <View style={styles.chips}>
            {REPORT_CATEGORIES.map((value) => (
              <Pressable
                key={value}
                style={chip(category === value)}
                onPress={() => setCategory(value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: category === value }}
                accessibilityLabel={t(`contribute.categories.${value}`)}
              >
                <Text style={chipText(category === value)}>
                  {t(`contribute.categories.${value}`)}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            style={[...inputStyle, styles.multiline]}
            placeholder={t('contribute.descriptionPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
          />
          {report.isError && (
            <Text style={{ color: theme.colors.danger, fontSize: 12 }}>
              {t('contribute.error')}
            </Text>
          )}
          <Buttons
            onCancel={() => setPanel(null)}
            onSubmit={() => report.mutate()}
            canSubmit
            pending={report.isPending}
            submitLabel={t('contribute.submit')}
            hint={null}
          />
        </View>
      )}
    </View>
  );
}

function Buttons({
  onCancel,
  onSubmit,
  canSubmit,
  pending,
  submitLabel,
  hint,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  pending: boolean;
  submitLabel: string;
  hint: string | null;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <>
      {hint && <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>{hint}</Text>}
      <View style={styles.buttonRow}>
        <Pressable style={styles.cancel} onPress={onCancel} accessibilityRole="button">
          <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>
            {t('common.cancel')}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.submit,
            { backgroundColor: canSubmit ? theme.colors.primary : theme.colors.elevatedSurface },
          ]}
          disabled={!canSubmit || pending}
          onPress={onSubmit}
          accessibilityRole="button"
          accessibilityLabel={submitLabel}
        >
          {pending ? (
            <ActivityIndicator color={theme.colors.background} size="small" />
          ) : (
            <Text
              style={{
                color: canSubmit ? theme.colors.background : theme.colors.textSecondary,
                fontWeight: '700',
              }}
            >
              {submitLabel}
            </Text>
          )}
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginTop: 16 },
  title: { fontSize: 15, fontWeight: '700', marginBottom: 6 },
  hint: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  actions: { gap: 8 },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  sentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  panel: { gap: 10 },
  panelTitle: { fontSize: 13, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  buttonRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', alignItems: 'center' },
  cancel: { paddingHorizontal: 14, paddingVertical: 10 },
  submit: {
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 100,
    alignItems: 'center',
  },
});
