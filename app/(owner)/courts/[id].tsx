import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { Calendar, ChevronLeft, Edit2, Trash2 } from 'lucide-react-native';
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
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { courtsService } from '../../../services/courts.service';
import { colors, spacing } from '../../../theme';
import { formatCurrency, getDayName } from '../../../utils/format';

export default function OwnerCourtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const { data: court, isLoading } = useQuery({
    queryKey: ['court', id],
    queryFn: () => courtsService.get(id),
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['court-schedules', id],
    queryFn: () => courtsService.getSchedules(id),
  });

  const { data: blocks = [] } = useQuery({
    queryKey: ['court-blocks', id],
    queryFn: () => courtsService.getBlocks(id),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: () =>
      courtsService.update(id, {
        status: court?.status === 'active' ? 'inactive' : 'active',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['court', id] });
      queryClient.invalidateQueries({ queryKey: ['owner-courts'] });
    },
  });

  const addBlockMutation = useMutation({
    mutationFn: (data: { startsAt: string; endsAt: string; reason?: string }) =>
      courtsService.addBlock(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['court-blocks', id] }),
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!court) return null;

  const amenities = Array.isArray(court.amenities)
    ? court.amenities
    : (() => { try { return JSON.parse(court.amenities as unknown as string); } catch { return []; } })();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.courtName} numberOfLines={1}>{court.name}</Text>
          <Badge
            label={court.status === 'active' ? 'Ativa' : 'Inativa'}
            variant={court.status === 'active' ? 'success' : 'neutral'}
          />
        </View>

        <View style={styles.content}>
          {/* Info */}
          <Card>
            <Text style={styles.sectionTitle}>Informações</Text>
            <Text style={styles.infoLabel}>Esporte</Text>
            <Chip label={court.sport} style={{ alignSelf: 'flex-start' }} />
            <Text style={styles.infoLabel}>Endereço</Text>
            <Text style={styles.infoValue}>{court.addressLine}, {court.city} – {court.state}</Text>
            {court.description && (
              <>
                <Text style={styles.infoLabel}>Descrição</Text>
                <Text style={styles.infoValue}>{court.description}</Text>
              </>
            )}
            {amenities.length > 0 && (
              <>
                <Text style={styles.infoLabel}>Comodidades</Text>
                <View style={styles.chipsRow}>
                  {amenities.map((a: string, i: number) => <Chip key={i} label={a} />)}
                </View>
              </>
            )}
            {court.ratingCount > 0 && (
              <Text style={styles.rating}>
                ⭐ {court.ratingAvg.toFixed(1)} ({court.ratingCount} avaliações)
              </Text>
            )}
          </Card>

          {/* Schedules */}
          <Card>
            <Text style={styles.sectionTitle}>Horários de Funcionamento</Text>
            {schedules.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum horário configurado.</Text>
            ) : (
              schedules.map((s) => (
                <View key={s.id} style={styles.scheduleRow}>
                  <Text style={styles.scheduleDay}>{getDayName(s.dayOfWeek)}</Text>
                  <Text style={styles.scheduleTime}>{s.openTime} – {s.closeTime}</Text>
                  <Text style={styles.schedulePrice}>{formatCurrency(s.basePrice)}/h</Text>
                </View>
              ))
            )}
          </Card>

          {/* Blocks */}
          <Card>
            <View style={styles.blockHeader}>
              <Text style={styles.sectionTitle}>Bloqueios</Text>
              <Button
                label="Adicionar"
                size="sm"
                variant="outline"
                onPress={() => {
                  const now = new Date();
                  const end = new Date(now.getTime() + 2 * 60 * 60 * 1000);
                  addBlockMutation.mutate({
                    startsAt: now.toISOString(),
                    endsAt: end.toISOString(),
                    reason: 'Manutenção',
                  });
                }}
              />
            </View>
            {blocks.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum bloqueio ativo.</Text>
            ) : (
              blocks.map((b) => (
                <View key={b.id} style={styles.blockItem}>
                  <Calendar size={14} color={colors.text.secondary} />
                  <Text style={styles.blockTime}>
                    {new Date(b.startsAt).toLocaleString('pt-BR')} – {new Date(b.endsAt).toLocaleString('pt-BR')}
                  </Text>
                  {b.reason && <Text style={styles.blockReason}>{b.reason}</Text>}
                </View>
              ))
            )}
          </Card>

          {/* Actions */}
          <Button
            label={court.status === 'active' ? 'Desativar quadra' : 'Ativar quadra'}
            variant={court.status === 'active' ? 'outline' : 'primary'}
            onPress={() => toggleStatusMutation.mutate()}
            loading={toggleStatusMutation.isPending}
            fullWidth
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  courtName: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text.primary },
  content: { padding: spacing.lg, gap: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.sm },
  infoLabel: { fontSize: 12, color: colors.text.secondary, marginTop: spacing.sm, marginBottom: 4 },
  infoValue: { fontSize: 14, color: colors.text.primary },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  rating: { fontSize: 14, fontWeight: '600', color: colors.text.primary, marginTop: spacing.sm },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.border },
  scheduleDay: { width: 48, fontSize: 13, fontWeight: '600', color: colors.text.primary },
  scheduleTime: { flex: 1, fontSize: 13, color: colors.text.secondary },
  schedulePrice: { fontSize: 13, fontWeight: '700', color: colors.primary[600] },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  blockItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  blockTime: { flex: 1, fontSize: 13, color: colors.text.secondary },
  blockReason: { fontSize: 12, color: colors.text.secondary },
  emptyText: { fontSize: 14, color: colors.text.secondary },
});
