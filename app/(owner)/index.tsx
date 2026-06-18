import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { TrendingUp } from 'lucide-react-native';
import { useCallback } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RefreshableScrollView } from '../../components/ui/RefreshableScrollView';
import { mergeRefetch, usePullToRefresh } from '../../hooks/usePullToRefresh';
import { BookingCard } from '../../components/bookings/BookingCard';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { bookingsService } from '../../services/bookings.service';
import { walletService } from '../../services/wallet.service';
import { useAuthStore } from '../../store/auth.store';
import { colors, spacing } from '../../theme';
import { formatCurrency } from '../../utils/format';

export default function OwnerDashboardScreen() {
  const user = useAuthStore((s) => s.user);

  const { data: wallet, refetch: refetchWallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletService.get(),
  });

  const { data: bookingsData, isLoading, refetch: refetchBookings } = useQuery({
    queryKey: ['bookings', 'owner', 'upcoming'],
    queryFn: () => bookingsService.list({ upcoming: true }),
  });

  const refetchAll = useCallback(
    () => mergeRefetch(refetchWallet, refetchBookings),
    [refetchWallet, refetchBookings],
  );
  const { refreshing, onRefresh } = usePullToRefresh(refetchAll);

  const upcomingBookings = bookingsData?.data ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <RefreshableScrollView showsVerticalScrollIndicator={false} refreshing={refreshing} onRefresh={onRefresh}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Olá, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.subTitle}>Painel do Dono</Text>
        </View>

        {/* Stats cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statsRow}
        >
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Saldo disponível</Text>
            <Text style={styles.statValue}>{formatCurrency(wallet?.balance ?? 0)}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Próximas reservas</Text>
            <Text style={styles.statValue}>{upcomingBookings.length}</Text>
          </Card>
        </ScrollView>

        {/* Upcoming bookings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Próximas Reservas e Partidas</Text>
            <Text
              style={styles.seeAll}
              onPress={() => router.push('/(owner)/bookings')}
            >
              Ver todas
            </Text>
          </View>

          {isLoading ? (
            <LoadingSpinner size="small" />
          ) : upcomingBookings.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>Nenhuma reserva ou partida agendada nas suas quadras.</Text>
            </Card>
          ) : (
            <View style={styles.bookingsList}>
              {upcomingBookings.slice(0, 5).map((booking) => (
                <BookingCard
                  key={booking.id}
                  booking={booking}
                  onPress={() =>
                    router.push({ pathname: '/(owner)/bookings/[id]', params: { id: booking.id } })
                  }
                />
              ))}
            </View>
          )}
        </View>
      </RefreshableScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  greeting: { fontSize: 26, fontWeight: '800', color: colors.text.primary },
  subTitle: { fontSize: 14, color: colors.text.secondary, marginTop: 2 },
  statsRow: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.md },
  statCard: { minWidth: 160, gap: 4 },
  statLabel: { fontSize: 12, color: colors.text.secondary },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.primary[600] },
  section: { padding: spacing.lg, gap: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  seeAll: { fontSize: 14, color: colors.primary[600], fontWeight: '600' },
  bookingsList: { gap: spacing.md },
  emptyCard: { alignItems: 'center' },
  emptyText: { fontSize: 14, color: colors.text.secondary },
});
