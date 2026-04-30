import { api } from './api';
import type { Card, Payment, PayMethod } from '../types';

interface CheckoutData {
  bookingId: string;
  method: PayMethod;
  cardId?: string;
}

interface CheckoutResponse {
  paymentId: string;
  qrCode?: string;
  payment: Payment;
}

export const paymentsService = {
  listCards: () => api.get<Card[]>('/payments/cards').then((r) => r.data),

  addCard: (data: {
    number: string;
    holderName: string;
    expMonth: number;
    expYear: number;
    cvv: string;
  }) => api.post<Card>('/payments/cards', data).then((r) => r.data),

  deleteCard: (id: string) => api.delete(`/payments/cards/${id}`).then((r) => r.data),

  checkout: (data: CheckoutData) =>
    api.post<CheckoutResponse>('/payments/checkout', data).then((r) => r.data),

  confirmPayment: (id: string) =>
    api.post(`/payments/${id}/confirm`).then((r) => r.data),
};
