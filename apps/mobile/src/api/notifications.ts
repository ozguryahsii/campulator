import { apiRequest } from './client';

export interface NotificationItem {
  id: string;
  type: string;
  titleKey: string;
  bodyKey: string;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  total: number;
  unreadCount: number;
  items: NotificationItem[];
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
}

export const notificationsApi = {
  list: () => apiRequest<NotificationsResponse>('/notifications', { auth: true }),
  markRead: (id: string) =>
    apiRequest<{ read: boolean }>(`/notifications/${id}/read`, { method: 'PATCH', auth: true }),
  markAllRead: () =>
    apiRequest<{ updated: number }>('/notifications/read-all', { method: 'PATCH', auth: true }),
  preferences: () =>
    apiRequest<NotificationPreferences>('/notifications/preferences', { auth: true }),
  updatePreferences: (body: Partial<NotificationPreferences>) =>
    apiRequest<NotificationPreferences>('/notifications/preferences', {
      method: 'PATCH',
      body,
      auth: true,
    }),
  registerDevice: (body: { platform: 'IOS' | 'ANDROID'; fcmToken: string; deviceId?: string }) =>
    apiRequest<{ id: string }>('/devices/fcm-token', { method: 'POST', body, auth: true }),
  /** Çıkışta cihaz kaydı silinir; başkasının cihazına bildirim gitmesin */
  unregisterDevice: (id: string) =>
    apiRequest<{ deleted: boolean }>(`/devices/fcm-token/${id}`, { method: 'DELETE', auth: true }),
};
