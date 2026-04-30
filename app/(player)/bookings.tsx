import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CalendarDays } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { BookingCard } from '../../components/bookings/BookingCard';
import { Chip } from '../../components/ui/Chip';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { bookingsService } from '../../services/bookings.service';
import { colors, spacing } from '../../theme';

const STATUSES = [
  { label: 'Todas', value: undefined },
  { label: 'Próximas', value: 'confirmed' },
  { label: 'Pendentes', value: 'pending' },
  { label: 'Concluídas', value: 'completed' },
  { label: 'Canceladas', value: 'cancelled' },
];

export default function BookingsScreen() {
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bookings', selectedStatus],
    queryFn: () => bookingsService.list({ status: selectedStatus }),
  });

  const bookings = data?.data ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Minhas Reservas</Text>
      </View>

      <View style={styles.filterRow}>
        {STATUSES.map((s) => (
          <Chip
            key={s.label}
            label={s.label}
            selected={selectedStatus === s.value}
            onPress={() => setSelectedStatus(s.value)}
          />
        ))}
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : bookings.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={56} color={colors.neutral[400]} />}
          title="Sem reservas"
          description="Você ainda não tem reservas nesta categoria."
          actionLabel="Buscar quadras"
          onAction={() => router.push('/(player)')}
        />
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(b) => b.id}
          renderItem={({ item }) => (
            <BookingCard
              booking={item}
              onPress={() =>
                router.push({ pathname: '/(player)/booking/[id]', params: { id: item.id } })
              }
            />
          )}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: 26, fontWeight: '800', color: colors.text.primary },
  filterRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    flexWrap: 'nowrap',
  },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
});
