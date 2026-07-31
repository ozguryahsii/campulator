import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { MyProfile } from '../../api/profile';
import { profileApi } from '../../api/profile';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/tokens';

/** Görünen ad, hakkında ve arayüz dili düzenleme (PATCH /me) */
export function EditProfile({ profile }: { profile: MyProfile }) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const setLanguage = useAuthStore((s) => s.setLanguage);

  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [locale, setLocale] = useState<'tr' | 'en'>(profile.locale === 'en' ? 'en' : 'tr');
  const [saved, setSaved] = useState(false);

  const save = useMutation({
    mutationFn: () =>
      profileApi.update({ displayName: displayName.trim(), bio: bio.trim(), locale }),
    onSuccess: async () => {
      setSaved(true);
      setOpen(false);
      // Dil değiştiyse arayüz de hemen değişsin
      if (locale !== i18n.language) {
        await setLanguage(locale);
        await i18n.changeLanguage(locale);
      }
      void queryClient.invalidateQueries({ queryKey: ['my-profile'] });
      void queryClient.invalidateQueries({ queryKey: ['public-profile'] });
    },
  });

  if (!open) {
    return (
      <Pressable
        style={styles.link}
        onPress={() => {
          setSaved(false);
          setOpen(true);
        }}
        accessibilityRole="button"
      >
        <Ionicons name="person-outline" size={16} color={theme.colors.primary} />
        <Text style={{ color: theme.colors.primary, fontWeight: '600', fontSize: 14, flex: 1 }}>
          {t('profile.edit.title')}
        </Text>
        {saved && <Ionicons name="checkmark-circle" size={16} color={theme.colors.primary} />}
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
  const canSubmit = displayName.trim().length >= 2;

  return (
    <View style={styles.form}>
      <Text style={{ color: theme.colors.textPrimary, fontWeight: '700', fontSize: 14 }}>
        {t('profile.edit.title')}
      </Text>
      <TextInput
        style={inputStyle}
        placeholder={t('auth.displayName')}
        placeholderTextColor={theme.colors.textSecondary}
        value={displayName}
        onChangeText={setDisplayName}
      />
      <TextInput
        style={[...inputStyle, styles.multiline]}
        placeholder={t('profile.edit.bioPlaceholder')}
        placeholderTextColor={theme.colors.textSecondary}
        value={bio}
        onChangeText={setBio}
        multiline
        maxLength={500}
      />
      <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
        {t('profile.edit.language')}
      </Text>
      <View style={styles.chips}>
        {(['tr', 'en'] as const).map((value) => (
          <Pressable
            key={value}
            onPress={() => setLocale(value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: locale === value }}
            accessibilityLabel={t(`language.${value === 'tr' ? 'turkish' : 'english'}`)}
            style={[
              styles.chip,
              {
                backgroundColor:
                  locale === value ? theme.colors.primary : theme.colors.elevatedSurface,
                borderColor: locale === value ? theme.colors.primary : theme.colors.border,
              },
            ]}
          >
            <Text
              style={{
                color: locale === value ? theme.colors.background : theme.colors.textPrimary,
                fontSize: 13,
                fontWeight: locale === value ? '700' : '400',
              }}
            >
              {t(`language.${value === 'tr' ? 'turkish' : 'english'}`)}
            </Text>
          </Pressable>
        ))}
      </View>
      {save.isError && (
        <Text style={{ color: theme.colors.danger, fontSize: 12 }}>{t('common.error')}</Text>
      )}
      {!canSubmit && (
        <Text style={{ color: theme.colors.textSecondary, fontSize: 11 }}>
          {t('auth.hints.name')}
        </Text>
      )}
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
          disabled={!canSubmit || save.isPending}
          onPress={() => save.mutate()}
          accessibilityRole="button"
          accessibilityLabel={t('common.save')}
        >
          {save.isPending ? (
            <ActivityIndicator color={theme.colors.background} size="small" />
          ) : (
            <Text
              style={{
                color: canSubmit ? theme.colors.background : theme.colors.textSecondary,
                fontWeight: '700',
              }}
            >
              {t('common.save')}
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
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { borderRadius: 999, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 8 },
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
