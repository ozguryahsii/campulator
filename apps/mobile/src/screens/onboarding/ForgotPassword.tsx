import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ApiError, authApi } from '../../api/client';
import { useTheme } from '../../theme/tokens';

type Step = 'request' | 'reset' | 'done';

/** campulator://reset-password?token=... bağlantısından token'ı çıkarır */
function tokenFromUrl(url: string | null): string | null {
  if (!url) return null;
  const value = Linking.parse(url).queryParams?.token;
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * Şifremi unuttum akışı: e-posta iste → sıfırlama bağlantısı gönder →
 * token + yeni şifre. E-postadaki bağlantı uygulamayı açarsa token otomatik dolar.
 */
export function ForgotPassword({ email, onClose }: { email: string; onClose: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();

  const [step, setStep] = useState<Step>('request');
  const [address, setAddress] = useState(email);
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Sıfırlama bağlantısıyla açıldıysa doğrudan ikinci adıma geç
  useEffect(() => {
    const apply = (url: string | null) => {
      const found = tokenFromUrl(url);
      if (found) {
        setToken(found);
        setStep('reset');
      }
    };
    void Linking.getInitialURL().then(apply);
    const subscription = Linking.addEventListener('url', (event) => apply(event.url));
    return () => subscription.remove();
  }, []);

  const request = useMutation({
    mutationFn: () => authApi.forgotPassword(address.trim()),
    onSuccess: () => {
      setError(null);
      setStep('reset');
    },
    onError: () => setError(t('auth.forgot.requestFailed')),
  });

  const reset = useMutation({
    mutationFn: () => authApi.resetPassword({ token: token.trim(), newPassword: password }),
    onSuccess: () => {
      setError(null);
      setStep('done');
    },
    onError: (err) =>
      setError(
        err instanceof ApiError && err.code === 'AUTH_RESET_TOKEN_INVALID'
          ? t('auth.forgot.tokenInvalid')
          : t('auth.forgot.resetFailed'),
      ),
  });

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      color: theme.colors.textPrimary,
    },
  ];

  const submitButton = (label: string, enabled: boolean, pending: boolean, onPress: () => void) => (
    <Pressable
      style={[
        styles.cta,
        { backgroundColor: enabled ? theme.colors.primary : theme.colors.elevatedSurface },
      ]}
      disabled={!enabled || pending}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {pending ? (
        <ActivityIndicator color={theme.colors.background} />
      ) : (
        <Text
          style={[
            styles.ctaText,
            { color: enabled ? theme.colors.background : theme.colors.textSecondary },
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.backRow}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel={t('common.back')}
      >
        <Ionicons name="chevron-back" size={18} color={theme.colors.textSecondary} />
        <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>{t('common.back')}</Text>
      </Pressable>

      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
        {t('auth.forgot.title')}
      </Text>

      {step === 'request' && (
        <>
          <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
            {t('auth.forgot.requestNote')}
          </Text>
          <TextInput
            style={inputStyle}
            placeholder={t('auth.email')}
            placeholderTextColor={theme.colors.textSecondary}
            value={address}
            onChangeText={setAddress}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {error && <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text>}
          {submitButton(t('auth.forgot.sendLink'), address.includes('@'), request.isPending, () =>
            request.mutate(),
          )}
        </>
      )}

      {step === 'reset' && (
        <>
          <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
            {t('auth.forgot.resetNote')}
          </Text>
          <TextInput
            style={inputStyle}
            placeholder={t('auth.forgot.tokenPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={inputStyle}
            placeholder={t('profile.password.new')}
            placeholderTextColor={theme.colors.textSecondary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />
          {error && <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text>}
          {submitButton(
            t('auth.forgot.submit'),
            token.trim().length > 10 && password.length >= 8,
            reset.isPending,
            () => reset.mutate(),
          )}
          <Pressable
            style={styles.linkRow}
            onPress={() => setStep('request')}
            accessibilityRole="button"
          >
            <Text style={{ color: theme.colors.primary, fontSize: 12 }}>
              {t('auth.forgot.resend')}
            </Text>
          </Pressable>
        </>
      )}

      {step === 'done' && (
        <>
          <View style={styles.doneRow}>
            <Ionicons name="checkmark-circle" size={18} color={theme.colors.primary} />
            <Text style={{ color: theme.colors.primary, fontSize: 14, flex: 1 }}>
              {t('auth.forgot.success')}
            </Text>
          </View>
          {submitButton(t('auth.login'), true, false, onClose)}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  title: { fontSize: 18, fontWeight: '700' },
  note: { fontSize: 13, lineHeight: 19 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  error: { fontSize: 13 },
  cta: { borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  ctaText: { fontSize: 16, fontWeight: '700' },
  linkRow: { alignItems: 'center', paddingVertical: 4 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
