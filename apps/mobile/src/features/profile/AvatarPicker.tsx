import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { avatarUri, profileApi } from '../../api/profile';
import { useTheme } from '../../theme/tokens';

interface Props {
  avatarUrl: string | null;
  displayName: string;
  size?: number;
}

/** Profil fotoğrafı: dokunarak değiştir, uzun basarak kaldır. */
export function AvatarPicker({ avatarUrl, displayName, size = 72 }: Props) {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['my-profile'] });
    void queryClient.invalidateQueries({ queryKey: ['public-profile'] });
  };

  const upload = useMutation({
    mutationFn: async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error('PERMISSION');
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (picked.canceled || !picked.assets[0]) return null;
      const asset = picked.assets[0];
      return profileApi.uploadAvatar(asset.uri, asset.mimeType ?? 'image/jpeg');
    },
    onSuccess: (result) => {
      if (result) invalidate();
      setError(null);
    },
    onError: (err) =>
      setError(err instanceof Error && err.message === 'PERMISSION' ? 'permission' : 'generic'),
  });

  const remove = useMutation({
    mutationFn: profileApi.removeAvatar,
    onSuccess: invalidate,
  });

  const uri = avatarUri(avatarUrl);
  const initials = displayName.trim().charAt(0).toUpperCase() || '?';
  const busy = upload.isPending || remove.isPending;

  return (
    <View style={styles.wrapper}>
      <Pressable
        onPress={() => upload.mutate()}
        onLongPress={() => avatarUrl && remove.mutate()}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={t('profile.changeAvatar')}
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: theme.colors.elevatedSurface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {busy ? (
          <ActivityIndicator color={theme.colors.primary} />
        ) : uri ? (
          <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        ) : (
          <Text style={{ color: theme.colors.primary, fontSize: size / 2.6, fontWeight: '800' }}>
            {initials}
          </Text>
        )}
        <View style={[styles.badge, { backgroundColor: theme.colors.primary }]}>
          <Ionicons name="camera" size={12} color={theme.colors.background} />
        </View>
      </Pressable>
      {error && (
        <Text style={[styles.error, { color: theme.colors.danger }]}>
          {t(`profile.avatarError.${error}`)}
        </Text>
      )}
      {avatarUrl && !error && (
        <Text style={[styles.hint, { color: theme.colors.textSecondary }]}>
          {t('profile.avatarRemoveHint')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, overflow: 'visible' },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { fontSize: 11, marginTop: 6, textAlign: 'center' },
  hint: { fontSize: 10, marginTop: 6, textAlign: 'center' },
});
