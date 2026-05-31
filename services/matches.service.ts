import { api } from './api';
import type { Match, MatchParticipant, MatchPaymentPreference } from '../types';

export const matchesService = {
  // Criar partida a partir de uma reserva
  create: (data: {
    bookingId: string;
    sport: string;
    minPlayers: number;
    maxPlayers: number;
    isPublic?: boolean;
    payment: MatchPaymentPreference;
  }) => api.post<Match>('/matches', data).then((r) => r.data),

  // Listar partidas abertas
  findOpen: (params?: { courtId?: string; date?: string }) =>
    api.get<Match[]>('/matches/open', { params }).then((r) => r.data),

  // Minhas partidas
  findMine: () => api.get<Match[]>('/matches/mine').then((r) => r.data),

  // Detalhes de uma partida
  get: (id: string) =>
    api.get<Match & { estimatedQuota: number; totalSlots: number }>(`/matches/${id}`).then((r) => r.data),

  // Ingressar na partida
  join: (matchId: string, data: { payment: MatchPaymentPreference; guestName?: string }) =>
    api.post<MatchParticipant>(`/matches/${matchId}/join`, data).then((r) => r.data),

  // Sair da partida
  leave: (matchId: string) =>
    api.post(`/matches/${matchId}/leave`).then((r) => r.data),

  // Convidar jogadores
  invite: (matchId: string, toIds: string[]) =>
    api.post(`/matches/${matchId}/invite`, { toIds }).then((r) => r.data),

  // Responder convite
  respond: (
    matchId: string,
    data: {
      inviteId: string;
      status: 'accepted' | 'declined';
      payment?: MatchPaymentPreference;
      guestName?: string;
    },
  ) => api.post(`/matches/${matchId}/respond`, data).then((r) => r.data),

  // Check-in
  checkIn: (matchId: string) =>
    api.post(`/matches/${matchId}/check-in`).then((r) => r.data),

  // Cancelar partida (apenas host, apenas se nao confirmada)
  cancel: (matchId: string) =>
    api.delete(`/matches/${matchId}`).then((r) => r.data),
};
