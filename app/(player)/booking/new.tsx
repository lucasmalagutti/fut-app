import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Users } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { PaymentMethodPicker, type AutoPayMethod } from '../../../components/payments/PaymentMethodPicker';
import { bookingsService } from '../../../services/bookings.service';
import { courtsService } from '../../../services/courts.service';
import { matchesService } from '../../../services/matches.service';
import { paymentsService } from '../../../services/payments.service';
import { walletService } from '../../../services/wallet.service';
import { colors, spacing } from '../../../theme';
import { formatCurrency, formatDate } from '../../../utils/format';

function toLocalISO(date: string, time: string): string {
  const offsetMin = new Date().getTimezoneOffset();
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

export default function NewMatchScreen() {
  const { courtId, date, startTime, endTime, price } = useLocalSearchParams<{
    courtId: string;
    date: string;
    startTime: string;
    endTime: string;
    price: string;
  }>();

  const queryClient = useQueryClient();
  const submittingRef = useRef(false);

  const [selectedSport, setSelectedSport] = useState('');
  const [minPlayers, setMinPlayers] = useState(6);
  const [maxPlayers, setMaxPlayers] = useState(10);
  const [isPublic, setIsPublic] = useState(true);
  const [payMethod, setPayMethod] = useState<AutoPayMethod>('wallet');
  const [payCardId, setPayCardId] = useState<string | undefined>();
  const [done, setDone] = useState(false);
  const [createdMatchId, setCreatedMatchId] = useState<string | null>(null);

  const { data: court, isLoading } = useQuery({
    queryKey: ['court', courtId],
    queryFn: () => courtsService.get(courtId),
  });

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletService.get(),
  });

  const { data: cards = [] } = useQuery({
    queryKey: ['cards'],
    queryFn: () => paymentsService.listCards(),
  });

  // Deriva lista de esportes da quadra (suporta JSON array ou string simples)
  const courtSports: string[] = (() => {
    if (!court) return [];
    try {
      const parsed = JSON.parse((court as any).sport ?? '');
      return Array.isArray(parsed) ? parsed : [court.sport];
    } catch {
      return court.sport ? [court.sport] : [];
    }
  })();

  // Auto-seleciona quando há apenas um esporte
  const effectiveSport = selectedSport || courtSports[0] || '';

  const createMutation = useMutation({
    mutationFn: async () => {
      if (submittingRef.current) return null;
      submittingRef.current = true;
      try {
        const startsAt = toLocalISO(date, startTime);
        const endsAt = toLocalISO(date, endTime);

        const booking = await bookingsService.create({ courtId, startsAt, endsAt });

        if (payMethod === 'card' && !payCardId) {
          throw new Error('Selecione um cartão para a cobrança automática.');
        }

        const match = await matchesService.create({
          bookingId: booking.id,
          sport: effectiveSport,
          minPlayers,
          maxPlayers,
          isPublic,
          payment: {
            preferredPayMethod: payMethod,
            ...(payMethod === 'card' && payCardId ? { preferredCardId: payCardId } : {}),
          },
        });

        queryClient.invalidateQueries({ queryKey: ['matches'] });
        queryClient.invalidateQueries({ queryKey: ['availability', courtId] });
        setCreatedMatchId(match.id);
        setDone(true);
        return match;
      } finally {
        setTimeout(() => { submittingRef.current = false; }, 2000);
      }
    },
    onError: (err: unknown) => {
      submittingRef.current = false;
      const msg = (err as any)?.response?.data?.message ?? 'Erro ao criar partida. Tente novamente.';
      Alert.alert('Erro', msg);
    },
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!court) return null;

  const totalPrice = Number(price);
  const duration = calcDuration(startTime, endTime);
  const estimatedQuota = minPlayers > 0 ? totalPrice / minPlayers : totalPrice;

  // Tela de sucesso
  if (done && createdMatchId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.successContainer}>
          <Text style={styles.successIcon}>⚽</Text>
          <Text style={styles.successTitle}>Partida criada!</Text>
          <Text style={styles.successSubtitle}>
            Aguardando {minPlayers} jogadores para confirmar.{'\n'}
            Sua cota será cobrada automaticamente 2 horas antes do jogo, conforme a forma de pagamento escolhida.
          </Text>
          <Button
            label="Ver minha partida"
            onPress={() => router.replace({ pathname: '/(player)/matches/[id]', params: { id: createdMatchId } })}
            fullWidth
            size="lg"
            style={{ marginTop: spacing.lg }}
          />
          <Button
            label="Ir para Partidas"
            variant="outline"
            onPress={() => router.replace('/(player)/matches')}
            fullWidth
            size="lg"
            style={{ marginTop: spacing.sm }}
          />
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

        <Text style={styles.title}>Criar Partida</Text>

        {/* Resumo da quadra */}
        <Card style={styles.summaryCard}>
          <Text style={styles.sectionLabel}>Quadra</Text>
          <Text style={styles.courtName}>{court.name}</Text>
          <Text style={styles.courtAddress}>{court.addressLine}, {court.city}</Text>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Data</Text>
            <Text style={styles.rowValue}>{date ? formatDate(date + 'T00:00:00') : date}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Horario</Text>
            <Text style={styles.rowValue}>{startTime} → {endTime} · {duration}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Esporte</Text>
            <Text style={styles.rowValue}>{effectiveSport}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Custo total</Text>
            <Text style={styles.rowValue}>{formatCurrency(totalPrice)}</Text>
          </View>
        </Card>

        {/* Seletor de esporte — apenas quando quadra tem múltiplos */}
        {courtSports.length > 1 && (
          <>
            <Text style={styles.sectionTitle}>Esporte da partida</Text>
            <View style={styles.optionsGrid}>
              {courtSports.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setSelectedSport(s)}
                  style={[styles.optionBtn, effectiveSport === s && styles.optionBtnSelected]}
                >
                  <Text style={[styles.optionText, effectiveSport === s && styles.optionTextSelected]}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Minimo de jogadores */}
        <Text style={styles.sectionTitle}>Minimo de jogadores para confirmar</Text>
        <Text style={styles.sectionHint}>
          A partida so sera confirmada e cobrada se atingir este numero.
        </Text>
        <View style={styles.counterRow}>
          <TouchableOpacity
            onPress={() => setMinPlayers(Math.max(2, minPlayers - 1))}
            style={styles.counterBtn}
          >
            <Text style={styles.counterBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.counterValue}>{minPlayers}</Text>
          <TouchableOpacity
            onPress={() => setMinPlayers(Math.min(maxPlayers, minPlayers + 1))}
            style={styles.counterBtn}
          >
            <Text style={styles.counterBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Maximo de vagas */}
        <Text style={styles.sectionTitle}>Maximo de vagas</Text>
        <View style={styles.counterRow}>
          <TouchableOpacity
            onPress={() => setMaxPlayers(Math.max(minPlayers, maxPlayers - 1))}
            style={styles.counterBtn}
          >
            <Text style={styles.counterBtnText}>−</Text>
          </TouchableOpacity>
          <Text style={styles.counterValue}>{maxPlayers}</Text>
          <TouchableOpacity
            onPress={() => setMaxPlayers(Math.min(50, maxPlayers + 1))}
            style={styles.counterBtn}
          >
            <Text style={styles.counterBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Visibilidade */}
        <Text style={styles.sectionTitle}>Visibilidade</Text>
        <View style={styles.visibilityRow}>
          <Pressable
            onPress={() => setIsPublic(true)}
            style={[styles.visBtn, isPublic && styles.visBtnSelected]}
          >
            <Text style={[styles.visBtnText, isPublic && styles.visBtnTextSelected]}>Publica</Text>
            <Text style={styles.visHint}>Qualquer jogador pode entrar</Text>
          </Pressable>
          <Pressable
            onPress={() => setIsPublic(false)}
            style={[styles.visBtn, !isPublic && styles.visBtnSelected]}
          >
            <Text style={[styles.visBtnText, !isPublic && styles.visBtnTextSelected]}>Privada</Text>
            <Text style={styles.visHint}>Apenas por convite</Text>
          </Pressable>
        </View>

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
          disabled={createMutation.isPending}
        />

        {/* Estimativa de cota */}
        <Card style={styles.quotaCard}>
          <View style={styles.row}>
            <Users size={16} color={colors.primary[600]} />
            <Text style={styles.quotaLabel}>Cota estimada (minimo)</Text>
            <Text style={styles.quotaValue}>{formatCurrency(estimatedQuota)}/jogador</Text>
          </View>
          <Text style={styles.quotaHint}>
            Valor final calculado no fechamento das inscricoes (2h antes), rateado entre todos os participantes.
          </Text>
        </Card>

        <Button
          label="Criar partida"
          onPress={() => createMutation.mutate()}
          loading={createMutation.isPending}
          fullWidth
          size="lg"
          style={{ marginTop: spacing.md }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  rowLabel: { fontSize: 14, color: colors.text.secondary },
  rowValue: { fontSize: 14, fontWeight: '600', color: colors.text.primary },

  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary, marginTop: spacing.xs },
  sectionHint: { fontSize: 13, color: colors.text.secondary, marginTop: -spacing.xs },

  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  optionBtn: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: 20, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.white,
  },
  optionBtnSelected: { borderColor: colors.primary[600], backgroundColor: colors.primary[50] },
  optionText: { fontSize: 14, fontWeight: '600', color: colors.text.secondary },
  optionTextSelected: { color: colors.primary[700] },

counterRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  counterBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.primary[600],
    alignItems: 'center', justifyContent: 'center',
  },
  counterBtnText: { fontSize: 24, fontWeight: '700', color: colors.white, lineHeight: 28 },
  counterValue: { fontSize: 28, fontWeight: '800', color: colors.text.primary, minWidth: 40, textAlign: 'center' },

  visibilityRow: { flexDirection: 'row', gap: spacing.sm },
  visBtn: {
    flex: 1, padding: spacing.md, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.white,
  },
  visBtnSelected: { borderColor: colors.primary[600], backgroundColor: colors.primary[50] },
  visBtnText: { fontSize: 15, fontWeight: '700', color: colors.text.secondary },
  visBtnTextSelected: { color: colors.primary[700] },
  visHint: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },

  quotaCard: { backgroundColor: colors.primary[50], gap: spacing.xs },
  quotaLabel: { flex: 1, fontSize: 14, color: colors.primary[700], fontWeight: '600' },
  quotaValue: { fontSize: 16, fontWeight: '800', color: colors.primary[600] },
  quotaHint: { fontSize: 12, color: colors.primary[600], lineHeight: 18 },

  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  successIcon: { fontSize: 72 },
  successTitle: { fontSize: 28, fontWeight: '800', color: colors.text.primary },
  successSubtitle: { fontSize: 15, color: colors.text.secondary, textAlign: 'center', lineHeight: 22 },
});
