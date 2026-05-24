import { api } from './api';
import type { Court, CourtBlock, CourtFilters, CourtSchedule, PaginatedResponse, Review, TimeSlot } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

/** Converte URL relativa (/storage/...) em absoluta */
export function resolvePhotoUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
}

export const courtsService = {
  list: (filters?: CourtFilters) =>
    api.get<PaginatedResponse<Court>>('/courts', { params: filters }).then((r) => r.data),

  // Backend retorna Court[] diretamente (sem wrapper de paginação)
  listAll: (filters?: CourtFilters) =>
    api.get<Court[]>('/courts', { params: filters }).then((r) => r.data),

  listByOwner: (ownerId: string) =>
    api.get<Court[]>('/courts', { params: { ownerId } }).then((r) => r.data),

  get: (id: string) => api.get<Court>(`/courts/${id}`).then((r) => r.data),

  create: (data: Partial<Court>) =>
    api.post<Court>('/courts', data).then((r) => r.data),

  update: (id: string, data: Partial<Court>) =>
    api.patch<Court>(`/courts/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/courts/${id}`).then((r) => r.data),

  uploadPhoto: async (id: string, imageUri: string, mimeType?: string): Promise<void> => {
    const { useAuthStore } = await import('../store/auth.store');
    const token = useAuthStore.getState().accessToken;

    const uriParts = imageUri.split('/');
    const rawName = uriParts[uriParts.length - 1] ?? 'photo.jpg';
    const filename = rawName.split('?')[0] || 'photo.jpg';
    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg',
      png: 'image/png', webp: 'image/webp',
      heic: 'image/heic', heif: 'image/heif',
    };
    const type = mimeType ?? mimeMap[ext] ?? 'image/jpeg';

    const formData = new FormData();
    formData.append('file', { uri: imageUri, name: filename, type } as any);

    const res = await fetch(`${API_URL}/courts/${id}/photos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any)?.message ?? 'Erro ao fazer upload');
    }
  },

  removePhoto: (courtId: string, photoId: string) =>
    api.delete(`/courts/${courtId}/photos/${photoId}`).then((r) => r.data),

  getAvailability: (id: string, date: string) =>
    api.get<{
      date: string;
      open: boolean;
      openTime: string | null;
      closeTime: string | null;
      pricePerHour: number;
      unavailable: { startsAt: string; endsAt: string; reason: 'block' | 'booking' }[];
    }>(`/courts/${id}/availability`, { params: { date } }).then((r) => r.data),

  addBlock: (id: string, data: Partial<CourtBlock>) =>
    api.post(`/courts/${id}/blocks`, data).then((r) => r.data),

  getBlocks: (id: string) =>
    api.get<CourtBlock[]>(`/courts/${id}/blocks`).then((r) => r.data),

  removeBlock: (courtId: string, blockId: string) =>
    api.delete(`/courts/${courtId}/blocks/${blockId}`).then((r) => r.data),

  removeSchedule: (courtId: string, scheduleId: string) =>
    api.delete(`/courts/${courtId}/schedules/${scheduleId}`).then((r) => r.data),

  addSchedule: (courtId: string, data: { dayOfWeek: number; openTime: string; closeTime: string; slotMinutes: number; basePrice: number }) =>
    api.post(`/courts/${courtId}/schedules`, data).then((r) => r.data),

  getSchedules: (id: string) =>
    api.get<CourtSchedule[]>(`/courts/${id}/schedules`).then((r) => r.data),

  upsertSchedule: (id: string, data: Partial<CourtSchedule>[]) =>
    api.put(`/courts/${id}/schedules`, data).then((r) => r.data),

  getReviews: (id: string) =>
    api.get<Review[]>(`/courts/${id}/reviews`).then((r) => r.data),
};
