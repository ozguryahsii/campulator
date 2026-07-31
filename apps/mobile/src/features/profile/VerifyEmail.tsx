import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ApiError, authApi } from '../../api/client';
import { profileApi } from '../../api/profile';
import { CodeInput } from '../../components/CodeInput';
import { formatCountdown, useCountdown } from '../../hooks/useCountdown';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/tokens';

/**
 * E-posta doğrulama: kullanıcı e-postasına gelen 6 haneli kodu girer.
 * Kod 15 dakika geçerlidir; 5 hatalı denemeden sonra iptal olur.
 */
export function VerifyEmail({ email }: { email: string | null }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const tryRefresh = useAuthStore((s) => s.tryRefresh);

  const [code, setCode] = useState('');
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Spam koruması: sunucunun bildirdiği süre boyunca yeniden gönderim kapalı
  const { seconds: cooldown, start: startCooldown } = useCountdown();

  const verify = useMutation({
    mutationFn: () => profileApi.verifyEmail({ email: email ?? '', code }),
    // Oturum bilgisindeki emailVerified alanı yenilensin
    onSuccess: () => void tryRefresh(),
    onError: (err) => {
      const known =
        err instanceof ApiError && err.code === 'AUTH_CODE_TOO_MANY_ATTEMPTS'
          ? 'tooManyAttempts'
          : 'invalid';
      setError(t(`profile.verify.${known}`));
      setCode('');
    },
  });

  const resend = async () => {
    if (!email || cooldown > 0) return;
    try {
      const result = await authApi.resendVerification(email);
      startCooldown(result.retryAfterSeconds);
      setError(null);
      setInfo(result.sent ? t('profile.verify.resent') : null);
      if (result.sent) setCode('');
    } catch {
      setError(t('profile.verify.resendFailed'));
    }
  };

  return (
    <View style={[styles.box, { borderColor: theme.colors.warning }]}>
      <View style={styles.row}>
        <Ionicons name="mail-unread-outline" size={16} color={theme.colors.warning} />
        <Text style={{ color: theme.colors.warning, fontWeight: '700', fontSize: 13, flex: 1 }}>
          {t('auth.verificationPending')}
        </Text>
      </View>
      <Text style={{ color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18 }}>
        {t('profile.verify.explanation', { email: email ?? '' })}
      </Text>

      <CodeInput
        value={code}
        onChange={(value) => {
          setCode(value);
          setError(null);
        }}
        accessibilityLabel={t('profile.verify.codeLabel')}
      />

      {error && <Text style={{ color: theme.colors.danger, fontSize: 12 }}>{error}</Text>}

      <Pressable
        style={[
          styles.cta,
          {
            backgroundColor:
              code.length === 6 ? theme.colors.primary : theme.colors.elevatedSurface,
          },
        ]}
        disabled={code.length !== 6 || verify.isPending}
        onPress={() => verify.mutate()}
        accessibilityRole="button"
        accessibilityLabel={t('profile.verify.submit')}
      >
        {verify.isPending ? (
          <ActivityIndicator color={theme.colors.background} size="small" />
        ) : (
          <Text
            style={{
              color: code.length === 6 ? theme.colors.background : theme.colors.textSecondary,
              fontWeight: '700',
            }}
          >
            {t('profile.verify.submit')}
          </Text>
        )}
      </Pressable>

      {info && (
        <Text style={{ color: theme.colors.primary, fontSize: 12, textAlign: 'center' }}>
          {info}
        </Text>
      )}

      <Pressable
        onPress={() => void resend()}
        disabled={cooldown > 0}
        accessibilityRole="button"
        accessibilityState={{ disabled: cooldown > 0 }}
      >
        <Text
          style={{
            color: cooldown > 0 ? theme.colors.textSecondary : theme.colors.primary,
            fontSize: 12,
            textAlign: 'center',
          }}
        >
          {cooldown > 0
            ? t('profile.verify.resendIn', { time: formatCountdown(cooldown) })
            : t('profile.verify.resend')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cta: { borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
});
