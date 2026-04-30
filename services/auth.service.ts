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
};
