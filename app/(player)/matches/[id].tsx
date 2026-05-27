import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Clock, Share2, Users } from 'lucide-react-native';
import { useState } from 'react';
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
import { matchesService } from '../../../services/matches.service';
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

  const [guestModal, setGuestModal] = useState(false);
  const [guestName, setGuestName] = useState('');

  const { data: match, isLoading } = useQuery({
    queryKey: ['match', id],
    queryFn: () => matchesService.get(id),
  });

  // ── Mutations ──────────────────────────────────────────────────────────────

  const joinMutation = useMutation({
    mutationFn: (gName?: string) => matchesService.join(id, gName ? { guestName: gName } : undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match', id] });
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      setGuestModal(false);
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

  if (isLoading) return <LoadingSpinner fullScreen />;
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
    Alert.alert('Entrar na partida', 'Deseja entrar sozinho ou adicionar um convidado?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sozinho', onPress: () => joinMutation.mutate(undefined) },
      { text: 'Com convidado', onPress: () => setGuestModal(true) },
    ]);
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
      <ScrollView contentContainerStyle={styles.scroll}>

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
      </ScrollView>

      {/* Modal: nome do convidado */}
      <Modal visible={guestModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Nome do convidado</Text>
            <Text style={styles.modalHint}>
              Você pagará por 2 cotas (você + convidado).
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: João Silva"
              value={guestName}
              onChangeText={setGuestName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Button
                label="Cancelar"
                variant="outline"
                onPress={() => { setGuestModal(false); setGuestName(''); }}
                style={{ flex: 1 }}
              />
              <Button
                label="Confirmar"
                onPress={() => joinMutation.mutate(guestName.trim() || undefined)}
                loading={joinMutation.isPending}
                disabled={!guestName.trim()}
                style={{ flex: 1 }}
              />
            </View>
          </View>
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

  actionsContainer: { marginTop: spacing.sm, gap: spacing.sm },
  emptyText: { fontSize: 14, color: colors.text.secondary, fontStyle: 'italic' },
  closedMsg: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', fontStyle: 'italic' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  modalBox: { backgroundColor: colors.white, borderRadius: 16, padding: spacing.lg, gap: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  modalHint: { fontSize: 13, color: colors.text.secondary },
  modalInput: {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 10,
    padding: spacing.md, fontSize: 15, color: colors.text.primary,
  },
  modalButtons: { flexDirection: 'row', gap: spacing.sm },
});
