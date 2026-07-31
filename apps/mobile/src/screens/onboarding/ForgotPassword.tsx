import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ApiError, authApi } from '../../api/client';
import { CodeInput } from '../../components/CodeInput';
import { formatCountdown, useCountdown } from '../../hooks/useCountdown';
import { useTheme } from '../../theme/tokens';

type Step = 'request' | 'reset' | 'done';

/**
 * Şifremi unuttum: e-posta gir → 6 haneli kod gelsin → kod + yeni şifre.
 * Kod 15 dakika geçerlidir; 5 hatalı denemeden sonra iptal olur.
 */
export function ForgotPassword({ email, onClose }: { email: string; onClose: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();

  const [step, setStep] = useState<Step>('request');
  const [address, setAddress] = useState(email);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Spam koruması: sunucunun bildirdiği süre boyunca yeni kod istenemez
  const { seconds: cooldown, start: startCooldown } = useCountdown();

  const request = useMutation({
    mutationFn: () => authApi.forgotPassword(address.trim()),
    onSuccess: (result) => {
      startCooldown(result.retryAfterSeconds);
      setError(result.sent ? null : t('auth.forgot.cooldown'));
      setStep('reset');
    },
    onError: () => setError(t('auth.forgot.requestFailed')),
  });

  const reset = useMutation({
    mutationFn: () => authApi.resetPassword({ email: address.trim(), code, newPassword: password }),
    onSuccess: () => {
      setError(null);
      setStep('done');
    },
    onError: (err) => {
      if (err instanceof ApiError && err.code === 'AUTH_CODE_TOO_MANY_ATTEMPTS') {
        setError(t('auth.forgot.tooManyAttempts'));
      } else if (err instanceof ApiError && err.code === 'AUTH_RESET_CODE_INVALID') {
        setError(t('auth.forgot.codeInvalid'));
      } else {
        setError(t('auth.forgot.resetFailed'));
      }
      setCode('');
    },
  });

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
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
              },
            ]}
            placeholder={t('auth.email')}
            placeholderTextColor={theme.colors.textSecondary}
            value={address}
            onChangeText={setAddress}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {error && <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text>}
          {submitButton(
            cooldown > 0
              ? t('auth.forgot.sendCodeIn', { time: formatCountdown(cooldown) })
              : t('auth.forgot.sendCode'),
            address.includes('@') && cooldown === 0,
            request.isPending,
            () => request.mutate(),
          )}
        </>
      )}

      {step === 'reset' && (
        <>
          <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
            {t('auth.forgot.resetNote', { email: address.trim() })}
          </Text>
          <CodeInput
            value={code}
            onChange={(value) => {
              setCode(value);
              setError(null);
            }}
            accessibilityLabel={t('auth.forgot.codeLabel')}
            autoFocus
          />
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
              },
            ]}
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
            code.length === 6 && password.length >= 8,
            reset.isPending,
            () => reset.mutate(),
          )}
          {/*
           * Geri sayım sürerken dokunuş hiçbir şey yapmaz; süre dolunca aynı
           * adreste kalıp yeni kod ister (adım değiştirmez).
           */}
          <Pressable
            style={styles.linkRow}
            disabled={cooldown > 0 || request.isPending}
            onPress={() => {
              setError(null);
              setCode('');
              request.mutate();
            }}
            accessibilityRole="button"
            accessibilityState={{ disabled: cooldown > 0 }}
          >
            <Text
              style={{
                color: cooldown > 0 ? theme.colors.textSecondary : theme.colors.primary,
                fontSize: 12,
              }}
            >
              {cooldown > 0
                ? t('auth.forgot.resendIn', { time: formatCountdown(cooldown) })
                : t('auth.forgot.resend')}
            </Text>
          </Pressable>

          <Pressable
            style={styles.linkRow}
            onPress={() => {
              setStep('request');
              setError(null);
              setCode('');
            }}
            accessibilityRole="button"
          >
            <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>
              {t('auth.forgot.changeEmail')}
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
