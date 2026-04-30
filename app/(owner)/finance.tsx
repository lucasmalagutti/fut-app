import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Plus } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { walletService } from '../../services/wallet.service';
import { colors, spacing } from '../../theme';
import { formatCurrency, formatDate } from '../../utils/format';

const bankSchema = z.object({
  holderName: z.string().min(2),
  document: z.string().min(11, 'CPF/CNPJ inválido'),
  bank: z.string().min(1),
  agency: z.string().min(4),
  accountNumber: z.string().min(5),
  accountType: z.string().min(1),
  pixKey: z.string().optional(),
});

type BankFormData = z.infer<typeof bankSchema>;

const txLabel: Record<string, string> = {
  booking_charge: 'Reserva recebida',
  payout: 'Saque',
  refund: 'Reembolso',
  fee: 'Taxa da plataforma',
  adjustment: 'Ajuste',
};

export default function OwnerFinanceScreen() {
  const queryClient = useQueryClient();
  const [showBankModal, setShowBankModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');

  const { data: wallet, isLoading: loadingWallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletService.get(),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['wallet-transactions'],
    queryFn: () => walletService.getTransactions(),
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: () => walletService.listBankAccounts(),
  });

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<BankFormData>({
    resolver: zodResolver(bankSchema),
  });

  const addBankMutation = useMutation({
    mutationFn: (data: BankFormData) => walletService.addBankAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      setShowBankModal(false);
      reset();
      Alert.alert('Conta bancária adicionada!');
    },
    onError: () => Alert.alert('Erro', 'Não foi possível adicionar a conta.'),
  });

  const payoutMutation = useMutation({
    mutationFn: (data: { bankAccountId: string; amount: number }) =>
      walletService.requestPayout(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      setShowPayoutModal(false);
      Alert.alert('Saque solicitado!', 'Seu saque será processado em breve.');
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao solicitar saque.';
      Alert.alert('Erro', msg);
    },
  });

  if (loadingWallet) return <LoadingSpinner fullScreen />;

  const defaultAccount = bankAccounts[0];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Finanças</Text>
        </View>

        {/* Balance card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Saldo disponível</Text>
          <Text style={styles.balance}>{formatCurrency(wallet?.balance ?? 0)}</Text>
          <Button
            label="Solicitar saque"
            variant="secondary"
            onPress={() => {
              if (bankAccounts.length === 0) {
                Alert.alert('Atenção', 'Cadastre uma conta bancária antes de sacar.', [
                  { text: 'Cadastrar', onPress: () => setShowBankModal(true) },
                  { text: 'Cancelar', style: 'cancel' },
                ]);
              } else {
                setShowPayoutModal(true);
              }
            }}
            style={{ alignSelf: 'flex-start' }}
          />
        </View>

        {/* Bank accounts */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Contas Bancárias</Text>
            <Button
              label="Adicionar"
              size="sm"
              variant="outline"
              icon={<Plus size={14} color={colors.primary[600]} />}
              onPress={() => setShowBankModal(true)}
            />
          </View>
          {bankAccounts.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma conta cadastrada.</Text>
          ) : (
            bankAccounts.map((acc) => (
              <Card key={acc.id} style={styles.bankCard}>
                <Text style={styles.bankName}>{acc.holderName}</Text>
                <Text style={styles.bankInfo}>{acc.bank} · Ag {acc.agency} · CC {acc.accountNumber}</Text>
                {acc.pixKey && <Text style={styles.bankInfo}>PIX: {acc.pixKey}</Text>}
              </Card>
            ))
          )}
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico</Text>
          {transactions.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma transação ainda.</Text>
          ) : (
            transactions.map((item) => {
              const isCredit = item.type === 'booking_charge' || item.type === 'refund' || item.type === 'adjustment';
              return (
                <Card key={item.id} style={styles.txCard} elevated={false}>
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
            })
          )}
        </View>
      </ScrollView>

      {/* Add bank account modal */}
      <Modal visible={showBankModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modal} contentContainerStyle={{ gap: spacing.md, padding: spacing.xl }}>
            <Text style={styles.modalTitle}>Nova conta bancária</Text>
            <Controller control={control} name="holderName" render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Nome do titular" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.holderName?.message} />
            )} />
            <Controller control={control} name="document" render={({ field: { onChange, onBlur, value } }) => (
              <Input label="CPF / CNPJ" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="numeric" error={errors.document?.message} />
            )} />
            <Controller control={control} name="bank" render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Banco" placeholder="Ex: Nubank, Itaú" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.bank?.message} />
            )} />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <View style={{ flex: 1 }}>
                <Controller control={control} name="agency" render={({ field: { onChange, onBlur, value } }) => (
                  <Input label="Agência" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="numeric" error={errors.agency?.message} />
                )} />
              </View>
              <View style={{ flex: 1 }}>
                <Controller control={control} name="accountNumber" render={({ field: { onChange, onBlur, value } }) => (
                  <Input label="Conta" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="numeric" error={errors.accountNumber?.message} />
                )} />
              </View>
            </View>
            <Controller control={control} name="accountType" render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Tipo (corrente/poupança)" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.accountType?.message} />
            )} />
            <Controller control={control} name="pixKey" render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Chave PIX (opcional)" value={value} onChangeText={onChange} onBlur={onBlur} />
            )} />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Button label="Cancelar" variant="ghost" onPress={() => setShowBankModal(false)} />
              <Button label="Salvar" onPress={handleSubmit((d) => addBankMutation.mutate(d))} loading={isSubmitting || addBankMutation.isPending} />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Payout modal */}
      <Modal visible={showPayoutModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { padding: spacing.xl, gap: spacing.lg }]}>
            <Text style={styles.modalTitle}>Solicitar saque</Text>
            <Text style={styles.balanceInfo}>Saldo disponível: {formatCurrency(wallet?.balance ?? 0)}</Text>
            {defaultAccount && (
              <Text style={styles.bankInfo}>
                Conta: {defaultAccount.bank} · {defaultAccount.accountNumber}
              </Text>
            )}
            <Input
              label="Valor do saque (R$)"
              value={payoutAmount}
              onChangeText={setPayoutAmount}
              keyboardType="decimal-pad"
              placeholder="0,00"
            />
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Button label="Cancelar" variant="ghost" onPress={() => setShowPayoutModal(false)} />
              <Button
                label="Confirmar"
                onPress={() => {
                  const amount = parseFloat(payoutAmount.replace(',', '.'));
                  if (!amount || amount <= 0) { Alert.alert('Valor inválido'); return; }
                  if (!defaultAccount) { Alert.alert('Sem conta bancária'); return; }
                  payoutMutation.mutate({ bankAccountId: defaultAccount.id, amount });
                }}
                loading={payoutMutation.isPending}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: 26, fontWeight: '800', color: colors.text.primary },
  balanceCard: {
    margin: spacing.lg, marginTop: spacing.sm,
    backgroundColor: colors.primary[600], borderRadius: 20,
    padding: spacing.xl, gap: spacing.sm,
  },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  balance: { fontSize: 36, fontWeight: '800', color: colors.white },
  section: { padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary },
  bankCard: { gap: 4 },
  bankName: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  bankInfo: { fontSize: 13, color: colors.text.secondary },
  emptyText: { fontSize: 14, color: colors.text.secondary },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
  balanceInfo: { fontSize: 15, color: colors.text.secondary },
});
