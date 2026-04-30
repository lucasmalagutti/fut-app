import { api } from './api';
import type { PaginatedResponse, User } from '../types';

export const usersService = {
  list: (params?: { q?: string; page?: number; limit?: number }) =>
    api.get<PaginatedResponse<User>>('/users', { params }).then((r) => r.data),

  get: (id: string) => api.get<User>(`/users/${id}`).then((r) => r.data),

  report: (data: { reportedUserId: string; reason: string; description?: string }) =>
    api.post('/reports', data).then((r) => r.data),
};
