import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { router } from 'expo-router';
import { CalendarDays, Users } from 'lucide-react-native';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BookingCard } from '../../components/bookings/BookingCard';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { bookingsService } from '../../services/bookings.service';
import { mergeRefetch, usePullToRefresh } from '../../hooks/usePullToRefresh';
import { matchesService } from '../../services/matches.service';
import { colors, spacing } from '../../theme';
import type { Booking, Match } from '../../types';
import { formatCurrency, formatDate, formatTime } from '../../utils/format';

// ── Tipos unificados ──────────────────────────────────────────────────────────

type ItemType = 'booking' | 'match';

interface UnifiedItem {
  type: ItemType;
  id: string;
  sortDate: string;
  booking?: Booking;
  match?: Match;
}

// ── Filtros ───────────────────────────────────────────────────────────────────

type FilterKey = 'all' | 'bookings' | 'matches' | 'awaiting' | 'confirmed';

const FILTERS: { label: string; value: FilterKey }[] = [
  { label: 'Todas',               value: 'all'      },
  { label: 'Reservas',            value: 'bookings' },
  { label: 'Partidas',            value: 'matches'  },
  { label: 'Aguard. pagamento',   value: 'awaiting' },
  { label: 'Confirmadas',         value: 'confirmed'},
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAwaitingPayment(item: UnifiedItem): boolean {
  if (item.type === 'booking') {
    return item.booking?.status === 'pending';
  }
  // Partida: aguardando pagamento = quórum atingido mas participantes ainda joined/unpaid
  if (item.type === 'match') {
    const m = item.match!;
    const active = (m.participants ?? []).filter((p) => p.paymentStatus !== 'cancelled');
    const hasUnpaid = active.some((p) => p.paymentStatus === 'joined' || p.paymentStatus === 'unpaid');
    return hasUnpaid;
  }
  return false;
}

function isConfirmedItem(item: UnifiedItem): boolean {
  if (item.type === 'booking') {
    return item.booking?.status === 'confirmed' || item.booking?.status === 'completed';
  }
  if (item.type === 'match') {
    return !!item.match?.confirmedAt;
  }
  return false;
}

function applyFilter(items: UnifiedItem[], filter: FilterKey): UnifiedItem[] {
  switch (filter) {
    case 'bookings':  return items.filter((i) => i.type === 'booking');
    case 'matches':   return items.filter((i) => i.type === 'match');
    case 'awaiting':  return items.filter(isAwaitingPayment);
    case 'confirmed': return items.filter(isConfirmedItem);
    default:          return items;
  }
}

// ── MatchCard ─────────────────────────────────────────────────────────────────

function matchBadge(match: Match) {
  if (match.confirmedAt) return { label: 'Confirmada', variant: 'success' as const };
  if (match.closedAt)    return { label: 'Cancelada',  variant: 'error'   as const };
  return                        { label: 'Aberta',     variant: 'neutral' as const };
}

function MatchCard({ match, onPress }: { match: Match; onPress: () => void }) {
  const booking = match.booking;
  const { label, variant } = matchBadge(match);
  const totalSlots = match.totalSlots ?? 0;
  const estimatedQuota = match.estimatedQuota ?? 0;

  return (
    <Pressable onPress={onPress}>
      <Card>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.matchTypeRow}>
              <Users size={12} color={colors.primary[600]} />
              <Text style={styles.matchTypeLabel}>Partida · {match.sport}</Text>
            </View>
            <Text style={styles.courtName} numberOfLines={1}>
              {booking?.court?.name ?? 'Quadra'}
            </Text>
          </View>
          <Badge label={label} variant={variant} />
        </View>

        <View style={styles.infoBlock}>
          {booking?.startsAt && (
            <>
              <View style={styles.infoRow}>
                <CalendarDays size={13} color={colors.text.secondary} />
                <Text style={styles.infoText}>{formatDate(booking.startsAt)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Users size={13} color={colors.text.secondary} />
                <Text style={styles.infoText}>
                  {formatTime(booking.startsAt)} – {booking.endsAt ? formatTime(booking.endsAt) : ''}
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.matchFooter}>
          <Text style={styles.slotsText}>
            {totalSlots}/{match.maxPlayers} jogadores · mín. {match.minPlayers}
          </Text>
          {estimatedQuota > 0 && (
            <Text style={styles.quotaText}>{formatCurrency(estimatedQuota)}/jogador</Text>
          )}
        </View>
      </Card>
    </Pressable>
  );
}

// ── Tela principal ────────────────────────────────────────────────────────────

export default function BookingsScreen() {
  const [filter, setFilter] = useState<FilterKey>('all');

  const {
    data: bookingsData,
    isLoading: loadingBookings,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingsService.list(),
  });

  const {
    data: myMatches = [],
    isLoading: loadingMatches,
    refetch: refetchMatches,
  } = useQuery({
    queryKey: ['matches', 'mine'],
    queryFn: () => matchesService.findMine(),
  });

  const isLoading = loadingBookings || loadingMatches;

  const refetchAll = useCallback(
    () => mergeRefetch(refetchBookings, refetchMatches),
    [refetchBookings, refetchMatches],
  );
  const { refreshing, onRefresh } = usePullToRefresh(refetchAll);

  const bookings: Booking[] = bookingsData?.data ?? [];

  // Lista bruta unificada (sem filtro de tipo ainda)
  const allItems: UnifiedItem[] = [
    ...bookings.map((b): UnifiedItem => ({
      type: 'booking',
      id: b.id,
      sortDate: b.startsAt ?? b.createdAt,
      booking: b,
    })),
    ...myMatches.map((m): UnifiedItem => ({
      type: 'match',
      id: m.id,
      sortDate: m.booking?.startsAt ?? m.createdAt,
      match: m,
    })),
  ].sort((a, b) => (a.sortDate < b.sortDate ? 1 : -1));

  const filteredItems = applyFilter(allItems, filter);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Minhas Reservas</Text>
      </View>

      {/* Filtros — scroll horizontal */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => (
          <Chip
            key={f.value}
            label={f.label}
            selected={filter === f.value}
            onPress={() => setFilter(f.value)}
          />
        ))}
      </ScrollView>

      {isLoading ? (
        <LoadingSpinner />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={56} color={colors.neutral[400]} />}
          title="Sem itens"
          description="Nenhuma reserva ou partida encontrada nesta categoria."
          actionLabel="Buscar quadras"
          onAction={() => router.push('/(player)')}
        />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={({ item }) => {
            if (item.type === 'booking' && item.booking) {
              return (
                <BookingCard
                  booking={item.booking}
                  onPress={() =>
                    router.push({ pathname: '/(player)/booking/[id]', params: { id: item.id } })
                  }
                />
              );
            }
            if (item.type === 'match' && item.match) {
              return (
                <MatchCard
                  match={item.match}
                  onPress={() =>
                    router.push({ pathname: '/(player)/matches/[id]', params: { id: item.id } })
                  }
                />
              );
            }
            return null;
          }}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[600]} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: 26, fontWeight: '800', color: colors.text.primary },
  filterRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
  },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },

  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: spacing.sm },
  matchTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  matchTypeLabel: { fontSize: 11, fontWeight: '700', color: colors.primary[600], textTransform: 'uppercase', letterSpacing: 0.5 },
  courtName: { fontSize: 16, fontWeight: '700', color: colors.text.primary, flex: 1, marginRight: spacing.sm },
  infoBlock: { gap: spacing.xs, marginBottom: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: colors.text.secondary },
  matchFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  slotsText: { fontSize: 13, color: colors.text.secondary },
  quotaText: { fontSize: 14, fontWeight: '700', color: colors.primary[600] },
});
