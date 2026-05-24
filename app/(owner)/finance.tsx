import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Plus, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { SelectPicker } from '../../components/ui/SelectPicker';
import { walletService } from '../../services/wallet.service';
import { colors, spacing } from '../../theme';
import { formatCurrency, formatDate } from '../../utils/format';

// ── Opções dos dropdowns ──────────────────────────────────────────────────────

const BANK_OPTIONS = [
  { label: '001 – Banco do Brasil', value: 'Banco do Brasil' },
  { label: '033 – Santander', value: 'Santander' },
  { label: '077 – Banco Inter', value: 'Banco Inter' },
  { label: '104 – Caixa Econômica Federal', value: 'Caixa Econômica Federal' },
  { label: '208 – BTG Pactual', value: 'BTG Pactual' },
  { label: '212 – Banco Original', value: 'Banco Original' },
  { label: '237 – Bradesco', value: 'Bradesco' },
  { label: '260 – Nubank', value: 'Nubank' },
  { label: '290 – PagBank', value: 'PagBank' },
  { label: '336 – C6 Bank', value: 'C6 Bank' },
  { label: '341 – Itaú', value: 'Itaú' },
  { label: '380 – PicPay', value: 'PicPay' },
  { label: '389 – Banco Mercantil', value: 'Banco Mercantil' },
  { label: '422 – Banco Safra', value: 'Banco Safra' },
  { label: '655 – Banco Votorantim (BV)', value: 'Banco BV' },
  { label: '748 – Sicredi', value: 'Sicredi' },
  { label: '756 – Sicoob', value: 'Sicoob' },
];

const ACCOUNT_TYPE_OPTIONS = [
  { label: 'Conta Corrente', value: 'corrente' },
  { label: 'Conta Poupança', value: 'poupança' },
];

// ── Tipos ────────────────────────────────────────────────────────────────────

interface BankForm {
  holderName: string;
  document: string;
  bank: string;
  agency: string;
  accountNumber: string;
  accountType: string;
  pixKey: string;
}

const DEFAULT_BANK_FORM: BankForm = {
  holderName: '',
  document: '',
  bank: '',
  agency: '',
  accountNumber: '',
  accountType: '',
  pixKey: '',
};

const txLabel: Record<string, string> = {
  booking_charge: 'Reserva recebida',
  payout: 'Saque',
  refund: 'Reembolso',
  fee: 'Taxa da plataforma',
  adjustment: 'Ajuste',
};

// ── Componente ────────────────────────────────────────────────────────────────

export default function OwnerFinanceScreen() {
  const queryClient = useQueryClient();
  const [showBankModal, setShowBankModal] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [bankForm, setBankForm] = useState<BankForm>({ ...DEFAULT_BANK_FORM });
  const [errors, setErrors] = useState<Partial<Record<keyof BankForm, string>>>({});

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

  const addBankMutation = useMutation({
    mutationFn: (data: Omit<BankForm, 'pixKey'> & { pixKey?: string }) =>
      walletService.addBankAccount(data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      setShowBankModal(false);
      setBankForm({ ...DEFAULT_BANK_FORM });
      setErrors({});
      Alert.alert('Sucesso', 'Conta bancária adicionada!');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Não foi possível adicionar a conta.';
      Alert.alert('Erro', msg);
    },
  });

  const deleteBankMutation = useMutation({
    mutationFn: (id: string) => walletService.deleteBankAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      Alert.alert('Conta removida');
    },
    onError: () => Alert.alert('Erro', 'Não foi possível remover a conta.'),
  });

  const payoutMutation = useMutation({
    mutationFn: (data: { bankAccountId: string; amount: number }) =>
      walletService.requestPayout(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      setShowPayoutModal(false);
      setPayoutAmount('');
      Alert.alert('Saque solicitado!', 'Seu saque será processado em breve.');
    },
    onError: (err: unknown) => {
      const msg = (err as any)?.response?.data?.message ?? 'Erro ao solicitar saque.';
      Alert.alert('Erro', msg);
    },
  });

  // ── Validação ───────────────────────────────────────────────────────────────

  function validateAndSubmit() {
    const newErrors: Partial<Record<keyof BankForm, string>> = {};

    if (bankForm.holderName.trim().length < 2)
      newErrors.holderName = 'Nome do titular obrigatório';
    if (bankForm.document.replace(/\D/g, '').length < 11)
      newErrors.document = 'CPF ou CNPJ inválido';
    if (!bankForm.bank)
      newErrors.bank = 'Selecione o banco';
    if (bankForm.agency.trim().length < 1)
      newErrors.agency = 'Agência obrigatória';
    if (bankForm.accountNumber.trim().length < 1)
      newErrors.accountNumber = 'Número da conta obrigatório';
    if (!bankForm.accountType)
      newErrors.accountType = 'Selecione o tipo de conta';

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    addBankMutation.mutate({
      holderName: bankForm.holderName.trim(),
      document: bankForm.document.replace(/\D/g, ''),
      bank: bankForm.bank,
      agency: bankForm.agency.trim(),
      accountNumber: bankForm.accountNumber.trim(),
      accountType: bankForm.accountType,
      pixKey: bankForm.pixKey.trim() || undefined,
    });
  }

  function closeModal() {
    setShowBankModal(false);
    setBankForm({ ...DEFAULT_BANK_FORM });
    setErrors({});
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loadingWallet) return <LoadingSpinner fullScreen />;

  const defaultAccount = bankAccounts[0];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Finanças</Text>
        </View>

        {/* Saldo */}
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

        {/* Contas bancárias */}
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
                <View style={styles.bankCardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bankName}>{acc.holderName}</Text>
                    <Text style={styles.bankInfo}>
                      {acc.bank} · Ag {acc.agency} · {acc.accountType === 'corrente' ? 'CC' : 'CP'} {acc.accountNumber}
                    </Text>
                    {acc.pixKey ? <Text style={styles.bankInfo}>PIX: {acc.pixKey}</Text> : null}
                  </View>
                  <TouchableOpacity
                    hitSlop={10}
                    onPress={() =>
                      Alert.alert('Remover conta', `Deseja remover a conta ${acc.bank}?`, [
                        { text: 'Cancelar', style: 'cancel' },
                        {
                          text: 'Remover',
                          style: 'destructive',
                          onPress: () => deleteBankMutation.mutate(acc.id),
                        },
                      ])
                    }
                  >
                    <Trash2 size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Histórico */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Histórico</Text>
          {transactions.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma transação ainda.</Text>
          ) : (
            transactions.map((item) => {
              const isCredit = ['booking_charge', 'refund', 'adjustment'].includes(item.type);
              return (
                <Card key={item.id} style={styles.txCard} elevated={false}>
                  <View style={styles.txRow}>
                    <View style={[styles.txIcon, isCredit ? styles.txIconCredit : styles.txIconDebit]}>
                      {isCredit
                        ? <ArrowDownLeft size={16} color={colors.success} />
                        : <ArrowUpRight size={16} color={colors.error} />
                      }
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

      {/* ── Modal: Nova conta bancária ── */}
      <Modal visible={showBankModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeModal}>
        <SafeAreaView style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nova conta bancária</Text>
            <TouchableOpacity onPress={closeModal} hitSlop={12}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">

            {/* Nome do titular */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nome do titular</Text>
              <TextInput
                style={[styles.textInput, errors.holderName ? styles.textInputError : null]}
                value={bankForm.holderName}
                onChangeText={(v) => { setBankForm((f) => ({ ...f, holderName: v })); setErrors((e) => ({ ...e, holderName: undefined })); }}
                placeholder="Nome completo"
                placeholderTextColor={colors.neutral[400]}
                autoCapitalize="words"
              />
              {errors.holderName ? <Text style={styles.errorText}>{errors.holderName}</Text> : null}
            </View>

            {/* CPF / CNPJ */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>CPF / CNPJ</Text>
              <TextInput
                style={[styles.textInput, errors.document ? styles.textInputError : null]}
                value={bankForm.document}
                onChangeText={(v) => { setBankForm((f) => ({ ...f, document: v })); setErrors((e) => ({ ...e, document: undefined })); }}
                placeholder="000.000.000-00"
                placeholderTextColor={colors.neutral[400]}
                keyboardType="numeric"
              />
              {errors.document ? <Text style={styles.errorText}>{errors.document}</Text> : null}
            </View>

            {/* Banco */}
            <SelectPicker
              label="Banco"
              value={bankForm.bank}
              options={BANK_OPTIONS}
              onChange={(v) => { setBankForm((f) => ({ ...f, bank: v })); setErrors((e) => ({ ...e, bank: undefined })); }}
              placeholder="Selecione o banco..."
              searchable
              error={errors.bank}
            />

            {/* Agência e Conta lado a lado */}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Agência</Text>
                  <TextInput
                    style={[styles.textInput, errors.agency ? styles.textInputError : null]}
                    value={bankForm.agency}
                    onChangeText={(v) => { setBankForm((f) => ({ ...f, agency: v })); setErrors((e) => ({ ...e, agency: undefined })); }}
                    placeholder="0000"
                    placeholderTextColor={colors.neutral[400]}
                    keyboardType="numeric"
                  />
                  {errors.agency ? <Text style={styles.errorText}>{errors.agency}</Text> : null}
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Conta</Text>
                  <TextInput
                    style={[styles.textInput, errors.accountNumber ? styles.textInputError : null]}
                    value={bankForm.accountNumber}
                    onChangeText={(v) => { setBankForm((f) => ({ ...f, accountNumber: v })); setErrors((e) => ({ ...e, accountNumber: undefined })); }}
                    placeholder="00000-0"
                    placeholderTextColor={colors.neutral[400]}
                    keyboardType="numeric"
                  />
                  {errors.accountNumber ? <Text style={styles.errorText}>{errors.accountNumber}</Text> : null}
                </View>
              </View>
            </View>

            {/* Tipo de conta */}
            <SelectPicker
              label="Tipo de conta"
              value={bankForm.accountType}
              options={ACCOUNT_TYPE_OPTIONS}
              onChange={(v) => { setBankForm((f) => ({ ...f, accountType: v })); setErrors((e) => ({ ...e, accountType: undefined })); }}
              placeholder="Selecione o tipo..."
              error={errors.accountType}
            />

            {/* Chave PIX */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Chave PIX (opcional)</Text>
              <TextInput
                style={styles.textInput}
                value={bankForm.pixKey}
                onChangeText={(v) => setBankForm((f) => ({ ...f, pixKey: v }))}
                placeholder="CPF, e-mail, telefone ou chave aleatória"
                placeholderTextColor={colors.neutral[400]}
                autoCapitalize="none"
              />
            </View>

            <Button
              label="Salvar conta"
              onPress={validateAndSubmit}
              loading={addBankMutation.isPending}
              fullWidth
              size="lg"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Modal: Solicitar saque ── */}
      <Modal visible={showPayoutModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBottom, { padding: spacing.xl, gap: spacing.lg }]}>
            <Text style={styles.modalTitle}>Solicitar saque</Text>
            <Text style={styles.balanceInfo}>Saldo disponível: {formatCurrency(wallet?.balance ?? 0)}</Text>
            {defaultAccount && (
              <Text style={styles.bankInfo}>
                Conta: {defaultAccount.bank} · {defaultAccount.accountNumber}
              </Text>
            )}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Valor do saque (R$)</Text>
              <TextInput
                style={styles.textInput}
                value={payoutAmount}
                onChangeText={setPayoutAmount}
                keyboardType="decimal-pad"
                placeholder="0,00"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: spacing.md }}>
              <Button label="Cancelar" variant="ghost" onPress={() => { setShowPayoutModal(false); setPayoutAmount(''); }} />
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

// ── Estilos ───────────────────────────────────────────────────────────────────

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
  bankCardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
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

  // Modal pageSheet (conta bancária)
  modalSheet: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
  modalClose: { fontSize: 20, color: colors.text.secondary },
  modalBody: { padding: spacing.lg, gap: spacing.md },

  // Modal overlay (saque)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBottom: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24 },

  // Campos
  row: { flexDirection: 'row', gap: spacing.md },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: colors.text.primary },
  textInput: {
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: 12,
    fontSize: 15, color: colors.text.primary, minHeight: 48,
  },
  textInputError: { borderColor: colors.error },
  errorText: { fontSize: 12, color: colors.error },
  balanceInfo: { fontSize: 15, color: colors.text.secondary },
});
