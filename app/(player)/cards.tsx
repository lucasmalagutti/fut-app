import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { CreditCard, Trash2 } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { RefreshableScrollView } from '../../components/ui/RefreshableScrollView';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { paymentsService } from '../../services/payments.service';
import { colors, spacing } from '../../theme';

export default function CardsScreen() {
  const queryClient = useQueryClient();
  const [pmId, setPmId] = useState('');

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
      Alert.alert('Sucesso', 'Cartão de teste Visa •••• 4242 salvo!');
    },
    onError: (err: unknown) => {
      const msg = (err as any)?.response?.data?.message ?? 'Erro ao criar cartão de teste.';
      Alert.alert('Erro', msg);
    },
  });

  const attachMutation = useMutation({
    mutationFn: (paymentMethodId: string) => paymentsService.attachCard(paymentMethodId.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      setPmId('');
      Alert.alert('Sucesso', 'Cartão salvo!');
    },
    onError: (err: unknown) => {
      const msg = (err as any)?.response?.data?.message ?? 'Não foi possível salvar o cartão.';
      Alert.alert('Erro', msg);
    },
  });

  const defaultMutation = useMutation({
    mutationFn: (id: string) => paymentsService.setDefaultCard(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => paymentsService.deleteCard(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cards'] }),
  });

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

        <Text style={styles.title}>Cartões salvos</Text>
        <Text style={styles.subtitle}>
          Em modo teste, use o botão abaixo ou cole um ID `pm_...` do Stripe.
        </Text>

        <Button
          label="Adicionar cartão de teste (Visa 4242)"
          onPress={() => testCardMutation.mutate()}
          loading={testCardMutation.isPending}
          style={{ marginBottom: spacing.md }}
        />

        <Card style={styles.addCard} elevated={false}>
          <Text style={styles.label}>ID do método de pagamento (pm_...)</Text>
          <TextInput
            style={styles.input}
            placeholder="pm_... ou pm_card_visa"
            value={pmId}
            onChangeText={setPmId}
            autoCapitalize="none"
          />
          <Button
            label="Salvar cartão"
            onPress={() => attachMutation.mutate(pmId)}
            loading={attachMutation.isPending}
            disabled={!pmId.trim()}
          />
        </Card>

        {cards.length === 0 ? (
          <Text style={styles.empty}>Nenhum cartão cadastrado.</Text>
        ) : (
          cards.map((c) => (
            <Card key={c.id} style={styles.cardRow} elevated={false}>
              <View style={styles.cardInfo}>
                <CreditCard size={20} color={colors.primary[600]} />
                <View>
                  <Text style={styles.cardBrand}>
                    {c.brand.toUpperCase()} •••• {c.last4}
                    {c.isDefault ? '  ★' : ''}
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
                <Pressable onPress={() => deleteMutation.mutate(c.id)}>
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
  addCard: { padding: spacing.md, gap: spacing.sm, marginBottom: spacing.lg },
  label: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    fontSize: 15,
    backgroundColor: colors.white,
  },
  empty: { textAlign: 'center', color: colors.text.secondary, padding: spacing.xl },
  cardRow: { padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  cardBrand: { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  cardExp: { fontSize: 12, color: colors.text.secondary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  link: { fontSize: 13, color: colors.primary[600], fontWeight: '600' },
});
