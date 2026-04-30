import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Wallet as WalletIcon } from 'lucide-react-native';
import { FlatList, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { walletService } from '../../services/wallet.service';
import { colors, spacing } from '../../theme';
import { formatCurrency, formatDate } from '../../utils/format';

const txLabel: Record<string, string> = {
  booking_charge: 'Reserva',
  payout: 'Saque',
  refund: 'Reembolso',
  fee: 'Taxa',
  adjustment: 'Ajuste',
};

export default function WalletScreen() {
  const { data: wallet, isLoading: loadingWallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletService.get(),
  });

  const { data: transactions = [], isLoading: loadingTxs } = useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: () => walletService.getTransactions(),
  });

  if (loadingWallet) return <LoadingSpinner fullScreen />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Carteira</Text>
      </View>

      {/* Balance card */}
      <View style={styles.balanceCard}>
        <WalletIcon size={24} color={colors.white} />
        <Text style={styles.balanceLabel}>Saldo disponível</Text>
        <Text style={styles.balance}>{formatCurrency(wallet?.balance ?? 0)}</Text>
      </View>

      {/* Transactions */}
      <Text style={styles.sectionTitle}>Histórico</Text>

      {loadingTxs ? (
        <LoadingSpinner size="small" />
      ) : transactions.length === 0 ? (
        <Text style={styles.empty}>Nenhuma transação ainda.</Text>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => {
            const isCredit = item.type === 'refund' || item.type === 'adjustment';
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
                    {isCredit ? '+' : '-'} {formatCurrency(item.amount)}
                  </Text>
                </View>
              </Card>
            );
          }}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
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
