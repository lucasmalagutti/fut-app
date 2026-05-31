import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Clock, Share2, Users } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { PaymentMethodPicker, type AutoPayMethod } from '../../../components/payments/PaymentMethodPicker';
import { PixPaymentModal } from '../../../components/payments/PixPaymentModal';
import { RefreshableScrollView } from '../../../components/ui/RefreshableScrollView';
import { mergeRefetch, usePullToRefresh } from '../../../hooks/usePullToRefresh';
import { matchesService } from '../../../services/matches.service';
import { paymentsService } from '../../../services/payments.service';
import { walletService } from '../../../services/wallet.service';
import { useAuthStore } from '../../../store/auth.store';
import { colors, spacing } from '../../../theme';
import type { MatchParticipant } from '../../../types';
import { formatCurrency, formatDate, formatTime } from '../../../utils/format';

// ── Helpers ───────────────────────────────────────────────────────────────────

function paymentStatusBadge(status: MatchParticipant['paymentStatus']) {
  switch (status) {
    case 'paid':       return { label: 'Pago',         variant: 'success' as const };
    case 'unpaid':     return { label: 'PIX pendente', variant: 'warning' as const };
    case 'checked_in': return { label: 'Check-in',     variant: 'success' as const };
    case 'cancelled':  return { label: 'Saiu',         variant: 'error'   as const };
    default:           return { label: 'Inscrito',     variant: 'neutral' as const };
  }
}

function Countdown({ targetIso }: { targetIso: string }) {
  const target = new Date(targetIso).getTime();
  const diff = target - Date.now();

  if (diff <= 0) return <Text style={styles.countdownDone}>Inscrições encerradas</Text>;

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);

  return (
    <View style={styles.countdownRow}>
      <Clock size={14} color={colors.primary[600]} />
      <Text style={styles.countdownText}>
        Inscrições fecham em {h > 0 ? `${h}h ` : ''}{m}min
      </Text>
    </View>
  );
}

// ── Tela ──────────────────────────────────────────────────────────────────────

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [joinModal, setJoinModal] = useState(false);
  const [joinWithGuest, setJoinWithGuest] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [payMethod, setPayMethod] = useState<AutoPayMethod>('wallet');
  const [payCardId, setPayCardId] = useState<string | undefined>();
  const [pixModal, setPixModal] = useState<{
    paymentId: string;
    amount: number;
    qrCode?: string;
    qrCodeUrl?: string;
  } | null>(null);
  const [paying, setPaying] = useState(false);

  const { data: match, isLoading, refetch: refetchMatch } = useQuery({
    queryKey: ['match', id],
    queryFn: () => matchesService.get(id),
  });

  const { data: wallet, refetch: refetchWallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletService.get(),
  });

  const { data: cards = [], refetch: refetchCards } = useQuery({
    queryKey: ['cards'],
    queryFn: () => paymentsService.listCards(),
  });

  const refetchAll = useCallback(
    () => mergeRefetch(refetchMatch, refetchWallet, refetchCards),
    [refetchMatch, refetchWallet, refetchCards],
  );
  const { refreshing, onRefresh } = usePullToRefresh(refetchAll);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const joinMutation = useMutation({
    mutationFn: (opts: { guestName?: string }) =>
      matchesService.join(id, {
        payment: {
          preferredPayMethod: payMethod,
          ...(payMethod === 'card' && payCardId ? { preferredCardId: payCardId } : {}),
        },
        ...(opts.guestName ? { guestName: opts.guestName } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match', id] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      setJoinModal(false);
      setJoinWithGuest(false);
      setGuestName('');
    },
    onError: (err: unknown) => {
      const msg = (err as any)?.response?.data?.message ?? 'Erro ao entrar na partida.';
      Alert.alert('Erro', msg);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => matchesService.leave(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match', id] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
    },
    onError: (err: unknown) => {
      const msg = (err as any)?.response?.data?.message ?? 'Erro ao sair da partida.';
      Alert.alert('Erro', msg);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: () => matchesService.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      router.replace('/(player)/bookings');
    },
    onError: (err: unknown) => {
      const msg = (err as any)?.response?.data?.message ?? 'Erro ao cancelar a partida.';
      Alert.alert('Erro', msg);
    },
  });

  const checkInMutation = useMutation({
    mutationFn: () => matchesService.checkIn(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match', id] });
    },
    onError: (err: unknown) => {
      const msg = (err as any)?.response?.data?.message ?? 'Erro no check-in.';
      Alert.alert('Erro', msg);
    },
  });

  // ── Handlers ───────────────────────────────────────────────────────────────

  if (isLoading && !match) return <LoadingSpinner fullScreen />;
  if (!match) return null;

  const booking = match.booking;
  const participants = match.participants ?? [];
  const activeParticipants = participants.filter((p) => p.paymentStatus !== 'cancelled');

  const isHost = match.hostId === user?.id;
  const myParticipant = participants.find(
    (p) => p.userId === user?.id && p.paymentStatus !== 'cancelled',
  );
  const isParticipant = !!myParticipant;
  const isClosed = !!match.closedAt;
  const isConfirmed = !!match.confirmedAt;
  const canCancel = isHost && !isConfirmed;

  const totalSlots = match.totalSlots ?? activeParticipants.reduce((s, p) => s + (p.slots ?? 1), 0);
  const estimatedQuota = match.estimatedQuota ?? 0;
  const spotsLeft = match.maxPlayers - totalSlots;

  const closureTime = booking?.startsAt
    ? new Date(new Date(booking.startsAt).getTime() - 2 * 60 * 60 * 1000).toISOString()
    : null;

  function handleJoin() {
    setJoinWithGuest(false);
    setGuestName('');
    const def = cards.find((c) => c.isDefault) ?? cards[0];
    if (def) setPayCardId(def.id);
    setJoinModal(true);
  }

  function confirmJoin() {
    if (payMethod === 'card' && !payCardId) {
      Alert.alert('Cartão', 'Selecione um cartão ou cadastre em Carteira → Cartões.');
      return;
    }
    if (joinWithGuest && !guestName.trim()) {
      Alert.alert('Convidado', 'Informe o nome do convidado.');
      return;
    }
    joinMutation.mutate(joinWithGuest ? { guestName: guestName.trim() } : {});
  }

  function payMethodLabel(p: MatchParticipant) {
    if (p.preferredPayMethod === 'wallet') return 'Cobrança: carteira';
    if (p.preferredPayMethod === 'card') return 'Cobrança: cartão';
    return null;
  }

  function handleLeave() {
    Alert.alert('Sair da partida', 'Tem certeza que deseja sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => leaveMutation.mutate() },
    ]);
  }

  function handleCancel() {
    Alert.alert(
      'Cancelar partida',
      'Ao cancelar, todos os participantes serão removidos e a reserva será cancelada. Esta ação não pode ser desfeita.',
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Cancelar partida',
          style: 'destructive',
          onPress: () => cancelMutation.mutate(),
        },
      ],
    );
  }

  async function handlePayQuota() {
    if (!myParticipant?.quota) {
      Alert.alert('Aguarde', 'A cota será definida quando as inscrições fecharem.');
      return;
    }

    const wallet = await walletService.get().catch(() => ({ balance: 0 }));
    const cardList = await paymentsService.listCards().catch(() => [] as { id: string; last4: string; isDefault: boolean }[]);

    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [
      { text: 'Cancelar', style: 'cancel' },
    ];

    if ((wallet?.balance ?? 0) >= myParticipant.quota) {
      options.unshift({
        text: `Saldo da carteira (${formatCurrency(wallet!.balance)})`,
        onPress: () => runPay('wallet'),
      });
    }

    if (cardList.length > 0) {
      const defaultCard = cardList.find((c: any) => c.isDefault) ?? cardList[0];
      options.unshift({
        text: `Cartão •••• ${defaultCard.last4}`,
        onPress: () => runPay('card', defaultCard.id),
      });
    }

    options.unshift({
      text: 'PIX',
      onPress: () => runPay('pix'),
    });

    Alert.alert(`Pagar cota ${formatCurrency(myParticipant.quota)}`, 'Escolha a forma de pagamento:', options);

    async function runPay(method: 'pix' | 'card' | 'wallet', cardId?: string) {
      setPaying(true);
      try {
        const res = await paymentsService.checkoutParticipant(myParticipant!.id, {
          method,
          cardId,
        });
        if (method === 'pix' && res.paymentId) {
          setPixModal({
            paymentId: res.paymentId,
            amount: myParticipant!.quota!,
            qrCode: res.qrCode,
            qrCodeUrl: res.qrCodeUrl,
          });
        } else {
          Alert.alert('Sucesso', 'Pagamento confirmado!');
          queryClient.invalidateQueries({ queryKey: ['match', id] });
          queryClient.invalidateQueries({ queryKey: ['wallet'] });
        }
      } catch (err: unknown) {
        const msg = (err as any)?.response?.data?.message ?? 'Erro ao pagar.';
        Alert.alert('Erro', msg);
      } finally {
        setPaying(false);
      }
    }
  }

  async function handleShare() {
    try {
      // Deep link: app abre diretamente na partida; fallback é URL web
      const deepLink = `futmatch://matches/${id}`;
      const webLink = `https://futmatch.app/matches/${id}`;
      const courtName = booking?.court?.name ?? 'uma quadra';
      const sport = match.sport;
      const dateStr = booking?.startsAt ? formatDate(booking.startsAt) : '';
      const timeStr = booking?.startsAt ? formatTime(booking.startsAt) : '';

      await Share.share({
        title: `Partida de ${sport} – FutMatch`,
        message: `🏟️ Partida de ${sport} em ${courtName}!\n📅 ${dateStr} às ${timeStr}\n👥 ${totalSlots}/${match.maxPlayers} jogadores\n\nEntre agora: ${webLink}`,
        url: deepLink, // iOS usa url; Android usa message
      });
    } catch {
      // usuário cancelou
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <RefreshableScrollView contentContainerStyle={styles.scroll} refreshing={refreshing} onRefresh={onRefresh}>

        {/* Header */}
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.text.primary} />
            <Text style={styles.backText}>Voltar</Text>
          </Pressable>
          {/* Compartilhar — disponível para host de partidas privadas, ou qualquer um em públicas */}
          {(isHost || match.isPublic) && (
            <Pressable onPress={handleShare} style={styles.shareBtn} hitSlop={8}>
              <Share2 size={20} color={colors.primary[600]} />
            </Pressable>
          )}
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>{match.sport}</Text>
          {isConfirmed
            ? <Badge label="Confirmada ✓" variant="success" />
            : isClosed
            ? <Badge label="Aguard. quórum" variant="warning" />
            : <Badge label="Aberta" variant="neutral" />}
        </View>

        {/* Info quadra / horário */}
        <Card style={styles.infoCard}>
          <Text style={styles.sectionLabel}>Quadra</Text>
          <Text style={styles.courtName}>{booking?.court?.name ?? '—'}</Text>
          {booking?.court && (
            <Text style={styles.courtAddress}>
              {booking.court.addressLine}, {booking.court.city}
            </Text>
          )}
          <View style={styles.divider} />
          {booking?.startsAt && (
            <>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Data</Text>
                <Text style={styles.rowValue}>{formatDate(booking.startsAt)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>Horário</Text>
                <Text style={styles.rowValue}>
                  {formatTime(booking.startsAt)} → {booking.endsAt ? formatTime(booking.endsAt) : ''}
                </Text>
              </View>
            </>
          )}
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Custo total</Text>
            <Text style={styles.rowValue}>{formatCurrency(booking?.totalPrice ?? 0)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Visibilidade</Text>
            <Text style={styles.rowValue}>{match.isPublic ? 'Pública' : 'Privada 🔒'}</Text>
          </View>
          {isHost && (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Você é</Text>
              <Text style={[styles.rowValue, { color: colors.primary[600] }]}>Organizador</Text>
            </View>
          )}
        </Card>

        {/* Countdown */}
        {!isClosed && closureTime && <Countdown targetIso={closureTime} />}

        {/* Vagas e cota */}
        <Card style={styles.quotaCard}>
          <View style={styles.row}>
            <Users size={16} color={colors.primary[600]} />
            <Text style={styles.quotaLabel}>Vagas</Text>
            <Text style={styles.quotaValue}>{totalSlots}/{match.maxPlayers}</Text>
          </View>
          <View style={styles.progressBg}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, (totalSlots / match.maxPlayers) * 100)}%` as any },
              ]}
            />
          </View>
          {totalSlots < match.minPlayers && (
            <Text style={styles.quorumHint}>
              Faltam {match.minPlayers - totalSlots} jogador(es) para o quórum mínimo ({match.minPlayers})
            </Text>
          )}
          {totalSlots >= match.minPlayers && !isConfirmed && (
            <Text style={styles.quorumOk}>✓ Quórum atingido — aguardando fechamento</Text>
          )}
          {estimatedQuota > 0 && (
            <Text style={styles.quotaEstimate}>
              Cota estimada: {formatCurrency(estimatedQuota)}/jogador
            </Text>
          )}
        </Card>

        {/* Participantes */}
        <Text style={styles.sectionTitle}>Participantes ({activeParticipants.length})</Text>
        {activeParticipants.length === 0 ? (
          <Text style={styles.emptyText}>Nenhum participante ainda.</Text>
        ) : (
          activeParticipants.map((p) => {
            const { label, variant } = paymentStatusBadge(p.paymentStatus);
            return (
              <Card key={p.id} style={styles.participantCard}>
                <Avatar name={p.guestName ?? p.user?.name} uri={p.user?.avatarUrl} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.participantName}>
                    {p.guestName
                      ? `${p.user?.name ?? ''} + ${p.guestName} (convidado)`
                      : (p.user?.name ?? '—')}
                  </Text>
                  {p.slots > 1 && (
                    <Text style={styles.participantSlots}>{p.slots} vagas</Text>
                  )}
                  {payMethodLabel(p) && (
                    <Text style={styles.participantPay}>{payMethodLabel(p)}</Text>
                  )}
                </View>
                <Badge label={label} variant={variant} />
              </Card>
            );
          })
        )}

        {/* Ações */}
        <View style={styles.actionsContainer}>
          {/* Entrar */}
          {!isParticipant && !isClosed && spotsLeft > 0 && (
            <Button
              label="Entrar na partida"
              onPress={handleJoin}
              loading={joinMutation.isPending}
              fullWidth
              size="lg"
            />
          )}

          {/* Pagar cota */}
          {isParticipant &&
            myParticipant &&
            myParticipant.paymentStatus !== 'paid' &&
            myParticipant.paymentStatus !== 'checked_in' &&
            (myParticipant.quota ?? 0) > 0 && (
            <Button
              label={
                myParticipant?.paymentStatus === 'unpaid'
                  ? `Pagar PIX — ${formatCurrency(myParticipant.quota ?? 0)}`
                  : `Pagar cota — ${formatCurrency(myParticipant.quota ?? 0)}`
              }
              onPress={handlePayQuota}
              loading={paying}
              fullWidth
              size="lg"
            />
          )}

          {/* Check-in */}
          {isParticipant && myParticipant?.paymentStatus === 'paid' && (
            <Button
              label="Fazer check-in"
              onPress={() => checkInMutation.mutate()}
              loading={checkInMutation.isPending}
              fullWidth
              size="lg"
            />
          )}

          {/* Sair */}
          {isParticipant && !isHost && !isClosed && (
            <Button
              label="Sair da partida"
              variant="outline"
              onPress={handleLeave}
              loading={leaveMutation.isPending}
              fullWidth
              size="lg"
            />
          )}

          {/* Cancelar (host, não confirmada) */}
          {canCancel && (
            <Button
              label="Cancelar partida"
              variant="danger"
              onPress={handleCancel}
              loading={cancelMutation.isPending}
              fullWidth
              size="lg"
            />
          )}

          {/* Compartilhar link (host de partida privada) */}
          {isHost && !match.isPublic && (
            <Button
              label="Compartilhar convite"
              variant="outline"
              onPress={handleShare}
              fullWidth
              size="lg"
            />
          )}

          {/* Mensagens de bloqueio */}
          {!isParticipant && isClosed && (
            <Text style={styles.closedMsg}>Inscrições encerradas para esta partida.</Text>
          )}
          {!isParticipant && !isClosed && spotsLeft <= 0 && (
            <Text style={styles.closedMsg}>Partida lotada — sem vagas disponíveis.</Text>
          )}
        </View>
      </RefreshableScrollView>

      {pixModal && (
        <PixPaymentModal
          visible
          paymentId={pixModal.paymentId}
          amount={pixModal.amount}
          qrCode={pixModal.qrCode}
          qrCodeUrl={pixModal.qrCodeUrl}
          title="Pagar cota da partida"
          onPaid={() => {
            setPixModal(null);
            queryClient.invalidateQueries({ queryKey: ['match', id] });
            queryClient.invalidateQueries({ queryKey: ['wallet'] });
          }}
          onClose={() => setPixModal(null)}
        />
      )}

      {/* Modal: entrar na partida + forma de pagamento */}
      <Modal visible={joinModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Entrar na partida</Text>

              <View style={styles.joinTypeRow}>
                <Pressable
                  onPress={() => setJoinWithGuest(false)}
                  style={[styles.joinTypeBtn, !joinWithGuest && styles.joinTypeBtnActive]}
                >
                  <Text style={styles.joinTypeText}>Sozinho</Text>
                </Pressable>
                <Pressable
                  onPress={() => setJoinWithGuest(true)}
                  style={[styles.joinTypeBtn, joinWithGuest && styles.joinTypeBtnActive]}
                >
                  <Text style={styles.joinTypeText}>Com convidado</Text>
                </Pressable>
              </View>

              {joinWithGuest && (
                <>
                  <Text style={styles.modalHint}>Você pagará por 2 cotas (você + convidado).</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Nome do convidado"
                    value={guestName}
                    onChangeText={setGuestName}
                  />
                </>
              )}

              <PaymentMethodPicker
                method={payMethod}
                onMethodChange={(m) => {
                  setPayMethod(m);
                  if (m === 'card') {
                    const def = cards.find((c) => c.isDefault) ?? cards[0];
                    if (def) setPayCardId(def.id);
                  }
                }}
                cardId={payCardId}
                onCardIdChange={setPayCardId}
                cards={cards}
                walletBalance={wallet?.balance ?? 0}
                disabled={joinMutation.isPending}
              />

              <View style={styles.modalButtons}>
                <Button
                  label="Cancelar"
                  variant="outline"
                  onPress={() => {
                    setJoinModal(false);
                    setGuestName('');
                  }}
                  style={{ flex: 1 }}
                />
                <Button
                  label="Confirmar"
                  onPress={confirmJoin}
                  loading={joinMutation.isPending}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  backText: { fontSize: 16, color: colors.text.primary, fontWeight: '500' },
  shareBtn: { padding: 4 },

  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  title: { fontSize: 26, fontWeight: '800', color: colors.text.primary, flex: 1 },

  sectionLabel: { fontSize: 12, color: colors.text.secondary, textTransform: 'uppercase', letterSpacing: 0.8 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary, marginTop: spacing.xs },

  infoCard: { gap: 8 },
  courtName: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  courtAddress: { fontSize: 13, color: colors.text.secondary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowLabel: { fontSize: 14, color: colors.text.secondary, flex: 1 },
  rowValue: { fontSize: 14, fontWeight: '600', color: colors.text.primary },

  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  countdownText: { fontSize: 13, color: colors.primary[600], fontWeight: '600' },
  countdownDone: { fontSize: 13, color: colors.text.secondary, fontStyle: 'italic' },

  quotaCard: { backgroundColor: colors.primary[50], gap: spacing.sm },
  quotaLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.primary[700] },
  quotaValue: { fontSize: 16, fontWeight: '800', color: colors.primary[700] },
  progressBg: { height: 6, backgroundColor: colors.primary[100], borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.primary[600], borderRadius: 3 },
  quorumHint: { fontSize: 12, color: colors.primary[600] },
  quorumOk: { fontSize: 12, color: '#15803d', fontWeight: '600' },
  quotaEstimate: { fontSize: 14, fontWeight: '700', color: colors.primary[700] },

  participantCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  participantName: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  participantSlots: { fontSize: 12, color: colors.text.secondary },
  participantPay: { fontSize: 11, color: colors.primary[600], marginTop: 2 },

  actionsContainer: { marginTop: spacing.sm, gap: spacing.sm },
  emptyText: { fontSize: 14, color: colors.text.secondary, fontStyle: 'italic' },
  closedMsg: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', fontStyle: 'italic' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center' },
  modalScroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  modalBox: { backgroundColor: colors.white, borderRadius: 16, padding: spacing.lg, gap: spacing.md },
  joinTypeRow: { flexDirection: 'row', gap: spacing.sm },
  joinTypeBtn: {
    flex: 1,
    padding: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  joinTypeBtnActive: { borderColor: colors.primary[600], backgroundColor: colors.primary[50] },
  joinTypeText: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  modalHint: { fontSize: 13, color: colors.text.secondary },
  modalInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 10,
    padding: spacing.md, fontSize: 15, color: colors.text.primary,
  },
  modalButtons: { flexDirection: 'row', gap: spacing.sm },
});
