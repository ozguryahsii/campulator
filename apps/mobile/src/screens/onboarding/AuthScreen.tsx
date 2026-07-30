import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ApiError, authApi } from '../../api/client';
import { BrandLogo } from '../../components/BrandLogo';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/tokens';

type Mode = 'login' | 'register';

export function AuthScreen() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const { setSession, continueAsGuest } = useAuthStore();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [marketing, setMarketing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === 'login') {
        const response = await authApi.login({ email: email.trim(), password });
        await setSession(response);
      } else {
        const response = await authApi.register({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
          locale: i18n.language === 'en' ? 'en' : 'tr',
          acceptedConsents: ['TERMS_OF_USE', 'PRIVACY_POLICY', 'COMMUNITY_RULES'],
          marketingConsent: marketing,
        });
        setInfo(t('auth.verificationSent'));
        await setSession(response);
      }
    } catch (err) {
      if (!(err instanceof ApiError)) {
        // fetch başarısız: API'ye ulaşılamıyor (sunucu kapalı / yanlış adres)
        setError(t('auth.errors.network'));
      } else {
        const key = `auth.errors.${err.code}`;
        setError(i18n.exists(key) ? t(key) : t('auth.errors.generic'));
      }
    } finally {
      setBusy(false);
    }
  };

  const canSubmit =
    email.includes('@') &&
    password.length >= 8 &&
    (mode === 'login' || displayName.trim().length >= 2);

  // Buton pasifken kullanıcı nedenini görebilsin
  const validationHint = (() => {
    if (canSubmit) return null;
    if (mode === 'register' && displayName.trim().length > 0 && displayName.trim().length < 2) {
      return t('auth.hints.name');
    }
    if (email.length > 0 && !email.includes('@')) return t('auth.hints.email');
    if (password.length > 0 && password.length < 8) return t('auth.hints.password');
    return t('auth.hints.required');
  })();

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      color: theme.colors.textPrimary,
    },
  ];

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <BrandLogo size={72} />
          <Text style={[styles.welcome, { color: theme.colors.textPrimary }]}>
            {t('auth.welcome')}
          </Text>
        </View>

        <View style={[styles.tabs, { backgroundColor: theme.colors.surface }]}>
          {(['login', 'register'] as const).map((m) => (
            <Pressable
              key={m}
              style={[styles.tab, mode === m && { backgroundColor: theme.colors.elevatedSurface }]}
              onPress={() => {
                setMode(m);
                setError(null);
              }}
            >
              <Text
                style={{
                  color: mode === m ? theme.colors.primary : theme.colors.textSecondary,
                  fontWeight: '600',
                }}
              >
                {m === 'login' ? t('auth.loginTab') : t('auth.registerTab')}
              </Text>
            </Pressable>
          ))}
        </View>

        {mode === 'register' && (
          <TextInput
            style={inputStyle}
            placeholder={t('auth.displayName')}
            placeholderTextColor={theme.colors.textSecondary}
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />
        )}
        <TextInput
          style={inputStyle}
          placeholder={t('auth.email')}
          placeholderTextColor={theme.colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={inputStyle}
          placeholder={t('auth.password')}
          placeholderTextColor={theme.colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {mode === 'register' && (
          <>
            <View style={styles.marketingRow}>
              <Switch
                value={marketing}
                onValueChange={setMarketing}
                trackColor={{ true: theme.colors.primary }}
              />
              <Text style={[styles.marketingText, { color: theme.colors.textSecondary }]}>
                {t('auth.marketingConsent')}
              </Text>
            </View>
            <Text style={[styles.consent, { color: theme.colors.textSecondary }]}>
              {t('auth.consentText')}
            </Text>
          </>
        )}

        {error && <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text>}
        {info && <Text style={[styles.info, { color: theme.colors.primary }]}>{info}</Text>}
        {!error && validationHint && (
          <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>{validationHint}</Text>
        )}

        <Pressable
          style={[
            styles.cta,
            { backgroundColor: canSubmit ? theme.colors.primary : theme.colors.elevatedSurface },
          ]}
          disabled={!canSubmit || busy}
          onPress={submit}
        >
          {busy ? (
            <ActivityIndicator color={theme.colors.background} />
          ) : (
            <Text
              style={[
                styles.ctaText,
                { color: canSubmit ? theme.colors.background : theme.colors.textSecondary },
              ]}
            >
              {mode === 'login' ? t('auth.login') : t('auth.register')}
            </Text>
          )}
        </Pressable>

        <Pressable style={styles.guest} onPress={continueAsGuest}>
          <Text style={{ color: theme.colors.primary, fontWeight: '600' }}>
            {t('auth.continueAsGuest')}
          </Text>
        </Pressable>
        <Text style={[styles.guestNote, { color: theme.colors.textSecondary }]}>
          {t('auth.guestNote')}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingTop: 72 },
  header: { alignItems: 'center', marginBottom: 24 },
  welcome: { fontSize: 22, fontWeight: '700', marginTop: 16 },
  tabs: { flexDirection: 'row', borderRadius: 12, padding: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 12,
  },
  marketingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  marketingText: { flex: 1, fontSize: 13, lineHeight: 18 },
  consent: { fontSize: 12, lineHeight: 18, marginBottom: 8 },
  error: { marginBottom: 8, fontSize: 14 },
  hint: { marginBottom: 8, fontSize: 12, lineHeight: 17 },
  info: { marginBottom: 8, fontSize: 14 },
  cta: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
  ctaText: { fontSize: 16, fontWeight: '700' },
  guest: { alignItems: 'center', marginTop: 20 },
  guestNote: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8 },
});
