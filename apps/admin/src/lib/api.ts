/** Admin API istemcisi — token localStorage'da tutulur */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3399';
const TOKEN_KEY = 'campulator.admin.accessToken';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
  }
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      typeof data?.message === 'string' ? data.message : `HTTP_${response.status}`,
    );
  }
  return data as T;
}

export interface DashboardCounts {
  pendingModeration: number;
  pendingPlaces: number;
  changeRequests: number;
  openReports: number;
  activeUsers: number;
  reviews: number;
  photos: number;
  pendingPhotos: number;
  verifiedBusinesses: number;
  publishedPlaces: number;
}

export interface ModerationItem {
  id: string;
  itemType: string;
  itemId: string;
  reason: string | null;
  status: string;
  createdAt: string;
  subject: Record<string, unknown> | null;
}

export interface AdminPlace {
  id: string;
  name: string;
  city: string | null;
  publicationStatus: string;
  operatingStatus: string;
  feeType: string;
  locationPrecision: string;
  exactLatitude: number;
  exactLongitude: number;
  score: number | null;
  createdBy: string | null;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string | null;
  emailVerified: boolean;
  status: string;
  role: string;
  displayName: string | null;
  trustLevel: string;
  trustScore: number;
  stats: { reviews: number; places: number; photos: number };
  createdAt: string;
}

export interface PlaceTranslations {
  id: string;
  defaultName: string;
  defaultDescription: string | null;
  translations: { locale: string; name: string | null; description: string | null }[];
}

export interface AdminBusiness {
  id: string;
  name: string;
  evidence: string | null;
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  owner: string | null;
  ownerEmail: string | null;
  createdAt: string;
  places: { id: string; name: string }[];
}

export interface AdminReport {
  id: string;
  category: string;
  targetType: string;
  targetId: string;
  description: string | null;
  status: string;
  reportedBy: string | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  actor: string;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
}

export interface ScoreConfig {
  weights: { features: number; userRating: number; atmosphere: number };
  amenities: { id: number; code: string; weight: number; applicableActivityMask: number }[];
}

export interface AdminPhoto {
  id: string;
  url: string | null;
  attribution: string | null;
  license: string | null;
  sourceUrl: string | null;
  status: string;
  placeId: string | null;
  placeName: string | null;
  placeCity: string | null;
  uploadedBy: string | null;
  createdAt: string;
}

export interface Paged<T> {
  total: number;
  page: number;
  pageSize: number;
  items: T[];
}

export const adminApi = {
  login: (email: string, password: string) =>
    api<{ accessToken: string; user: { role: string; displayName: string } }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  dashboard: () => api<DashboardCounts>('/admin/dashboard'),
  moderation: (status = 'PENDING') =>
    api<Paged<ModerationItem>>(`/admin/moderation?status=${status}&pageSize=50`),
  resolve: (id: string, decision: 'APPROVE' | 'REJECT' | 'ARCHIVE', note?: string) =>
    api<{ status: string }>(`/admin/moderation/${id}/resolve`, {
      method: 'POST',
      body: { decision, note },
    }),
  photos: (status = 'PENDING') =>
    api<Paged<AdminPhoto>>(`/admin/photos?status=${status}&pageSize=48`),
  resolvePhoto: (id: string, action: 'APPROVE' | 'REJECT') =>
    api<{ status: string }>(`/admin/photos/${id}/resolve`, { method: 'POST', body: { action } }),
  merge: (sourceId: string, targetId: string) =>
    api<{ merged: boolean }>('/admin/places/merge', {
      method: 'POST',
      body: { sourceId, targetId },
    }),
  places: (search = '', status = '') =>
    api<Paged<AdminPlace>>(
      `/admin/places?pageSize=50${search ? `&search=${encodeURIComponent(search)}` : ''}${status ? `&status=${status}` : ''}`,
    ),
  users: (search = '') =>
    api<Paged<AdminUser>>(
      `/admin/users?pageSize=50${search ? `&search=${encodeURIComponent(search)}` : ''}`,
    ),
  setTrustLevel: (id: string, trustLevel: string) =>
    api<{ trustLevel: string }>(`/admin/users/${id}/trust-level`, {
      method: 'PATCH',
      body: { trustLevel },
    }),
  setUserStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') =>
    api<{ status: string }>(`/admin/users/${id}/status`, { method: 'PATCH', body: { status } }),
  translations: (placeId: string) =>
    api<PlaceTranslations>(`/admin/places/${placeId}/translations`),
  saveTranslation: (
    placeId: string,
    locale: string,
    body: { name?: string; description?: string },
  ) =>
    api<{ locale: string }>(`/admin/places/${placeId}/translations/${locale}`, {
      method: 'PUT',
      body,
    }),
  businesses: () => api<Paged<AdminBusiness>>('/admin/businesses?pageSize=50'),
  verifyBusiness: (id: string, approve: boolean) =>
    api<{ verificationStatus: string }>(`/admin/businesses/${id}/verify`, {
      method: 'POST',
      body: { approve },
    }),
  reports: (status = 'OPEN') => api<Paged<AdminReport>>(`/admin/reports?status=${status}`),
  resolveReport: (id: string, action: 'RESOLVE' | 'DISMISS') =>
    api<{ status: string }>(`/admin/reports/${id}/resolve`, { method: 'POST', body: { action } }),
  scoreConfig: () => api<ScoreConfig>('/admin/score-config'),
  updateScoreConfig: (weights: { features: number; userRating: number; atmosphere: number }) =>
    api<{ recalculated: number }>('/admin/score-config', { method: 'PATCH', body: weights }),
  auditLogs: () => api<Paged<AuditLogEntry>>('/admin/audit-logs?pageSize=50'),
};
