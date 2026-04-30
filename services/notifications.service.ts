import { api } from './api';
import type { Notification } from '../types';

export const notificationsService = {
  list: () => api.get<Notification[]>('/notifications').then((r) => r.data),

  readAll: () => api.post('/notifications/read-all').then((r) => r.data),

  registerDevice: (expoToken: string, platform: string) =>
    api.post('/notifications/devices', { expoToken, platform }).then((r) => r.data),
};
