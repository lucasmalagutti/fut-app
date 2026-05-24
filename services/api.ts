import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/auth.store';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

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

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((p) => {
    if (token) p.resolve(token);
    else p.reject(error);
  });
  failedQueue = [];
}

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // Prioridade: token em memória no store (cobre remember=false)
  // Fallback: storage persistido (cobre reload do app com remember=true)
  const storeToken = useAuthStore.getState().accessToken;
  const token = storeToken ?? await storage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      // Prioridade: refresh token em memória, fallback storage
      const storeRefresh = useAuthStore.getState().refreshToken;
      const refreshToken = storeRefresh ?? await storage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token');

      const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });

      // Atualiza store em memória
      useAuthStore.getState().signIn(
        { user: useAuthStore.getState().user!, accessToken: data.accessToken, refreshToken: data.refreshToken },
        false, // não força persistência aqui — respeita a escolha original do usuário
      );

      // Persiste no storage se já havia token salvo (usuário tinha remember=true)
      const hadStoredToken = await storage.getItem('accessToken');
      if (hadStoredToken) {
        await storage.setItem('accessToken', data.accessToken);
        await storage.setItem('refreshToken', data.refreshToken);
      }

      original.headers.Authorization = `Bearer ${data.accessToken}`;
      processQueue(null, data.accessToken);
      return api(original);
    } catch (err) {
      processQueue(err, null);
      await storage.deleteItem('accessToken');
      await storage.deleteItem('refreshToken');
      await useAuthStore.getState().signOut();
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);
