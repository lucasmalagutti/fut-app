import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { useCallback } from 'react';
import { FlatList, RefreshControl, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { usePullToRefresh } from '../../../hooks/usePullToRefresh';
import { Avatar } from '../../../components/ui/Avatar';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { chatService } from '../../../services/chat.service';
import { useAuthStore } from '../../../store/auth.store';
import { colors, spacing } from '../../../theme';
import { formatRelativeTime } from '../../../utils/format';

export default function ChatListScreen() {
  const user = useAuthStore((s) => s.user);

  const { data: threads = [], isLoading, refetch } = useQuery({
    queryKey: ['chat-threads'],
    queryFn: () => chatService.listThreads(),
  });

  const refetchThreads = useCallback(() => refetch(), [refetch]);
  const { refreshing, onRefresh } = usePullToRefresh(refetchThreads);

  function getOtherUser(thread: (typeof threads)[0]) {
    return thread.userAId === user?.id ? thread.userB : thread.userA;
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Mensagens</Text>
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : threads.length === 0 ? (
        <EmptyState
          icon={<MessageCircle size={56} color={colors.neutral[400]} />}
          title="Nenhuma conversa"
          description="Inicie uma conversa com um dono de quadra ou jogador."
        />
      ) : (
        <FlatList
          data={threads}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => {
            const other = getOtherUser(item);
            return (
              <Card
                onPress={() =>
                  router.push({ pathname: '/(player)/chat/[threadId]', params: { threadId: item.id } })
                }
                style={styles.threadCard}
                elevated={false}
              >
                <View style={styles.threadRow}>
                  <Avatar name={other?.name} uri={other?.avatarUrl} size={48} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.threadHeader}>
                      <Text style={styles.threadName}>{other?.name ?? 'Usuário'}</Text>
                      {item.lastMessageAt && (
                        <Text style={styles.threadTime}>{formatRelativeTime(item.lastMessageAt)}</Text>
                      )}
                    </View>
                    {item.lastMessage && (
                      <Text style={styles.lastMessage} numberOfLines={1}>
                        {item.lastMessage.body}
                      </Text>
                    )}
                  </View>
                </View>
              </Card>
            );
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[600]} />
          }
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: 26, fontWeight: '800', color: colors.text.primary },
  list: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl },
  threadCard: { padding: spacing.md },
  threadRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  threadHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  threadName: { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  threadTime: { fontSize: 12, color: colors.text.secondary },
  lastMessage: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
});
