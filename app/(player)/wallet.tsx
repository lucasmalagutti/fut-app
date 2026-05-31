import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { ArrowDownLeft, ArrowUpRight, CreditCard, Plus, Wallet as WalletIcon } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { mergeRefetch, usePullToRefresh } from '../../hooks/usePullToRefresh';
import { PixPaymentModal } from '../../components/payments/PixPaymentModal';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { paymentsService } from '../../services/payments.service';
import { walletService } from '../../services/wallet.service';
import { colors, spacing } from '../../theme';
import { formatCurrency, formatDate } from '../../utils/format';

const txLabel: Record<string, string> = {
  booking_charge: 'Reserva',
  payout: 'Saque',
  refund: 'Reembolso',
  fee: 'Taxa',
  adjustment: 'Ajuste',
  deposit: 'Recarga PIX',
};

export default function WalletScreen() {
  const queryClient = useQueryClient();
  const [topUpAmount, setTopUpAmount] = useState('50');
  const [pixModal, setPixModal] = useState<{
    paymentId: string;
    amount: number;
    qrCode?: string;
    qrCodeUrl?: string;
  } | null>(null);

  const { data: wallet, isLoading: loadingWallet, refetch: refetchWallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletService.get(),
  });

  const { data: transactions = [], isLoading: loadingTxs, refetch: refetchTxs } = useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: () => walletService.getTransactions(),
  });

  const refetchAll = useCallback(
    () => mergeRefetch(refetchWallet, refetchTxs),
    [refetchWallet, refetchTxs],
  );
  const { refreshing, onRefresh } = usePullToRefresh(refetchAll);

  const topUpMutation = useMutation({
    mutationFn: (amount: number) => paymentsService.topUpWallet(amount),
    onSuccess: (res) => {
      setPixModal({
        paymentId: res.paymentId,
        amount: Number(topUpAmount),
        qrCode: res.qrCode,
        qrCodeUrl: res.qrCodeUrl,
      });
    },
    onError: (err: unknown) => {
      const msg = (err as any)?.response?.data?.message ?? 'Erro ao gerar PIX.';
      Alert.alert('Erro', msg);
    },
  });

  const balance = wallet?.balance ?? 0;

  const listHeader = (
    <>
      <View style={styles.balanceCard}>
        <WalletIcon size={24} color={colors.white} />
        <Text style={styles.balanceLabel}>Saldo disponível</Text>
        <Text style={styles.balance}>{formatCurrency(balance)}</Text>
      </View>

      <View style={styles.actionsRow}>
        <Pressable style={styles.actionBtn} onPress={() => router.push('/(player)/cards')}>
          <CreditCard size={20} color={colors.primary[600]} />
          <Text style={styles.actionText}>Cartões</Text>
        </Pressable>
      </View>

      <Card style={styles.topUpCard} elevated={false}>
        <Text style={styles.sectionTitle}>Recarregar com PIX</Text>
        <TextInput
          style={styles.input}
          keyboardType="decimal-pad"
          value={topUpAmount}
          onChangeText={setTopUpAmount}
          placeholder="Valor (mín. R$ 5)"
        />
        <Button
          label="Gerar PIX"
          icon={<Plus size={18} color={colors.white} />}
          onPress={() => {
            const v = parseFloat(topUpAmount.replace(',', '.'));
            if (isNaN(v) || v < 5) {
              Alert.alert('Valor inválido', 'Informe pelo menos R$ 5,00.');
              return;
            }
            topUpMutation.mutate(v);
          }}
          loading={topUpMutation.isPending}
        />
      </Card>

      <Text style={styles.sectionTitle}>Histórico</Text>
    </>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Carteira</Text>
      </View>

      {loadingWallet && !wallet ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(t) => t.id}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            loadingTxs ? (
              <LoadingSpinner size="small" />
            ) : (
              <Text style={styles.empty}>Nenhuma transação ainda.</Text>
            )
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[600]} />
          }
          renderItem={({ item }) => {
            const isCredit = item.type === 'refund' || item.type === 'adjustment' || item.type === 'deposit';
            return (
              <Card style={styles.txCard} elevated={false}>
                <View style={styles.txRow}>
                  <View style={[styles.txIcon, isCredit ? styles.txIconCredit : styles.txIconDebit]}>
                    {isCredit ? (
                      <ArrowDownLeft size={16} color={colors.success} />
                    ) : (
                      <ArrowUpRight size={16} color={colors.error} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txLabel}>{txLabel[item.type] ?? item.type}</Text>
                    <Text style={styles.txDate}>{formatDate(item.createdAt)}</Text>
                  </View>
                  <Text style={[styles.txAmount, isCredit ? styles.txAmountCredit : styles.txAmountDebit]}>
                    {isCredit ? '+' : '-'} {formatCurrency(Math.abs(item.amount))}
                  </Text>
                </View>
              </Card>
            );
          }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {pixModal && (
        <PixPaymentModal
          visible
          paymentId={pixModal.paymentId}
          amount={pixModal.amount}
          qrCode={pixModal.qrCode}
          qrCodeUrl={pixModal.qrCodeUrl}
          title="Recarga PIX"
          onPaid={() => {
            setPixModal(null);
            queryClient.invalidateQueries({ queryKey: ['wallet'] });
            queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
          }}
          onClose={() => setPixModal(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm },
  title: { fontSize: 26, fontWeight: '800', color: colors.text.primary },
  balanceCard: {
    margin: spacing.lg,
    marginTop: spacing.sm,
    backgroundColor: colors.primary[600],
    borderRadius: 20,
    padding: spacing.xl,
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  balance: { fontSize: 36, fontWeight: '800', color: colors.white },
  actionsRow: { flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.md, marginBottom: spacing.md },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionText: { fontSize: 14, fontWeight: '600', color: colors.primary[600] },
  topUpCard: { marginHorizontal: spacing.lg, padding: spacing.md, gap: spacing.sm, marginBottom: spacing.lg },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    fontSize: 16,
    backgroundColor: colors.white,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  list: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl },
  txCard: { padding: spacing.md },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  txIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txIconCredit: { backgroundColor: '#dcfce7' },
  txIconDebit: { backgroundColor: '#fee2e2' },
  txLabel: { fontSize: 14, fontWeight: '600', color: colors.text.primary },
  txDate: { fontSize: 12, color: colors.text.secondary },
  txAmount: { fontSize: 15, fontWeight: '700' },
  txAmountCredit: { color: colors.success },
  txAmountDebit: { color: colors.error },
  empty: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', padding: spacing.xl },
});
