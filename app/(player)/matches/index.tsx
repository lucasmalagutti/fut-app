import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Users } from 'lucide-react-native';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { bookingsService } from '../../../services/bookings.service';
import { colors, spacing } from '../../../theme';
import { formatDate, formatTime, formatCurrency } from '../../../utils/format';

export default function MatchesScreen() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bookings', 'completed'],
    queryFn: () => bookingsService.list({ status: 'completed' }),
  });

  const completedBookings = data?.data ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Partidas</Text>
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : completedBookings.length === 0 ? (
        <EmptyState
          icon={<Users size={56} color={colors.neutral[400]} />}
          title="Nenhuma partida"
          description="Reserve uma quadra para criar uma partida e convidar jogadores."
          actionLabel="Buscar quadras"
          onAction={() => router.push('/(player)')}
        />
      ) : (
        <FlatList
          data={completedBookings}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => (
            <Card style={styles.matchCard}>
              <View style={styles.matchHeader}>
                <Text style={styles.courtName}>{item.court?.name ?? 'Quadra'}</Text>
                <Badge label="Concluída" variant="success" />
              </View>
              <Text style={styles.matchDate}>
                {formatDate(item.startsAt)} · {formatTime(item.startsAt)} – {formatTime(item.endsAt)}
              </Text>
              <Text style={styles.matchPrice}>{formatCurrency(item.totalPrice)}</Text>
            </Card>
          )}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: 26, fontWeight: '800', color: colors.text.primary },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  matchCard: { gap: spacing.xs },
  matchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  courtName: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  matchDate: { fontSize: 13, color: colors.text.secondary },
  matchPrice: { fontSize: 15, fontWeight: '700', color: colors.primary[600] },
});
