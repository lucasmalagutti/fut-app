import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Calendar, ChevronLeft, Clock, MapPin, Users } from 'lucide-react-native';
import { useCallback } from 'react';
import { Alert, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { RefreshableScrollView } from '../../../components/ui/RefreshableScrollView';
import { usePullToRefresh } from '../../../hooks/usePullToRefresh';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge, bookingStatusBadge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { bookingsService } from '../../../services/bookings.service';
import { colors, spacing } from '../../../theme';
import { formatCurrency, formatDate, formatDateTime, formatTime } from '../../../utils/format';

const statusLabel: Record<string, string> = {
  open: 'Partida aberta',
  pending: 'Pendente',
  confirmed: 'Confirmada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

export default function OwnerBookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: booking, isLoading, refetch } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsService.get(id),
  });

  const refetchBooking = useCallback(() => refetch(), [refetch]);
  const { refreshing, onRefresh } = usePullToRefresh(refetchBooking);

  const cancelMutation = useMutation({
    mutationFn: () => bookingsService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      Alert.alert('Reserva cancelada', 'A reserva foi cancelada com sucesso.');
    },
    onError: () => Alert.alert('Erro', 'Não foi possível cancelar a reserva.'),
  });

  if (isLoading && !booking) return <LoadingSpinner fullScreen />;
  if (!booking) return null;

  const match = booking.match;
  const participants = match?.participants ?? [];
  const totalSlots = participants.reduce((sum, p) => sum + (p.slots ?? 1), 0);
  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';

  return (
    <SafeAreaView style={styles.safe}>
      <RefreshableScrollView contentContainerStyle={styles.scroll} refreshing={refreshing} onRefresh={onRefresh}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text.primary} />
          <Text style={styles.backText}>Histórico da Quadra</Text>
        </Pressable>

        <View style={styles.titleRow}>
          <Text style={styles.title}>Detalhe da Reserva</Text>
          <Badge
            label={statusLabel[booking.status] ?? booking.status}
            variant={bookingStatusBadge(booking.status)}
          />
        </View>

        <Card style={styles.card}>
          <Text style={styles.courtName}>{booking.court?.name ?? 'Quadra'}</Text>
          <View style={styles.infoRow}>
            <MapPin size={14} color={colors.text.secondary} />
            <Text style={styles.infoText}>
              {booking.court?.addressLine}, {booking.court?.city}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <View style={styles.infoRow}>
              <Calendar size={14} color={colors.text.secondary} />
              <Text style={styles.infoText}>{formatDate(booking.startsAt)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Clock size={14} color={colors.text.secondary} />
              <Text style={styles.infoText}>
                {formatTime(booking.startsAt)} – {formatTime(booking.endsAt)}
              </Text>
            </View>
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>Responsável</Text>
          <Text style={styles.infoText}>{booking.player?.name ?? 'Jogador'}</Text>
        </Card>

        {match && (
          <Card style={styles.card}>
            <Text style={styles.sectionLabel}>Partida</Text>
            <Text style={styles.matchSport}>{match.sport}</Text>
            <Text style={styles.infoText}>
              Organizador: {match.host?.name ?? '—'}
            </Text>
            <View style={styles.infoRow}>
              <Users size={14} color={colors.text.secondary} />
              <Text style={styles.infoText}>
                {totalSlots}/{match.maxPlayers} jogadores · mín. {match.minPlayers}
              </Text>
            </View>
            {participants.length > 0 && (
              <View style={styles.participants}>
                {participants.map((p) => (
                  <View key={p.id} style={styles.participantRow}>
                    <Avatar name={p.user?.name} uri={p.user?.avatarUrl} size={28} />
                    <Text style={styles.participantName}>{p.user?.name ?? 'Jogador'}</Text>
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}

        <Card style={styles.card}>
          <Text style={styles.sectionLabel}>Pagamento</Text>
          <View style={styles.row}>
            <Text style={styles.infoText}>Valor total</Text>
            <Text style={styles.price}>{formatCurrency(booking.totalPrice)}</Text>
          </View>
          <Text style={styles.createdAt}>Registrado em {formatDateTime(booking.createdAt)}</Text>
        </Card>

        {canCancel && (
          <Button
            label="Cancelar reserva"
            variant="danger"
            onPress={() =>
              Alert.alert('Cancelar reserva?', 'Esta ação não pode ser desfeita.', [
                { text: 'Não', style: 'cancel' },
                { text: 'Cancelar', style: 'destructive', onPress: () => cancelMutation.mutate() },
              ])
            }
            loading={cancelMutation.isPending}
            fullWidth
          />
        )}
      </RefreshableScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  backText: { fontSize: 16, color: colors.text.primary, fontWeight: '500' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text.primary },
  card: { gap: spacing.sm },
  courtName: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  sectionLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  matchSport: { fontSize: 16, fontWeight: '700', color: colors.primary[600] },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 14, color: colors.text.secondary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  price: { fontSize: 18, fontWeight: '800', color: colors.primary[600] },
  createdAt: { fontSize: 12, color: colors.text.secondary, marginTop: 4 },
  participants: { gap: spacing.sm, marginTop: spacing.xs },
  participantRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  participantName: { fontSize: 14, color: colors.text.primary, fontWeight: '500' },
});
