import { useQuery } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { CalendarDays, ChevronLeft } from 'lucide-react-native';
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
import { BookingCard } from '../../../components/bookings/BookingCard';
import { Chip } from '../../../components/ui/Chip';
import { EmptyState } from '../../../components/ui/EmptyState';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { usePullToRefresh } from '../../../hooks/usePullToRefresh';
import { bookingsService } from '../../../services/bookings.service';
import { colors, spacing } from '../../../theme';
import type { Booking } from '../../../types';

type FilterKey = 'all' | 'matches' | 'open' | 'confirmed' | 'completed' | 'cancelled';

const FILTERS: { label: string; value: FilterKey }[] = [
  { label: 'Todas',       value: 'all'       },
  { label: 'Partidas',    value: 'matches'   },
  { label: 'Abertas',     value: 'open'      },
  { label: 'Confirmadas', value: 'confirmed' },
  { label: 'Concluídas',  value: 'completed' },
  { label: 'Canceladas',  value: 'cancelled' },
];

function applyFilter(bookings: Booking[], filter: FilterKey): Booking[] {
  switch (filter) {
    case 'matches':
      return bookings.filter((b) => !!b.match);
    case 'open':
      return bookings.filter((b) => b.status === 'open' || b.status === 'pending');
    case 'confirmed':
      return bookings.filter((b) => b.status === 'confirmed');
    case 'completed':
      return bookings.filter((b) => b.status === 'completed');
    case 'cancelled':
      return bookings.filter((b) => b.status === 'cancelled');
    default:
      return bookings;
  }
}

export default function OwnerBookingsScreen() {
  const [filter, setFilter] = useState<FilterKey>('all');

  const { data: bookingsData, isLoading, refetch } = useQuery({
    queryKey: ['bookings', 'owner', 'all'],
    queryFn: () => bookingsService.list(),
  });

  const refetchList = useCallback(() => refetch(), [refetch]);
  const { refreshing, onRefresh } = usePullToRefresh(refetchList);

  const allBookings = bookingsData?.data ?? [];
  const filteredBookings = applyFilter(allBookings, filter);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text.primary} />
        </Pressable>
        <Text style={styles.title}>Histórico da Quadra</Text>
      </View>

      <Text style={styles.subtitle}>
        Todas as reservas e partidas que já passaram pelas suas quadras.
      </Text>

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
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={56} color={colors.neutral[400]} />}
          title="Sem registros"
          description="Nenhuma reserva ou partida encontrada nesta categoria."
        />
      ) : (
        <FlatList
          data={filteredBookings}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() =>
                router.push({ pathname: '/(owner)/bookings/[id]', params: { id: item.id } })
              }
            />
          )}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  backBtn: { padding: 4, marginLeft: -4 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text.primary, flex: 1 },
  subtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    lineHeight: 20,
  },
  filterRow: {
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    flexDirection: 'row',
  },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
});
