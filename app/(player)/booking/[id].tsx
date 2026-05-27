import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Calendar, ChevronLeft, Clock, MapPin, Star } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
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

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const { data: booking, isLoading } = useQuery({
    queryKey: ['booking', id],
    queryFn: () => bookingsService.get(id),
  });

  const cancelMutation = useMutation({
    mutationFn: () => bookingsService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      Alert.alert('Reserva cancelada', 'Reembolso processado quando aplicável.');
    },
    onError: () => Alert.alert('Erro', 'Não foi possível cancelar a reserva.'),
  });

  const reviewMutation = useMutation({
    mutationFn: () => bookingsService.review(id, { rating, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['booking', id] });
      setShowReviewModal(false);
      Alert.alert('Avaliação enviada', 'Obrigado pelo seu feedback!');
    },
    onError: () => Alert.alert('Erro', 'Não foi possível enviar a avaliação.'),
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!booking) return null;

  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
  const canReview = booking.status === 'completed' && !booking.review;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text.primary} />
          <Text style={styles.backText}>Minhas Reservas</Text>
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
          <Text style={styles.sectionLabel}>Pagamento</Text>
          <View style={styles.row}>
            <Text style={styles.infoText}>Total pago</Text>
            <Text style={styles.price}>{formatCurrency(booking.totalPrice)}</Text>
          </View>
          {booking.payment && (
            <View style={styles.row}>
              <Text style={styles.infoText}>Método</Text>
              <Text style={styles.infoText}>
                {booking.payment.method === 'pix' ? 'PIX' : 'Cartão de Crédito'}
              </Text>
            </View>
          )}
          <Text style={styles.createdAt}>Reservado em {formatDateTime(booking.createdAt)}</Text>
        </Card>

        {booking.review && (
          <Card style={styles.card}>
            <Text style={styles.sectionLabel}>Sua avaliação</Text>
            <View style={styles.ratingRow}>
              {Array.from({ length: booking.review.rating }).map((_, i) => (
                <Star key={i} size={18} color="#f59e0b" fill="#f59e0b" />
              ))}
            </View>
            {booking.review.comment && (
              <Text style={styles.reviewComment}>{booking.review.comment}</Text>
            )}
          </Card>
        )}

        <View style={styles.actions}>
          {canReview && (
            <Button
              label="Avaliar quadra"
              variant="outline"
              onPress={() => setShowReviewModal(true)}
              fullWidth
            />
          )}
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
        </View>
      </ScrollView>

      {/* Review modal */}
      <Modal visible={showReviewModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Avaliar quadra</Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Pressable key={s} onPress={() => setRating(s)}>
                  <Star size={36} color="#f59e0b" fill={s <= rating ? '#f59e0b' : 'transparent'} />
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.commentInput}
              placeholder="Deixe um comentário (opcional)"
              placeholderTextColor={colors.neutral[400]}
              multiline
              value={comment}
              onChangeText={setComment}
            />
            <View style={styles.modalActions}>
              <Button label="Cancelar" variant="ghost" onPress={() => setShowReviewModal(false)} />
              <Button
                label="Enviar"
                onPress={() => reviewMutation.mutate()}
                loading={reviewMutation.isPending}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  sectionLabel: { fontSize: 12, color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 14, color: colors.text.secondary },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  price: { fontSize: 18, fontWeight: '800', color: colors.primary[600] },
  createdAt: { fontSize: 12, color: colors.text.secondary, marginTop: 4 },
  ratingRow: { flexDirection: 'row', gap: 4 },
  reviewComment: { fontSize: 14, color: colors.text.secondary },
  actions: { gap: spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    gap: spacing.lg,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary, textAlign: 'center' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  commentInput: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: 15,
    color: colors.text.primary,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md },
});
