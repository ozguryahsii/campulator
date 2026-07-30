import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from '../../components/BrandLogo';
import { VerifyEmail } from '../../features/profile/VerifyEmail';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/tokens';

/**
 * E-postasını doğrulamamış kullanıcı giriş yaptığında uygulamaya değil bu
 * ekrana düşer; doğrulama tamamlanmadan sekmelere erişemez. İsteyen çıkış
 * yapıp misafir olarak devam edebilir (docs/01 §13).
 */
export function VerifyEmailGate() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { user, signOut, continueAsGuest } = useAuthStore();

  const continueAsGuestFromHere = async () => {
    await signOut();
    continueAsGuest();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <BrandLogo size={64} />
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            {t('auth.gate.title')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {t('auth.gate.subtitle')}
          </Text>
        </View>

        <VerifyEmail email={user?.email ?? null} />

        <Pressable
          style={styles.link}
          onPress={() => void continueAsGuestFromHere()}
          accessibilityRole="button"
        >
          <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
            {t('auth.continueAsGuest')}
          </Text>
        </Pressable>
        <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
          {t('auth.gate.guestNote')}
        </Text>

        <Pressable style={styles.link} onPress={() => void signOut()} accessibilityRole="button">
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
            {t('auth.signOut')}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingTop: 72, paddingBottom: 48 },
  header: { alignItems: 'center', gap: 10 },
  title: { fontSize: 20, fontWeight: '700', marginTop: 12, textAlign: 'center' },
  subtitle: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  link: { alignItems: 'center', marginTop: 20 },
  note: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6 },
});
