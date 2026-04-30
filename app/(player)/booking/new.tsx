import { useQuery, useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, CreditCard, QrCode } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { bookingsService } from '../../../services/bookings.service';
import { courtsService } from '../../../services/courts.service';
import { paymentsService } from '../../../services/payments.service';
import { colors, spacing } from '../../../theme';
import type { PayMethod } from '../../../types';
import { formatCurrency, formatDate, formatTime } from '../../../utils/format';

export default function NewBookingScreen() {
  const { courtId, date, time, price } = useLocalSearchParams<{
    courtId: string;
    date: string;
    time: string;
    price: string;
  }>();

  const [method, setMethod] = useState<PayMethod>('pix');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [paymentDone, setPaymentDone] = useState(false);

  const { data: court, isLoading } = useQuery({
    queryKey: ['court', courtId],
    queryFn: () => courtsService.get(courtId),
  });

  const { data: cards = [] } = useQuery({
    queryKey: ['cards'],
    queryFn: () => paymentsService.listCards(),
  });

  const createAndPayMutation = useMutation({
    mutationFn: async () => {
      const startsAt = `${date}T${time}:00`;
      const endsAt = new Date(new Date(startsAt).getTime() + 60 * 60 * 1000).toISOString();

      const booking = await bookingsService.create({ courtId, startsAt, endsAt });

      const checkout = await paymentsService.checkout({
        bookingId: booking.id,
        method,
        cardId: method === 'card' ? (selectedCardId ?? undefined) : undefined,
      });

      if (method === 'pix' && checkout.qrCode) {
        setQrCode(checkout.qrCode);
      }

      if (method === 'card') {
        await paymentsService.confirmPayment(checkout.paymentId);
        setPaymentDone(true);
        setTimeout(() => router.replace('/(player)/bookings'), 1500);
      }

      return booking;
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao criar reserva.';
      Alert.alert('Erro', msg);
    },
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!court) return null;

  const totalPrice = Number(price);

  if (qrCode) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.qrContainer}>
          <Text style={styles.qrTitle}>Pague via PIX</Text>
          <Text style={styles.qrSubtitle}>Escaneie o código abaixo para concluir o pagamento</Text>
          <View style={styles.qrBox}>
            <Text style={styles.qrPlaceholder}>QR Code</Text>
            <Text style={styles.qrCode} numberOfLines={3}>{qrCode}</Text>
          </View>
          <Text style={styles.qrAmount}>{formatCurrency(totalPrice)}</Text>
          <Button
            label="Já paguei"
            onPress={() => router.replace('/(player)/bookings')}
            fullWidth
            size="lg"
            style={{ marginTop: spacing.lg }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (paymentDone) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>✅</Text>
          <Text style={styles.successTitle}>Reserva confirmada!</Text>
          <Text style={styles.successSubtitle}>Você receberá um e-mail de confirmação.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text.primary} />
          <Text style={styles.backText}>Voltar</Text>
        </Pressable>

        <Text style={styles.title}>Confirmar Reserva</Text>

        {/* Summary */}
        <Card style={styles.summaryCard}>
          <Text style={styles.sectionLabel}>Quadra</Text>
          <Text style={styles.courtName}>{court.name}</Text>
          <Text style={styles.courtAddress}>{court.addressLine}, {court.city}</Text>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Data</Text>
            <Text style={styles.summaryValue}>{date ? formatDate(date + 'T00:00:00') : date}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Horário</Text>
            <Text style={styles.summaryValue}>{time}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duração</Text>
            <Text style={styles.summaryValue}>1 hora</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalPrice)}</Text>
          </View>
        </Card>

        {/* Payment method */}
        <Text style={styles.sectionTitle}>Forma de Pagamento</Text>

        <Pressable onPress={() => setMethod('pix')} style={[styles.methodCard, method === 'pix' && styles.methodSelected]}>
          <QrCode size={24} color={method === 'pix' ? colors.primary[600] : colors.neutral[500]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.methodTitle, method === 'pix' && styles.methodTitleSelected]}>PIX</Text>
            <Text style={styles.methodDesc}>Pagamento instantâneo</Text>
          </View>
          <View style={[styles.radio, method === 'pix' && styles.radioSelected]} />
        </Pressable>

        <Pressable onPress={() => setMethod('card')} style={[styles.methodCard, method === 'card' && styles.methodSelected]}>
          <CreditCard size={24} color={method === 'card' ? colors.primary[600] : colors.neutral[500]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.methodTitle, method === 'card' && styles.methodTitleSelected]}>Cartão de Crédito</Text>
            <Text style={styles.methodDesc}>Pagamento no crédito</Text>
          </View>
          <View style={[styles.radio, method === 'card' && styles.radioSelected]} />
        </Pressable>

        {method === 'card' && cards.length > 0 && (
          <View style={styles.cardsList}>
            {cards.map((card) => (
              <Pressable
                key={card.id}
                onPress={() => setSelectedCardId(card.id)}
                style={[styles.cardItem, selectedCardId === card.id && styles.cardItemSelected]}
              >
                <Text style={styles.cardBrand}>{card.brand}</Text>
                <Text style={styles.cardNumber}>•••• {card.last4}</Text>
                <Text style={styles.cardExpiry}>{card.expMonth}/{card.expYear}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <Button
          label={`Pagar ${formatCurrency(totalPrice)}`}
          onPress={() => createAndPayMutation.mutate()}
          loading={createAndPayMutation.isPending}
          disabled={method === 'card' && cards.length > 0 && !selectedCardId}
          fullWidth
          size="lg"
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  backText: { fontSize: 16, color: colors.text.primary, fontWeight: '500' },
  title: { fontSize: 26, fontWeight: '800', color: colors.text.primary },
  summaryCard: { gap: 8 },
  sectionLabel: { fontSize: 12, color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  courtName: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  courtAddress: { fontSize: 13, color: colors.text.secondary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 14, color: colors.text.secondary },
  summaryValue: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  totalLabel: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  totalValue: { fontSize: 20, fontWeight: '800', color: colors.primary[600] },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary, marginTop: spacing.sm },
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  methodSelected: { borderColor: colors.primary[600], backgroundColor: colors.primary[50] },
  methodTitle: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  methodTitleSelected: { color: colors.primary[700] },
  methodDesc: { fontSize: 12, color: colors.text.secondary },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  radioSelected: { borderColor: colors.primary[600], backgroundColor: colors.primary[600] },
  cardsList: { gap: spacing.sm },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  cardItemSelected: { borderColor: colors.primary[600] },
  cardBrand: { fontSize: 14, fontWeight: '600', color: colors.text.primary, textTransform: 'capitalize' },
  cardNumber: { flex: 1, fontSize: 14, color: colors.text.secondary },
  cardExpiry: { fontSize: 13, color: colors.text.secondary },
  qrContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.lg },
  qrTitle: { fontSize: 28, fontWeight: '800', color: colors.text.primary },
  qrSubtitle: { fontSize: 15, color: colors.text.secondary, textAlign: 'center', lineHeight: 22 },
  qrBox: {
    width: 240,
    height: 240,
    backgroundColor: colors.neutral[100],
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md,
  },
  qrPlaceholder: { fontSize: 16, fontWeight: '600', color: colors.text.secondary },
  qrCode: { fontSize: 10, color: colors.text.secondary, textAlign: 'center' },
  qrAmount: { fontSize: 32, fontWeight: '800', color: colors.primary[600] },
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  successIcon: { fontSize: 72 },
  successTitle: { fontSize: 28, fontWeight: '800', color: colors.text.primary },
  successSubtitle: { fontSize: 16, color: colors.text.secondary },
});
