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

export interface PublicProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  trustLevel: string;
  memberSince: string;
  stats: {
    reviews: number;
    ratings: number;
    addedPlaces: number;
    photos: number;
    approvedChanges: number;
  };
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
  /** KVKK ve App Store gereği: hesabı uygulama içinden silebilme */
  deleteAccount: () =>
    apiRequest<{ deleted: boolean }>('/auth/account', { method: 'DELETE', auth: true }),
  verifyEmail: (body: { email: string; code: string }) =>
    apiRequest<{ verified: boolean }>('/auth/verify-email', { method: 'POST', body }),
  publicProfile: (userId: string) => apiRequest<PublicProfile>(`/users/${userId}`),
};

/** Depolama anahtarını görüntülenebilir tam URL'ye çevirir */
export function avatarUri(avatarUrl: string | null | undefined): string | null {
  if (!avatarUrl) return null;
  if (avatarUrl.startsWith('http')) return avatarUrl;
  return `${BASE_URL}/storage/${avatarUrl}`;
}
