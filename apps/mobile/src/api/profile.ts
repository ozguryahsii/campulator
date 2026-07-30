import { apiRequest, apiUpload, BASE_URL } from './client';

export interface MyProfile {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  locale: string;
  trustLevel: string;
  emailVerified: boolean;
}

export const profileApi = {
  me: () => apiRequest<MyProfile>('/me', { auth: true }),
  update: (body: { displayName?: string; bio?: string; locale?: string }) =>
    apiRequest<MyProfile>('/me', { method: 'PATCH', body, auth: true }),
  uploadAvatar: (uri: string, mimeType: string) =>
    apiUpload<{ avatarUrl: string; url: string }>('/me/avatar', uri, mimeType),
  removeAvatar: () =>
    apiRequest<{ avatarUrl: null }>('/me/avatar', { method: 'DELETE', auth: true }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiRequest<{ changed: boolean }>('/auth/password', { method: 'PATCH', body, auth: true }),
};

/** Depolama anahtarını görüntülenebilir tam URL'ye çevirir */
export function avatarUri(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return `${BASE_URL}/storage/${avatarUrl}`;
}
