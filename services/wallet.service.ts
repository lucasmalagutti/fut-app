import { api } from './api';
import type { BankAccount, Payout, Transaction, Wallet } from '../types';

interface PayoutData {
  bankAccountId: string;
  amount: number;
}

export const walletService = {
  get: () => api.get<Wallet>('/wallet').then((r) => r.data),

  getTransactions: (params?: { page?: number; limit?: number }) =>
    api.get<Transaction[]>('/wallet/transactions', { params }).then((r) => r.data),

  listBankAccounts: () => api.get<BankAccount[]>('/wallet/bank-accounts').then((r) => r.data),

  addBankAccount: (data: Omit<BankAccount, 'id' | 'userId'>) =>
    api.post<BankAccount>('/wallet/bank-accounts', data).then((r) => r.data),

  deleteBankAccount: (id: string) =>
    api.delete(`/wallet/bank-accounts/${id}`).then((r) => r.data),

  requestPayout: (data: PayoutData) =>
    api.post<Payout>('/wallet/payouts', data).then((r) => r.data),

  listPayouts: () => api.get<Payout[]>('/wallet/payouts').then((r) => r.data),
};
