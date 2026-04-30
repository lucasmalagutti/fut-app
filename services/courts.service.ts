import { api } from './api';
import type { Court, CourtBlock, CourtFilters, CourtSchedule, PaginatedResponse, Review, TimeSlot } from '../types';

export const courtsService = {
  list: (filters?: CourtFilters) =>
    api.get<PaginatedResponse<Court>>('/courts', { params: filters }).then((r) => r.data),

  get: (id: string) => api.get<Court>(`/courts/${id}`).then((r) => r.data),

  create: (data: Partial<Court>) =>
    api.post<Court>('/courts', data).then((r) => r.data),

  update: (id: string, data: Partial<Court>) =>
    api.patch<Court>(`/courts/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/courts/${id}`).then((r) => r.data),

  uploadPhoto: (id: string, formData: FormData) =>
    api.post(`/courts/${id}/photos`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((r) => r.data),

  getAvailability: (id: string, date: string): Promise<TimeSlot[]> =>
    api.get(`/courts/${id}/availability`, { params: { date } }).then((r) => r.data),

  addBlock: (id: string, data: Partial<CourtBlock>) =>
    api.post(`/courts/${id}/blocks`, data).then((r) => r.data),

  getBlocks: (id: string) =>
    api.get<CourtBlock[]>(`/courts/${id}/blocks`).then((r) => r.data),

  removeBlock: (courtId: string, blockId: string) =>
    api.delete(`/courts/${courtId}/blocks/${blockId}`).then((r) => r.data),

  getSchedules: (id: string) =>
    api.get<CourtSchedule[]>(`/courts/${id}/schedules`).then((r) => r.data),

  upsertSchedule: (id: string, data: Partial<CourtSchedule>[]) =>
    api.put(`/courts/${id}/schedules`, data).then((r) => r.data),

  getReviews: (id: string) =>
    api.get<Review[]>(`/courts/${id}/reviews`).then((r) => r.data),
};
