import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CreditCard, Plus, Trash2 } from 'lucide-react-native';
import { useCallback } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { RefreshableScrollView } from '../../components/ui/RefreshableScrollView';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { paymentsService } from '../../services/payments.service';
import { colors, spacing } from '../../theme';

export default function CardsScreen() {
  const queryClient = useQueryClient();

  const { data: cards = [], isLoading, refetch } = useQuery({
    queryKey: ['cards'],
    queryFn: () => paymentsService.listCards(),
  });

  const refetchCards = useCallback(() => refetch(), [refetch]);
  const { refreshing, onRefresh } = usePullToRefresh(refetchCards);

  const testCardMutation = useMutation({
    mutationFn: () => paymentsService.attachTestCard(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      Alert.alert('Sucesso', 'Cartão Visa •••• 4242 cadastrado!');
    },
    onError: (err: unknown) => {
      const msg = (err as any)?.response?.data?.message ?? 'Erro ao cadastrar cartão.';
      Alert.alert('Erro', msg);
    },
  });

  const defaultMutation = useMutation({
    mutationFn: (id: string) => paymentsService.setDefaultCard(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => paymentsService.deleteCard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      Alert.alert('Cartão removido');
    },
    onError: () => Alert.alert('Erro', 'Não foi possível remover o cartão.'),
  });

  function handleDelete(cardId: string, label: string) {
    Alert.alert('Excluir cartão', `Remover ${label}?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate(cardId) },
    ]);
  }

  if (isLoading && cards.length === 0) return <LoadingSpinner fullScreen />;

  return (
    <SafeAreaView style={styles.safe}>
      <RefreshableScrollView
        contentContainerStyle={styles.scroll}
        refreshing={refreshing}
        onRefresh={onRefresh}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Voltar</Text>
        </Pressable>

        <Text style={styles.title}>Meus cartões</Text>
        <Text style={styles.subtitle}>
          Cadastre cartões para pagar reservas e cotas de partidas automaticamente.
        </Text>

        <Button
          label="Adicionar cartão"
          icon={<Plus size={18} color={colors.white} />}
          onPress={() => testCardMutation.mutate()}
          loading={testCardMutation.isPending}
          fullWidth
          style={{ marginBottom: spacing.lg }}
        />

        {cards.length === 0 ? (
          <EmptyState
            icon={<CreditCard size={56} color={colors.neutral[400]} />}
            title="Nenhum cartão"
            description="Adicione um cartão para usar em reservas e partidas."
            actionLabel="Adicionar cartão"
            onAction={() => testCardMutation.mutate()}
          />
        ) : (
          cards.map((c) => (
            <Card key={c.id} style={styles.cardRow} elevated={false}>
              <View style={styles.cardInfo}>
                <CreditCard size={20} color={colors.primary[600]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardBrand}>
                    {c.brand.toUpperCase()} •••• {c.last4}
                    {c.isDefault ? '  ★ Padrão' : ''}
                  </Text>
                  <Text style={styles.cardExp}>
                    {c.holderName} — {String(c.expMonth).padStart(2, '0')}/{c.expYear}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                {!c.isDefault && (
                  <Pressable onPress={() => defaultMutation.mutate(c.id)}>
                    <Text style={styles.link}>Padrão</Text>
                  </Pressable>
                )}
                <Pressable
                  onPress={() =>
                    handleDelete(c.id, `${c.brand.toUpperCase()} •••• ${c.last4}`)
                  }
                >
                  <Trash2 size={18} color={colors.error} />
                </Pressable>
              </View>
            </Card>
          ))
        )}
      </RefreshableScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  backBtn: { marginBottom: spacing.md },
  backText: { fontSize: 15, color: colors.primary[600], fontWeight: '600' },
  title: { fontSize: 26, fontWeight: '800', color: colors.text.primary },
  subtitle: { fontSize: 14, color: colors.text.secondary, marginTop: spacing.xs, marginBottom: spacing.lg },
  cardRow: { padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  cardBrand: { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  cardExp: { fontSize: 12, color: colors.text.secondary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  link: { fontSize: 13, color: colors.primary[600], fontWeight: '600' },
});
