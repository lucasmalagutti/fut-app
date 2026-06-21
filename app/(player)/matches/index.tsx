import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Users } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { mergeRefetch, usePullToRefresh } from '../../../hooks/usePullToRefresh';
import { matchesService } from '../../../services/matches.service';
import { colors, spacing } from '../../../theme';
import type { Match } from '../../../types';
import { formatCurrency, formatDate, formatTime } from '../../../utils/format';

type TabKey = 'open' | 'mine';

function matchStatusLabel(match: Match): { label: string; variant: 'success' | 'warning' | 'error' | 'neutral' } {
  if (match.booking?.status === 'cancelled') return { label: 'Cancelada', variant: 'error' };
  if (match.confirmedAt) return { label: 'Confirmada', variant: 'success' };
  if (match.closedAt) return { label: 'Fechada', variant: 'warning' };
  return { label: 'Aberta', variant: 'neutral' };
}

function MatchCard({
  match,
  onPress,
  showJoin,
  onJoin,
  joining,
}: {
  match: Match;
  onPress: () => void;
  showJoin?: boolean;
  onJoin?: () => void;
  joining?: boolean;
}) {
  const booking = match.booking;
  const totalSlots = match.totalSlots ?? 0;
  const estimatedQuota = match.estimatedQuota ?? 0;
  const { label, variant } = matchStatusLabel(match);

  const startsAt = booking?.startsAt;
  const endsAt = booking?.endsAt;

  return (
    <Pressable onPress={onPress}>
      <Card style={styles.matchCard}>
        <View style={styles.matchHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.matchSport}>{match.sport}</Text>
            <Text style={styles.courtName}>{booking?.court?.name ?? 'Quadra'}</Text>
            <Text style={styles.courtAddress}>
              {booking?.court?.addressLine ? `${booking.court.addressLine}, ${booking.court.city}` : ''}
            </Text>
          </View>
          <Badge label={label} variant={variant} />
        </View>

        <View style={styles.matchMeta}>
          {startsAt && (
            <Text style={styles.metaText}>
              📅 {formatDate(startsAt)} · {formatTime(startsAt)}–{endsAt ? formatTime(endsAt) : ''}
            </Text>
          )}
          <Text style={styles.metaText}>
            👥 {totalSlots}/{match.maxPlayers} vagas · mín. {match.minPlayers}
          </Text>
          {estimatedQuota > 0 && (
            <Text style={styles.quotaText}>
              {formatCurrency(estimatedQuota)}/jogador (estimado)
            </Text>
          )}
        </View>

        {showJoin && (
          <Button
            label={joining ? 'Entrando...' : 'Participar'}
            onPress={onJoin}
            loading={joining}
            size="sm"
            style={{ marginTop: spacing.xs }}
          />
        )}
      </Card>
    </Pressable>
  );
}

export default function MatchesScreen() {
  const [tab, setTab] = useState<TabKey>('open');
  const queryClient = useQueryClient();

  const { data: openMatches = [], isLoading: loadingOpen, refetch: refetchOpen } = useQuery({
    queryKey: ['matches', 'open'],
    queryFn: () => matchesService.findOpen(),
    enabled: tab === 'open',
  });

  const { data: myMatches = [], isLoading: loadingMine, refetch: refetchMine } = useQuery({
    queryKey: ['matches', 'mine'],
    queryFn: () => matchesService.findMine(),
    enabled: tab === 'mine',
  });

  const isLoading = tab === 'open' ? loadingOpen : loadingMine;
  const matches = tab === 'open' ? openMatches : myMatches;
  const refetchAll = useCallback(
    () => mergeRefetch(refetchOpen, refetchMine),
    [refetchOpen, refetchMine],
  );
  const { refreshing, onRefresh } = usePullToRefresh(refetchAll);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Partidas</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <Pressable
          style={[styles.tab, tab === 'open' && styles.tabActive]}
          onPress={() => setTab('open')}
        >
          <Text style={[styles.tabText, tab === 'open' && styles.tabTextActive]}>Abertas</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === 'mine' && styles.tabActive]}
          onPress={() => setTab('mine')}
        >
          <Text style={[styles.tabText, tab === 'mine' && styles.tabTextActive]}>Minhas</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : matches.length === 0 ? (
        <EmptyState
          icon={<Users size={56} color={colors.neutral[400]} />}
          title={tab === 'open' ? 'Nenhuma partida aberta' : 'Você não está em nenhuma partida'}
          description={
            tab === 'open'
              ? 'Quando jogadores criarem partidas públicas, elas aparecerão aqui.'
              : 'Reserve uma quadra e crie sua própria partida ou entre em uma existente.'
          }
          actionLabel={tab === 'mine' ? 'Buscar quadras' : undefined}
          onAction={tab === 'mine' ? () => router.push('/(player)') : undefined}
        />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(m) => m.id}
          renderItem={({ item }) => (
            <MatchCard
              match={item}
              onPress={() => router.push({ pathname: '/(player)/matches/[id]', params: { id: item.id } })}
              showJoin={tab === 'open' && !item.confirmedAt && !item.closedAt}
              onJoin={() =>
                router.push({ pathname: '/(player)/matches/[id]', params: { id: item.id } })
              }
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[600]} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: 26, fontWeight: '800', color: colors.text.primary },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.neutral[100],
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.white, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '600', color: colors.text.secondary },
  tabTextActive: { color: colors.primary[700] },

  list: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },

  matchCard: { gap: spacing.sm },
  matchHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  matchSport: { fontSize: 12, fontWeight: '700', color: colors.primary[600], textTransform: 'uppercase', letterSpacing: 0.8 },
  courtName: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginTop: 2 },
  courtAddress: { fontSize: 12, color: colors.text.secondary, marginTop: 1 },

  matchMeta: { gap: 3 },
  metaText: { fontSize: 13, color: colors.text.secondary },
  quotaText: { fontSize: 14, fontWeight: '700', color: colors.primary[600], marginTop: 2 },
});
