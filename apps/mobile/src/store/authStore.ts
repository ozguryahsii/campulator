import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import type { AuthResponse, AuthUserPayload } from '../api/client';

const REFRESH_KEY = 'campulator.refreshToken';
const ONBOARD_KEY = 'campulator.onboarded';
const LANGUAGE_KEY = 'campulator.language';

interface AuthState {
  hydrated: boolean;
  language: 'tr' | 'en' | null;
  onboarded: boolean;
  isGuest: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUserPayload | null;

  hydrate: () => Promise<void>;
  setLanguage: (language: 'tr' | 'en') => Promise<void>;
  completeOnboarding: () => Promise<void>;
  continueAsGuest: () => void;
  setSession: (response: AuthResponse) => Promise<void>;
  tryRefresh: () => Promise<boolean>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  hydrated: false,
  language: null,
  onboarded: false,
  isGuest: false,
  accessToken: null,
  refreshToken: null,
  user: null,

  hydrate: async () => {
    const [language, onboarded, refreshToken] = await Promise.all([
      AsyncStorage.getItem(LANGUAGE_KEY),
      AsyncStorage.getItem(ONBOARD_KEY),
      SecureStore.getItemAsync(REFRESH_KEY),
    ]);
    set({
      language: language === 'en' || language === 'tr' ? language : null,
      onboarded: onboarded === '1',
      refreshToken,
      hydrated: true,
    });
    if (refreshToken) {
      await get().tryRefresh();
    }
  },

  setLanguage: async (language) => {
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
    set({ language });
  },

  completeOnboarding: async () => {
    await AsyncStorage.setItem(ONBOARD_KEY, '1');
    set({ onboarded: true });
  },

  continueAsGuest: () => set({ isGuest: true }),

  setSession: async (response) => {
    await SecureStore.setItemAsync(REFRESH_KEY, response.refreshToken);
    set({
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
      isGuest: false,
    });
  },

  tryRefresh: async () => {
    const { refreshToken } = get();
    if (!refreshToken) return false;
    try {
      const { authApi } = await import('../api/client');
      const response = await authApi.refresh(refreshToken);
      await get().setSession(response);
      return true;
    } catch {
      await SecureStore.deleteItemAsync(REFRESH_KEY);
      set({ accessToken: null, refreshToken: null, user: null });
      return false;
    }
  },

  signOut: async () => {
    const { refreshToken } = get();
    if (refreshToken) {
      try {
        const { authApi } = await import('../api/client');
        await authApi.logout(refreshToken);
      } catch {
        // ağ hatasında yerel oturum yine de kapanır
      }
    }
    await SecureStore.deleteItemAsync(REFRESH_KEY);
    set({ accessToken: null, refreshToken: null, user: null, isGuest: false });
  },
}));
