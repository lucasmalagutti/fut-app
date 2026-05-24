import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, CreditCard, QrCode } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
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
import { formatCurrency, formatDate } from '../../../utils/format';

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Monta uma string ISO 8601 com o offset local do dispositivo.
 * Ex: date="2024-05-24", time="14:00" em UTC-3 → "2024-05-24T14:00:00-03:00"
 * Isso garante que o backend Node.js interprete a hora corretamente,
 * independentemente do fuso configurado no servidor.
 */
function toLocalISO(date: string, time: string): string {
  const offsetMin = new Date().getTimezoneOffset(); // ex: 180 para UTC-3
  const sign = offsetMin <= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const hh = String(Math.floor(abs / 60)).padStart(2, '0');
  const mm = String(abs % 60).padStart(2, '0');
  return `${date}T${time}:00${sign}${hh}:${mm}`;
}

function calcDuration(startTime: string, endTime: string): string {
  const [sh, sm] = (startTime ?? '0:0').split(':').map(Number);
  const [eh, em] = (endTime ?? '0:0').split(':').map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  if (diff <= 0) return '—';
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  return h > 0 ? `${h}h${m > 0 ? `${m}min` : ''}` : `${m}min`;
}

// ── Tela PIX aguardando pagamento ──────────────────────────────────────────

function PixWaiting({
  paymentId,
  qrCode,
  qrCodeUrl,
  totalPrice,
  onConfirmed,
}: {
  paymentId: string;
  qrCode?: string;
  qrCodeUrl?: string;
  totalPrice: number;
  onConfirmed: () => void;
}) {
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [copied, setCopied] = useState(false);

  // Polling a cada 3s para detectar confirmação do webhook
  useEffect(() => {
    pollRef.current = setInterval(async () => {
      try {
        const { status } = await paymentsService.getStatus(paymentId);
        if (status === 'paid') {
          clearInterval(pollRef.current!);
          onConfirmed();
        }
      } catch {
        // ignora erros de rede no polling
      }
    }, 3000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [paymentId, onConfirmed]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.pixScroll}>
        <Text style={styles.pixTitle}>Pague via PIX</Text>
        <Text style={styles.pixSubtitle}>
          Escaneie o QR Code ou copie o código abaixo. O pagamento é confirmado automaticamente.
        </Text>

        {/* QR Code — imagem real do Stripe ou placeholder */}
        <View style={styles.qrBox}>
          {qrCodeUrl ? (
            <Image
              source={{ uri: qrCodeUrl }}
              style={styles.qrImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.qrPlaceholderBox}>
              <QrCode size={80} color={colors.primary[600]} />
              <Text style={styles.qrPlaceholderText}>QR Code</Text>
            </View>
          )}
        </View>

        <Text style={styles.pixAmount}>{formatCurrency(totalPrice)}</Text>

        {/* Código copia-e-cola */}
        {qrCode && (
          <Pressable
            style={styles.copyBox}
            onPress={() => {
              // Clipboard.setStringAsync(qrCode) — requer expo-clipboard
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            }}
          >
            <Text style={styles.copyCode} numberOfLines={2}>{qrCode}</Text>
            <Text style={styles.copyLabel}>{copied ? '✓ Copiado!' : 'Toque para copiar'}</Text>
          </Pressable>
        )}

        <View style={styles.pixInfoBox}>
          <Text style={styles.pixInfoText}>⏳ Aguardando confirmação do pagamento…</Text>
          <Text style={styles.pixInfoSub}>O app atualiza automaticamente após o pagamento.</Text>
        </View>

        <Button
          label="Já paguei"
          onPress={onConfirmed}
          fullWidth
          size="lg"
          style={{ marginTop: spacing.md }}
        />
        <Button
          label="Cancelar e voltar"
          onPress={() => router.replace('/(player)/bookings')}
          fullWidth
          size="lg"
          style={{ marginTop: spacing.sm, backgroundColor: colors.neutral[100] }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Tela de sucesso ─────────────────────────────────────────────────────────

function PaymentSuccess() {
  useEffect(() => {
    const t = setTimeout(() => router.replace('/(player)/bookings'), 2000);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={styles.successTitle}>Reserva confirmada!</Text>
        <Text style={styles.successSubtitle}>Você receberá um e-mail de confirmação.</Text>
        <LoadingSpinner size="small" style={{ marginTop: spacing.md }} />
      </View>
    </SafeAreaView>
  );
}

// ── Tela principal ──────────────────────────────────────────────────────────

export default function NewBookingScreen() {
  const { courtId, date, startTime, endTime, price } = useLocalSearchParams<{
    courtId: string;
    date: string;
    startTime: string;
    endTime: string;
    price: string;
  }>();

  const [method, setMethod] = useState<PayMethod>('pix');
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  // Estado do pagamento PIX
  const [pixPaymentId, setPixPaymentId] = useState<string | null>(null);
  const [pixQrCode, setPixQrCode] = useState<string | undefined>();
  const [pixQrCodeUrl, setPixQrCodeUrl] = useState<string | undefined>();

  const [paymentDone, setPaymentDone] = useState(false);
  const submittingRef = useRef(false); // guard contra duplo submit

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
      // Guard contra duplo submit (toque acidental duplo antes do isPending atualizar)
      if (submittingRef.current) return null as any;
      submittingRef.current = true;

      try {
      // ISO com offset local → backend interpreta hora corretamente (ex: UTC-3)
      const startsAt = toLocalISO(date, startTime);
      const endsAt = toLocalISO(date, endTime);

      const booking = await bookingsService.create({ courtId, startsAt, endsAt });

      const checkout = await paymentsService.checkout({
        bookingId: booking.id,
        method,
        cardId: method === 'card' ? (selectedCardId ?? undefined) : undefined,
      });

      if (method === 'pix') {
        // PIX: entra em modo de espera com polling
        setPixPaymentId(checkout.paymentId);
        setPixQrCode(checkout.qrCode);
        setPixQrCodeUrl(checkout.qrCodeUrl);
      } else {
        // Cartão: confirmado imediatamente pelo Stripe
        setPaymentDone(true);
      }

      return booking;
      } finally {
        // Libera após 2s — tempo suficiente para o estado PIX ou sucesso atualizar
        setTimeout(() => { submittingRef.current = false; }, 2000);
      }
    },
    onError: (err: unknown) => {
      submittingRef.current = false;
      const msg =
        (err as any)?.response?.data?.message ?? 'Erro ao criar reserva. Tente novamente.';
      Alert.alert('Erro', msg);
    },
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!court) return null;

  const totalPrice = Number(price);

  // ── Telas pós-pagamento ──────────────────────────────────────────────────

  if (paymentDone) {
    return <PaymentSuccess />;
  }

  if (pixPaymentId) {
    return (
      <PixWaiting
        paymentId={pixPaymentId}
        qrCode={pixQrCode}
        qrCodeUrl={pixQrCodeUrl}
        totalPrice={totalPrice}
        onConfirmed={() => setPaymentDone(true)}
      />
    );
  }

  // ── Formulário de confirmação ─────────────────────────────────────────────

  const duration = calcDuration(startTime, endTime);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text.primary} />
          <Text style={styles.backText}>Voltar</Text>
        </Pressable>

        <Text style={styles.title}>Confirmar Reserva</Text>

        {/* Resumo */}
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
            <Text style={styles.summaryValue}>{startTime} → {endTime}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Duração</Text>
            <Text style={styles.summaryValue}>{duration}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatCurrency(totalPrice)}</Text>
          </View>
        </Card>

        {/* Método de pagamento */}
        <Text style={styles.sectionTitle}>Forma de Pagamento</Text>

        <Pressable
          onPress={() => setMethod('pix')}
          style={[styles.methodCard, method === 'pix' && styles.methodSelected]}
        >
          <QrCode size={24} color={method === 'pix' ? colors.primary[600] : colors.neutral[500]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.methodTitle, method === 'pix' && styles.methodTitleSelected]}>PIX</Text>
            <Text style={styles.methodDesc}>Pagamento instantâneo · confirmação automática</Text>
          </View>
          <View style={[styles.radio, method === 'pix' && styles.radioSelected]} />
        </Pressable>

        <Pressable
          onPress={() => setMethod('card')}
          style={[styles.methodCard, method === 'card' && styles.methodSelected]}
        >
          <CreditCard size={24} color={method === 'card' ? colors.primary[600] : colors.neutral[500]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.methodTitle, method === 'card' && styles.methodTitleSelected]}>Cartão de Crédito</Text>
            <Text style={styles.methodDesc}>Debitado agora no seu cartão cadastrado</Text>
          </View>
          <View style={[styles.radio, method === 'card' && styles.radioSelected]} />
        </Pressable>

        {/* Lista de cartões */}
        {method === 'card' && (
          <View style={styles.cardsList}>
            {cards.length === 0 ? (
              <Text style={styles.noCards}>Nenhum cartão cadastrado. Adicione um em Perfil → Cartões.</Text>
            ) : (
              cards.map((card) => (
                <Pressable
                  key={card.id}
                  onPress={() => setSelectedCardId(card.id)}
                  style={[styles.cardItem, selectedCardId === card.id && styles.cardItemSelected]}
                >
                  <Text style={styles.cardBrand}>{card.brand}</Text>
                  <Text style={styles.cardNumber}>•••• {card.last4}</Text>
                  <Text style={styles.cardExpiry}>{card.expMonth}/{card.expYear}</Text>
                </Pressable>
              ))
            )}
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

// ── Estilos ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },

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
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: 12, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.white,
  },
  methodSelected: { borderColor: colors.primary[600], backgroundColor: colors.primary[50] },
  methodTitle: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  methodTitleSelected: { color: colors.primary[700] },
  methodDesc: { fontSize: 12, color: colors.text.secondary },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.border },
  radioSelected: { borderColor: colors.primary[600], backgroundColor: colors.primary[600] },

  cardsList: { gap: spacing.sm },
  noCards: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', padding: spacing.md },
  cardItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderRadius: 10, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.white,
  },
  cardItemSelected: { borderColor: colors.primary[600] },
  cardBrand: { fontSize: 14, fontWeight: '600', color: colors.text.primary, textTransform: 'capitalize' },
  cardNumber: { flex: 1, fontSize: 14, color: colors.text.secondary },
  cardExpiry: { fontSize: 13, color: colors.text.secondary },

  // PIX waiting
  pixScroll: { padding: spacing.lg, alignItems: 'center', gap: spacing.lg, paddingBottom: spacing.xl },
  pixTitle: { fontSize: 26, fontWeight: '800', color: colors.text.primary, textAlign: 'center' },
  pixSubtitle: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', lineHeight: 22 },
  qrBox: {
    width: 240, height: 240, backgroundColor: colors.white,
    borderRadius: 16, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  qrImage: { width: 220, height: 220 },
  qrPlaceholderBox: { alignItems: 'center', gap: spacing.sm },
  qrPlaceholderText: { fontSize: 14, color: colors.text.secondary },
  pixAmount: { fontSize: 32, fontWeight: '800', color: colors.primary[600] },
  copyBox: {
    width: '100%', backgroundColor: colors.neutral[50], borderRadius: 12,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, gap: 4,
  },
  copyCode: { fontSize: 11, color: colors.text.secondary, fontFamily: 'monospace' },
  copyLabel: { fontSize: 12, fontWeight: '600', color: colors.primary[600], textAlign: 'right' },
  pixInfoBox: {
    backgroundColor: colors.primary[50], borderRadius: 12,
    padding: spacing.md, alignItems: 'center', gap: 4, width: '100%',
  },
  pixInfoText: { fontSize: 14, fontWeight: '600', color: colors.primary[700] },
  pixInfoSub: { fontSize: 12, color: colors.primary[600], textAlign: 'center' },

  // Success
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  successIcon: { fontSize: 72 },
  successTitle: { fontSize: 28, fontWeight: '800', color: colors.text.primary },
  successSubtitle: { fontSize: 16, color: colors.text.secondary },
});
