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
  upcoming?: boolean;
}

export const bookingsService = {
  create: (data: CreateBookingData) =>
    api.post<Booking>('/bookings', data).then((r) => r.data),

  list: (filters?: BookingFilters) =>
    api.get<Booking[] | PaginatedResponse<Booking>>('/bookings', {
      params: filters
        ? {
            ...filters,
            ...(filters.upcoming !== undefined && { upcoming: String(filters.upcoming) }),
          }
        : undefined,
    }).then((r) => {
      const payload = r.data;
      if (Array.isArray(payload)) {
        return { data: payload, total: payload.length, page: 1, limit: payload.length };
      }
      return payload;
    }),

  get: (id: string) => api.get<Booking>(`/bookings/${id}`).then((r) => r.data),

  update: (id: string, data: Partial<CreateBookingData>) =>
    api.patch<Booking>(`/bookings/${id}`, data).then((r) => r.data),

  cancel: (id: string, reason?: string) =>
    api.post(`/bookings/${id}/cancel`, { reason }).then((r) => r.data),

  review: (id: string, data: ReviewData) =>
    api.post(`/bookings/${id}/review`, data).then((r) => r.data),
};
