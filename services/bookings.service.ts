import { api } from './api';
import type { Booking, PaginatedResponse } from '../types';

interface CreateBookingData {
  courtId: string;
  startsAt: string;
  endsAt: string;
}

interface ReviewData {
  rating: number;
  comment?: string;
}

interface BookingFilters {
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}

export const bookingsService = {
  create: (data: CreateBookingData) =>
    api.post<Booking>('/bookings', data).then((r) => r.data),

  list: (filters?: BookingFilters) =>
    api.get<PaginatedResponse<Booking>>('/bookings', { params: filters }).then((r) => r.data),

  get: (id: string) => api.get<Booking>(`/bookings/${id}`).then((r) => r.data),

  update: (id: string, data: Partial<CreateBookingData>) =>
    api.patch<Booking>(`/bookings/${id}`, data).then((r) => r.data),

  cancel: (id: string, reason?: string) =>
    api.post(`/bookings/${id}/cancel`, { reason }).then((r) => r.data),

  review: (id: string, data: ReviewData) =>
    api.post(`/bookings/${id}/review`, data).then((r) => r.data),
};
