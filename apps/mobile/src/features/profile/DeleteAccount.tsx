import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { profileApi } from '../../api/profile';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/tokens';

/** Silme işlemini onaylamak için yazılması gereken kelime */
const CONFIRM_WORD_KEY = 'profile.delete.confirmWord';

/**
 * Hesap silme. App Store kuralı ve KVKK gereği uygulama içinden yapılabilmeli.
 * Sunucu kişisel verileri anonimleştirir, oturumları ve cihaz kayıtlarını siler.
 */
export function DeleteAccount() {
  const { t } = useTranslation();
  const theme = useTheme();
  const signOut = useAuthStore((s) => s.signOut);

  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');

  const remove = useMutation({
    mutationFn: profileApi.deleteAccount,
    onSuccess: () => void signOut(),
  });

  if (!open) {
    return (
      <Pressable
        style={styles.link}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={t('profile.delete.title')}
      >
        <Ionicons name="trash-outline" size={15} color={theme.colors.danger} />
        <Text style={{ color: theme.colors.danger, fontSize: 13 }}>
          {t('profile.delete.title')}
        </Text>
      </Pressable>
    );
  }

  const canSubmit = confirmation.trim().toLocaleUpperCase('tr') === t(CONFIRM_WORD_KEY);

  return (
    <View style={[styles.box, { borderColor: theme.colors.danger }]}>
      <Text style={{ color: theme.colors.danger, fontWeight: '700', fontSize: 14 }}>
        {t('profile.delete.title')}
      </Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
        {t('profile.delete.warning')}
      </Text>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
        {t('profile.delete.prompt', { word: t(CONFIRM_WORD_KEY) })}
      </Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.elevatedSurface,
            borderColor: theme.colors.border,
            color: theme.colors.textPrimary,
          },
        ]}
        value={confirmation}
        onChangeText={setConfirmation}
        autoCapitalize="characters"
        autoCorrect={false}
        accessibilityLabel={t('profile.delete.prompt', { word: t(CONFIRM_WORD_KEY) })}
      />
      {remove.isError && (
        <Text style={{ color: theme.colors.danger, fontSize: 12 }}>{t('common.error')}</Text>
      )}
      <View style={styles.buttonRow}>
        <Pressable
          style={styles.cancel}
          onPress={() => {
            setOpen(false);
            setConfirmation('');
          }}
          accessibilityRole="button"
        >
          <Text style={{ color: theme.colors.textSecondary, fontWeight: '600' }}>
            {t('common.cancel')}
          </Text>
        </Pressable>
        <Pressable
          style={[
            styles.submit,
            { backgroundColor: canSubmit ? theme.colors.danger : theme.colors.elevatedSurface },
          ]}
          disabled={!canSubmit || remove.isPending}
          onPress={() => remove.mutate()}
          accessibilityRole="button"
          accessibilityLabel={t('profile.delete.submit')}
        >
          {remove.isPending ? (
            <ActivityIndicator color={theme.colors.background} size="small" />
          ) : (
            <Text
              style={{
                color: canSubmit ? theme.colors.background : theme.colors.textSecondary,
                fontWeight: '700',
              }}
            >
              {t('profile.delete.submit')}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  link: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  box: { borderWidth: 1, borderRadius: 12, padding: 14, gap: 10 },
  input: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
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
