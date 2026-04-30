import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell } from 'lucide-react-native';
import { FlatList, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { notificationsService } from '../../services/notifications.service';
import { colors, spacing } from '../../theme';
import { formatRelativeTime } from '../../utils/format';

const typeLabel: Record<string, string> = {
  invite: 'Convite para partida',
  booking_confirmed: 'Reserva confirmada',
  booking_reminder: 'Lembrete de reserva',
  payment_received: 'Pagamento recebido',
  user_banned: 'Conta suspensa',
  user_warned: 'Advertência',
};

export default function NotificationsScreen() {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsService.list(),
  });

  const readAllMutation = useMutation({
    mutationFn: () => notificationsService.readAll(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Notificações</Text>
        {unreadCount > 0 && (
          <Button
            label="Marcar todas como lidas"
            variant="ghost"
            size="sm"
            onPress={() => readAllMutation.mutate()}
            loading={readAllMutation.isPending}
          />
        )}
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell size={56} color={colors.neutral[400]} />}
          title="Sem notificações"
          description="Você não tem notificações no momento."
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => {
            const isUnread = !item.readAt;
            return (
              <Pressable style={[styles.item, isUnread && styles.unread]}>
                <View style={[styles.dot, !isUnread && styles.dotRead]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {typeLabel[item.type] ?? item.type}
                  </Text>
                  <Text style={styles.itemTime}>{formatRelativeTime(item.createdAt)}</Text>
                </View>
              </Pressable>
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg },
  title: { fontSize: 26, fontWeight: '800', color: colors.text.primary },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  unread: { backgroundColor: colors.primary[50] },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary[600] },
  dotRead: { backgroundColor: colors.neutral[300] },
  itemTitle: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  itemTime: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
});
