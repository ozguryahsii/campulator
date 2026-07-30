import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { authApi } from '../../api/client';
import { profileApi } from '../../api/profile';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/tokens';

/** campulator://verify-email?token=... bağlantısından token'ı çıkarır */
function tokenFromUrl(url: string | null): string | null {
  if (!url) return null;
  const parsed = Linking.parse(url);
  const token = parsed.queryParams?.token;
  return typeof token === 'string' && token.length > 0 ? token : null;
}

/**
 * E-posta doğrulama. E-postadaki bağlantı uygulamayı açtığında token otomatik
 * işlenir; bağlantı çalışmazsa kullanıcı kodu elle yapıştırabilir.
 */
export function VerifyEmail({ email }: { email: string | null }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const tryRefresh = useAuthStore((s) => s.tryRefresh);

  const [manual, setManual] = useState(false);
  const [token, setToken] = useState('');
  const [resent, setResent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useMutation({
    mutationFn: (value: string) => profileApi.verifyEmail(value),
    // Oturum bilgisindeki emailVerified alanı yenilensin
    onSuccess: () => void tryRefresh(),
    onError: () => setError(t('profile.verify.invalid')),
  });

  // Mutation referansı her render değişir; dinleyici yeniden kurulmasın diye ref'te tutulur
  const verifyRef = useRef(verify);
  verifyRef.current = verify;

  // Uygulama kapalıyken tıklanan bağlantı + açıkken gelen bağlantı
  useEffect(() => {
    const handleUrl = (url: string | null) => {
      const found = tokenFromUrl(url);
      if (found) verifyRef.current.mutate(found);
    };
    void Linking.getInitialURL().then(handleUrl);
    const subscription = Linking.addEventListener('url', (event) => handleUrl(event.url));
    return () => subscription.remove();
  }, []);

  const resend = async () => {
    if (!email) return;
    try {
      await authApi.resendVerification(email);
      setResent(true);
      setError(null);
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
        {t('profile.verify.explanation')}
      </Text>

      {verify.isPending && <ActivityIndicator color={theme.colors.primary} />}
      {error && <Text style={{ color: theme.colors.danger, fontSize: 12 }}>{error}</Text>}

      {manual ? (
        <View style={styles.manualRow}>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.elevatedSurface,
                borderColor: theme.colors.border,
                color: theme.colors.textPrimary,
              },
            ]}
            placeholder={t('profile.verify.tokenPlaceholder')}
            placeholderTextColor={theme.colors.textSecondary}
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Pressable
            style={[
              styles.send,
              {
                backgroundColor:
                  token.trim().length > 10 ? theme.colors.primary : theme.colors.elevatedSurface,
              },
            ]}
            disabled={token.trim().length <= 10 || verify.isPending}
            onPress={() => {
              setError(null);
              verify.mutate(token.trim());
            }}
            accessibilityRole="button"
            accessibilityLabel={t('profile.verify.submit')}
          >
            <Ionicons name="checkmark" size={16} color={theme.colors.background} />
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={() => setManual(true)} accessibilityRole="button">
          <Text style={{ color: theme.colors.primary, fontSize: 12 }}>
            {t('profile.verify.enterManually')}
          </Text>
        </Pressable>
      )}

      <Pressable onPress={() => void resend()} disabled={resent} accessibilityRole="button">
        <Text
          style={{
            color: resent ? theme.colors.textSecondary : theme.colors.primary,
            fontSize: 12,
          }}
        >
          {resent ? t('auth.verificationSent') : t('auth.resendVerification')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 12, padding: 14, marginTop: 16, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  manualRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  send: { borderRadius: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
