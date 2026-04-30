import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isHydrated: boolean;

  signIn: (data: { user: User; accessToken: string; refreshToken: string }) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  isHydrated: false,

  signIn: async ({ user, accessToken, refreshToken }) => {
    await SecureStore.setItemAsync('accessToken', accessToken);
    await SecureStore.setItemAsync('refreshToken', refreshToken);
    set({ user, accessToken, refreshToken });
  },

  signOut: async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    set({ user: null, accessToken: null, refreshToken: null });
  },

  setUser: (user) => set({ user }),

  hydrate: async () => {
    set({ isLoading: true });
    try {
      const accessToken = await SecureStore.getItemAsync('accessToken');
      const refreshToken = await SecureStore.getItemAsync('refreshToken');
      if (accessToken && refreshToken) {
        set({ accessToken, refreshToken });
      }
    } finally {
      set({ isLoading: false, isHydrated: true });
    }
  },
}));
