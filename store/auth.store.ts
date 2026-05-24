import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { create } from 'zustand';
import type { User } from '../types';

// expo-secure-store não funciona no web — usar localStorage como fallback
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') return localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') { localStorage.setItem(key, value); return; }
    return SecureStore.setItemAsync(key, value);
  },
  async deleteItem(key: string): Promise<void> {
    if (Platform.OS === 'web') { localStorage.removeItem(key); return; }
    return SecureStore.deleteItemAsync(key);
  },
};

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isHydrated: boolean;

  signIn: (data: { user: User; accessToken: string; refreshToken: string }, remember?: boolean) => Promise<void>;
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

  signIn: async ({ user, accessToken, refreshToken }, remember = true) => {
    if (remember) {
      await storage.setItem('accessToken', accessToken);
      await storage.setItem('refreshToken', refreshToken);
      await storage.setItem('user', JSON.stringify(user));
    }
    set({ user, accessToken, refreshToken });
  },

  signOut: async () => {
    await storage.deleteItem('accessToken');
    await storage.deleteItem('refreshToken');
    await storage.deleteItem('user');
    set({ user: null, accessToken: null, refreshToken: null });
  },

  setUser: (user) => {
    storage.setItem('user', JSON.stringify(user));
    set({ user });
  },

  hydrate: async () => {
    set({ isLoading: true });
    try {
      const accessToken = await storage.getItem('accessToken');
      const refreshToken = await storage.getItem('refreshToken');
      const userJson = await storage.getItem('user');
      const user: User | null = userJson ? JSON.parse(userJson) : null;

      if (accessToken && refreshToken && user) {
        set({ accessToken, refreshToken, user });
      } else {
        // Tokens sem user: limpa tudo para forçar novo login
        await storage.deleteItem('accessToken');
        await storage.deleteItem('refreshToken');
        await storage.deleteItem('user');
      }
    } finally {
      set({ isLoading: false, isHydrated: true });
    }
  },
}));
