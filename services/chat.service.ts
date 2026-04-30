import { api } from './api';
import type { ChatMessage, ChatThread } from '../types';

export const chatService = {
  listThreads: () => api.get<ChatThread[]>('/chat/threads').then((r) => r.data),

  getMessages: (threadId: string, params?: { page?: number; limit?: number }) =>
    api.get<ChatMessage[]>(`/chat/threads/${threadId}/messages`, { params }).then((r) => r.data),

  sendMessage: (threadId: string, body: string) =>
    api.post<ChatMessage>(`/chat/threads/${threadId}/messages`, { body }).then((r) => r.data),

  startThread: (userId: string) =>
    api.post<ChatThread>('/chat/threads', { userId }).then((r) => r.data),
};
