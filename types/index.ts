export type Role = 'player' | 'owner' | 'master';
export type UserStatus = 'active' | 'inactive' | 'banned' | 'deleted';
export type CourtStatus = 'active' | 'inactive';
export type BookingStatus = 'open' | 'pending' | 'confirmed' | 'completed' | 'cancelled';
export type InviteStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';
export type PartStatus = 'joined' | 'paid' | 'unpaid' | 'checked_in' | 'cancelled';
export type PayMethod = 'card' | 'pix' | 'wallet';
export type PayStatus = 'pending' | 'paid' | 'refunded' | 'failed';
export type TxType = 'booking_charge' | 'payout' | 'refund' | 'fee' | 'adjustment' | 'deposit';
export type TxStatus = 'pending' | 'completed' | 'failed';
export type ReportStatus = 'open' | 'reviewed' | 'closed';

export interface User {
  id: string;
  role: Role;
  name: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  status: UserStatus;
  banReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Court {
  id: string;
  ownerId: string;
  name: string;
  sport: string;
  description?: string;
  addressLine: string;
  city: string;
  state: string;
  zip: string;
  latitude: number;
  longitude: number;
  amenities: string[];
  rules?: string;
  mapsUrl?: string;
  status: CourtStatus;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
  photos?: CourtPhoto[];
  schedules?: CourtSchedule[];
  owner?: User;
  distance?: number;
}

export interface CourtPhoto {
  id: string;
  courtId: string;
  url: string;
  position: number;
}

export interface CourtSchedule {
  id: string;
  courtId: string;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
  slotMinutes: number;
  basePrice: number;
}

export interface CourtBlock {
  id: string;
  courtId: string;
  startsAt: string;
  endsAt: string;
  reason?: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
  price: number;
}

export interface Booking {
  id: string;
  courtId: string;
  playerId: string;
  startsAt: string;
  endsAt: string;
  totalPrice: number;
  status: BookingStatus;
  cancellationReason?: string;
  createdAt: string;
  court?: Court;
  player?: User;
  payment?: Payment;
  review?: Review;
  match?: Match;
}

export interface Match {
  id: string;
  bookingId: string;
  hostId: string;
  sport: string;
  minPlayers: number;
  maxPlayers: number;
  isPublic: boolean;
  closedAt?: string;
  confirmedAt?: string;
  createdAt: string;
  booking?: Booking;
  host?: User;
  participants?: MatchParticipant[];
  invites?: MatchInvite[];
  estimatedQuota?: number;
  totalSlots?: number;
}

export interface MatchInvite {
  id: string;
  matchId: string;
  fromId: string;
  toId: string;
  status: InviteStatus;
  createdAt: string;
  from?: User;
  to?: User;
}

export interface MatchParticipant {
  id: string;
  matchId: string;
  userId: string;
  guestName?: string;
  slots: number;
  quota?: number;
  paymentStatus: PartStatus;
  paymentId?: string;
  preferredPayMethod?: PayMethod;
  preferredCardId?: string;
  user?: User;
}

export interface MatchPaymentPreference {
  preferredPayMethod: 'wallet' | 'card';
  preferredCardId?: string;
}

export interface Card {
  id: string;
  userId: string;
  brand: string;
  last4: string;
  holderName: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

export interface BankAccount {
  id: string;
  userId: string;
  holderName: string;
  document: string;
  bank: string;
  agency: string;
  accountNumber: string;
  accountType: string;
  pixKey?: string;
}

export interface Wallet {
  id?: string;
  userId?: string;
  balance: number;
  pendingBalance?: number;
  availableBalance?: number;
  updatedAt?: string;
  txs?: Transaction[];
}

export interface Transaction {
  id: string;
  walletId: string;
  type: TxType;
  bookingId?: string;
  amount: number;
  status: TxStatus;
  gatewayRef?: string;
  createdAt: string;
  booking?: Booking;
}

export interface Payment {
  id: string;
  bookingId: string;
  method: PayMethod;
  gatewayRef: string;
  qrCode?: string;
  amount: number;
  fee: number;
  status: PayStatus;
  paidAt?: string;
  createdAt: string;
}

export interface Payout {
  id: string;
  ownerId: string;
  bankAccountId: string;
  amount: number;
  status: TxStatus;
  gatewayRef?: string;
  createdAt: string;
  /** Mensagem mock de confirmação (saque imediato) */
  message?: string;
}

export interface Review {
  id: string;
  bookingId: string;
  fromId: string;
  courtId: string;
  rating: number;
  comment?: string;
  createdAt: string;
  from?: User;
}

export interface ChatThread {
  id: string;
  userAId: string;
  userBId: string;
  lastMessageAt?: string;
  createdAt: string;
  userA?: User;
  userB?: User;
  lastMessage?: ChatMessage;
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  readAt?: string;
  createdAt: string;
  sender?: User;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  description?: string;
  status: ReportStatus;
  resolutionNote?: string;
  resolvedById?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  payload: Record<string, unknown>;
  readAt?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface CourtFilters {
  lat?: number;
  lng?: number;
  radius?: number;
  sport?: string;
  date?: string;
  priceMin?: number;
  priceMax?: number;
  ratingMin?: number;
  q?: string;
  page?: number;
  limit?: number;
}
