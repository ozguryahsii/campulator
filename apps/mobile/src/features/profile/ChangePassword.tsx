import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ApiError } from '../../api/client';
import { profileApi } from '../../api/profile';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/tokens';

/** Çevirisi olan sunucu hata kodları */
const KNOWN_ERRORS = [
  'AUTH_CURRENT_PASSWORD_WRONG',
  'AUTH_PASSWORD_UNCHANGED',
  'AUTH_PASSWORD_NOT_SET',
];

/**
 * Şifre değiştirme. Başarılı olduğunda sunucu tüm refresh token'ları iptal
 * ettiği için oturum kapatılır ve kullanıcı yeni şifresiyle giriş yapar.
 */
export function ChangePassword() {
  const { t } = useTranslation();
  const theme = useTheme();
  const signOut = useAuthStore((s) => s.signOut);

  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const change = useMutation({
    mutationFn: () => profileApi.changePassword({ currentPassword: current, newPassword: next }),
    onSuccess: () => {
      setDone(true);
      // Oturum sunucuda zaten kapandı; yerel durumu da temizle
      setTimeout(() => void signOut(), 1500);
    },
    onError: (err) => {
      const code = err instanceof ApiError ? err.code : '';
      setError(
        KNOWN_ERRORS.includes(code) ? `profile.password.${code}` : 'profile.password.generic',
      );
    },
  });

  if (!open) {
    return (
      <Pressable style={styles.link} onPress={() => setOpen(true)} accessibilityRole="button">
        <Ionicons name="key-outline" size={16} color={theme.colors.primary} />
        <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 14 }}>
          {t('profile.password.title')}
        </Text>
      </Pressable>
    );
  }

  if (done) {
    return (
      <View style={styles.link}>
        <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />
        <Text style={{ color: theme.colors.primary, fontSize: 13, flex: 1 }}>
          {t('profile.password.success')}
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

  // Buton pasifken sebebini göster
  const hint = (() => {
    if (current.length === 0 || next.length === 0) return t('profile.password.hintRequired');
    if (next.length < 8) return t('auth.hints.password');
    if (next !== repeat) return t('profile.password.hintMismatch');
    return null;
  })();
  const canSubmit = hint === null;

  return (
    <View style={styles.form}>
      <Text style={{ color: theme.colors.textPrimary, fontWeight: '700', fontSize: 14 }}>
        {t('profile.password.title')}
      </Text>
      <TextInput
        style={inputStyle}
        placeholder={t('profile.password.current')}
        placeholderTextColor={theme.colors.textSecondary}
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        autoCapitalize="none"
      />
      <TextInput
        style={inputStyle}
        placeholder={t('profile.password.new')}
        placeholderTextColor={theme.colors.textSecondary}
        value={next}
        onChangeText={setNext}
        secureTextEntry
        autoCapitalize="none"
      />
      <TextInput
        style={inputStyle}
        placeholder={t('profile.password.repeat')}
        placeholderTextColor={theme.colors.textSecondary}
        value={repeat}
        onChangeText={setRepeat}
        secureTextEntry
        autoCapitalize="none"
      />
      {error && <Text style={{ color: theme.colors.danger, fontSize: 12 }}>{t(error)}</Text>}
      {!error && hint && (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>{hint}</Text>
      )}
      <Text style={{ color: theme.colors.textSecondary, fontSize: 11, lineHeight: 16 }}>
        {t('profile.password.note')}
      </Text>
      <View style={styles.buttonRow}>
        <Pressable
          style={styles.cancel}
          onPress={() => {
            setOpen(false);
            setError(null);
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
            { backgroundColor: canSubmit ? theme.colors.primary : theme.colors.elevatedSurface },
          ]}
          disabled={!canSubmit || change.isPending}
          onPress={() => {
            setError(null);
            change.mutate();
          }}
          accessibilityRole="button"
          accessibilityLabel={t('profile.password.submit')}
        >
          {change.isPending ? (
            <ActivityIndicator color={theme.colors.background} size="small" />
          ) : (
            <Text
              style={{
                color: canSubmit ? theme.colors.background : theme.colors.textSecondary,
                fontWeight: '700',
              }}
            >
              {t('profile.password.submit')}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  link: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  form: { gap: 10 },
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
