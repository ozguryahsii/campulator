import { useAuthStore } from '../store/authStore';

/**
 * API istemcisi. Geliştirmede Expo cihazından erişim için EXPO_PUBLIC_API_URL
 * ile makinenizin LAN adresini verin (ör. http://192.168.1.20:3399).
 */
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3399';

/** Multipart dosya yükleme (fotoğraflar) */
export async function apiUpload<T>(path: string, fileUri: string, mimeType: string): Promise<T> {
  const { accessToken } = useAuthStore.getState();
  const form = new FormData();
  // @ts-expect-error React Native FormData dosya nesnesi
  form.append('file', { uri: fileUri, type: mimeType, name: 'photo.jpg' });
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    body: form,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(
      response.status,
      typeof data?.message === 'string' ? data.message : 'UPLOAD_FAILED',
      data,
    );
  }
  return data as T;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly payload?: unknown,
  ) {
    super(code);
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

async function rawRequest<T>(path: string, options: RequestOptions, accessToken?: string) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.auth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const code = typeof data?.message === 'string' ? data.message : `HTTP_${response.status}`;
    throw new ApiError(response.status, code, data);
  }
  return data as T;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const store = useAuthStore.getState();
  try {
    return await rawRequest<T>(path, options, store.accessToken ?? undefined);
  } catch (error) {
    // Access token süresi dolduysa bir kez refresh dene
    if (error instanceof ApiError && error.status === 401 && options.auth && store.refreshToken) {
      const refreshed = await store.tryRefresh();
      if (refreshed) {
        return rawRequest<T>(path, options, useAuthStore.getState().accessToken ?? undefined);
      }
    }
    throw error;
  }
}

export interface AuthUserPayload {
  id: string;
  email: string | null;
  displayName: string;
  emailVerified: boolean;
  role: string;
  trustLevel: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
  user: AuthUserPayload;
}

export const authApi = {
  register: (body: {
    email: string;
    password: string;
    displayName: string;
    locale: string;
    acceptedConsents: string[];
    marketingConsent: boolean;
  }) => rawRequest<AuthResponse>('/auth/register', { method: 'POST', body }),
  login: (body: { email: string; password: string }) =>
    rawRequest<AuthResponse>('/auth/login', { method: 'POST', body }),
  refresh: (refreshToken: string) =>
    rawRequest<AuthResponse>('/auth/refresh', { method: 'POST', body: { refreshToken } }),
  logout: (refreshToken: string) =>
    rawRequest<{ loggedOut: boolean }>('/auth/logout', { method: 'POST', body: { refreshToken } }),
  resendVerification: (email: string) =>
    rawRequest<{ sent: boolean }>('/auth/resend-verification', { method: 'POST', body: { email } }),
};
