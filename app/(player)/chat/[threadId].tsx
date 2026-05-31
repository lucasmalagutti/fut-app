import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Send } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { mergeRefetch, usePullToRefresh } from '../../../hooks/usePullToRefresh';
import { Avatar } from '../../../components/ui/Avatar';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { chatService } from '../../../services/chat.service';
import { useAuthStore } from '../../../store/auth.store';
import { colors, spacing } from '../../../theme';
import { formatTime } from '../../../utils/format';
import type { ChatMessage } from '../../../types';

export default function ChatConversationScreen() {
  const { threadId } = useLocalSearchParams<{ threadId: string }>();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const { data: threads = [], refetch: refetchThreads } = useQuery({
    queryKey: ['chat-threads'],
    queryFn: () => chatService.listThreads(),
  });

  const thread = threads.find((t) => t.id === threadId);
  const otherUser = thread?.userAId === user?.id ? thread?.userB : thread?.userA;

  const { data: messages = [], isLoading, refetch: refetchMessages } = useQuery({
    queryKey: ['chat-messages', threadId],
    queryFn: () => chatService.getMessages(threadId),
    refetchInterval: 5000,
  });

  const refetchAll = useCallback(
    () => mergeRefetch(refetchThreads, refetchMessages),
    [refetchThreads, refetchMessages],
  );
  const { refreshing, onRefresh } = usePullToRefresh(refetchAll);

  const sendMutation = useMutation({
    mutationFn: (body: string) => chatService.sendMessage(threadId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages', threadId] });
      queryClient.invalidateQueries({ queryKey: ['chat-threads'] });
    },
  });

  const handleSend = () => {
    if (!message.trim()) return;
    const body = message.trim();
    setMessage('');
    sendMutation.mutate(body);
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.text.primary} />
          </Pressable>
          {otherUser && <Avatar name={otherUser.name} uri={otherUser.avatarUrl} size={36} />}
          <Text style={styles.headerName}>{otherUser?.name ?? 'Conversa'}</Text>
        </View>

        {/* Messages */}
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            renderItem={({ item }) => {
              const isMe = item.senderId === user?.id;
              return (
                <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleOther]}>
                  <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.body}</Text>
                  <Text style={[styles.bubbleTime, isMe && styles.bubbleTimeMe]}>
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
              );
            }}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[600]} />
            }
          />
        )}

        {/* Input */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Mensagem..."
            placeholderTextColor={colors.neutral[400]}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
          />
          <Pressable
            onPress={handleSend}
            disabled={!message.trim() || sendMutation.isPending}
            style={[styles.sendBtn, (!message.trim()) && styles.sendBtnDisabled]}
          >
            <Send size={20} color={colors.white} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  backBtn: { padding: 4 },
  headerName: { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  messageList: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  bubble: {
    maxWidth: '75%',
    padding: spacing.sm + 2,
    borderRadius: 14,
    gap: 2,
  },
  bubbleMe: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary[600],
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    alignSelf: 'flex-start',
    backgroundColor: colors.white,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleText: { fontSize: 15, color: colors.text.primary },
  bubbleTextMe: { color: colors.white },
  bubbleTime: { fontSize: 10, color: colors.text.secondary, alignSelf: 'flex-end' },
  bubbleTimeMe: { color: 'rgba(255,255,255,0.7)' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    backgroundColor: colors.neutral[100],
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text.primary,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});
