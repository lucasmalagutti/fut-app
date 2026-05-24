import { api } from './api';
import type { Card, PayMethod } from '../types';

interface CheckoutData {
  bookingId: string;
  method: PayMethod;
  cardId?: string;
}

interface CheckoutResponse {
  paymentId: string;
  /** Código copia-e-cola PIX (brcode) */
  qrCode?: string;
  /** URL da imagem PNG do QR Code gerado pelo Stripe */
  qrCodeUrl?: string;
}

interface PaymentStatus {
  status: 'pending' | 'paid' | 'refunded' | 'failed';
  paidAt: string | null;
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

  /** Polling: verifica se o pagamento PIX foi confirmado */
  getStatus: (paymentId: string) =>
    api.get<PaymentStatus>(`/payments/${paymentId}/status`).then((r) => r.data),

  /** Confirmação manual (cartão sem webhook) */
  confirmPayment: (id: string) =>
    api.post(`/payments/${id}/confirm`).then((r) => r.data),
};
