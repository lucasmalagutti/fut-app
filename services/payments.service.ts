import { api } from './api';
import type { Card, PayMethod } from '../types';

interface CheckoutData {
  bookingId: string;
  method: PayMethod;
  cardId?: string;
}

interface ParticipantCheckoutData {
  method: PayMethod;
  cardId?: string;
}

interface CheckoutResponse {
  paymentId: string;
  qrCode?: string;
  qrCodeUrl?: string;
}

interface PaymentStatus {
  status: 'pending' | 'paid' | 'refunded' | 'failed';
  paidAt: string | null;
}

export const paymentsService = {
  createSetupIntent: () =>
    api.post<{ clientSecret: string; customerId: string }>('/payments/cards/setup-intent').then((r) => r.data),

  attachCard: (paymentMethodId: string) =>
    api.post<Card>('/payments/cards/attach', { paymentMethodId }).then((r) => r.data),

  /** Cria cartão Visa 4242 no Stripe (modo test) e salva na conta */
  attachTestCard: () => api.post<Card>('/payments/cards/test').then((r) => r.data),

  listCards: () => api.get<Card[]>('/payments/cards').then((r) => r.data),

  addCard: (data: {
    providerToken: string;
    brand: string;
    last4: string;
    holderName: string;
    expMonth: number;
    expYear: number;
  }) => api.post<Card>('/payments/cards', data).then((r) => r.data),

  setDefaultCard: (id: string) =>
    api.patch<Card>(`/payments/cards/${id}/default`).then((r) => r.data),

  deleteCard: (id: string) => api.delete(`/payments/cards/${id}`).then((r) => r.data),

  topUpWallet: (amount: number) =>
    api.post<CheckoutResponse>('/payments/wallet/top-up', { amount }).then((r) => r.data),

  checkout: (data: CheckoutData) =>
    api.post<CheckoutResponse>('/payments/checkout', data).then((r) => r.data),

  checkoutParticipant: (participantId: string, data: ParticipantCheckoutData) =>
    api
      .post<CheckoutResponse>(`/payments/participants/${participantId}/checkout`, data)
      .then((r) => r.data),

  getStatus: (paymentId: string) =>
    api.get<PaymentStatus>(`/payments/${paymentId}/status`).then((r) => r.data),

  confirmPayment: (id: string) =>
    api.post(`/payments/${id}/confirm`).then((r) => r.data),
};
