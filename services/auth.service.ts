import { api } from './api';
import type { AuthResponse, User } from '../types';

interface SignupData {
  name: string;
  email: string;
  password: string;
  role: 'player' | 'owner';
  phone?: string;
}

interface LoginData {
  email: string;
  password: string;
  keepConnected?: boolean;
}

export const authService = {
  signup: (data: SignupData) =>
    api.post<AuthResponse>('/auth/signup', data).then((r) => r.data),

  login: (data: LoginData) =>
    api.post<AuthResponse>('/auth/login', data).then((r) => r.data),

  refresh: (refreshToken: string) =>
    api.post<AuthResponse>('/auth/refresh', { refreshToken }).then((r) => r.data),

  logout: () => api.post('/auth/logout').then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }).then((r) => r.data),

  resetPassword: (data: { token: string; password: string; confirmPassword: string }) =>
    api.post('/auth/reset-password', data).then((r) => r.data),

  getMe: () => api.get<User>('/me').then((r) => r.data),

  updateMe: (data: Partial<Pick<User, 'name' | 'phone' | 'avatarUrl'>>) =>
    api.patch<User>('/me', data).then((r) => r.data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/me/change-password', data).then((r) => r.data),

  deleteAccount: (password: string) =>
    api.delete('/me', { data: { password } }).then((r) => r.data),

  uploadAvatar: async (imageUri: string, mimeType?: string): Promise<User> => {
    // fetch nativo — axios não gerencia boundary do multipart corretamente no React Native
    const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
    const { useAuthStore } = await import('../store/auth.store');
    const token = useAuthStore.getState().accessToken;

    // Derivar filename e tipo a partir da URI
    const uriParts = imageUri.split('/');
    const rawName = uriParts[uriParts.length - 1] ?? 'avatar.jpg';
    // URIs do expo podem ter query params: ex "ImagePicker/xxx.jpg?..."
    const filename = rawName.split('?')[0] || 'avatar.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', webp: 'image/webp',
      heic: 'image/heic', heif: 'image/heif',
    };
    // Prefer mimeType passado pelo caller (do asset.mimeType do expo-image-picker)
    const type = mimeType ?? mimeMap[ext] ?? 'image/jpeg';

    const formData = new FormData();
    // React Native trata o append de objetos com uri/name/type como blob de arquivo
    formData.append('file', { uri: imageUri, name: filename, type } as any);

    const res = await fetch(`${API_URL}/me/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      // NÃO setar Content-Type manualmente — fetch define o boundary automaticamente
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any)?.message ?? 'Erro ao fazer upload');
    }

    return res.json() as Promise<User>;
  },
};
