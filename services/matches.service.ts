import { api } from './api';
import type { Match, MatchInvite } from '../types';

export const matchesService = {
  create: (data: {
    bookingId: string;
    sport: string;
    slots: number;
    pricePerPlayer: number;
    isPublic?: boolean;
  }) => api.post<Match>('/matches', data).then((r) => r.data),

  get: (id: string) => api.get<Match>(`/matches/${id}`).then((r) => r.data),

  invite: (matchId: string, userIds: string[]) =>
    api.post<MatchInvite[]>(`/matches/${matchId}/invite`, { userIds }).then((r) => r.data),

  respond: (matchId: string, status: 'accepted' | 'declined') =>
    api.post(`/matches/${matchId}/respond`, { status }).then((r) => r.data),

  checkIn: (matchId: string) =>
    api.post(`/matches/${matchId}/check-in`).then((r) => r.data),

  leave: (matchId: string) =>
    api.post(`/matches/${matchId}/leave`).then((r) => r.data),
};
