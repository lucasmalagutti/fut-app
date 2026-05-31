import { CreditCard, Wallet } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../theme';
import type { Card, PayMethod } from '../../types';
import { formatCurrency } from '../../utils/format';

export type AutoPayMethod = Extract<PayMethod, 'wallet' | 'card'>;

interface PaymentMethodPickerProps {
  method: AutoPayMethod;
  onMethodChange: (method: AutoPayMethod) => void;
  cardId?: string;
  onCardIdChange: (cardId: string) => void;
  cards: Card[];
  walletBalance?: number;
  disabled?: boolean;
}

export function PaymentMethodPicker({
  method,
  onMethodChange,
  cardId,
  onCardIdChange,
  cards,
  walletBalance = 0,
  disabled,
}: PaymentMethodPickerProps) {
  const canWallet = walletBalance > 0;

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Pagamento da sua cota</Text>
      <Text style={styles.hint}>
        Será cobrado automaticamente 2 horas antes do horário da partida.
      </Text>

      <Pressable
        disabled={disabled}
        onPress={() => onMethodChange('wallet')}
        style={[styles.option, method === 'wallet' && styles.optionSelected]}
      >
        <Wallet size={20} color={method === 'wallet' ? colors.primary[700] : colors.text.secondary} />
        <View style={styles.optionText}>
          <Text style={[styles.optionLabel, method === 'wallet' && styles.optionLabelSelected]}>
            Saldo da carteira
          </Text>
          <Text style={styles.optionSub}>
            Disponível: {formatCurrency(walletBalance)}
            {!canWallet ? ' · recarregue para usar' : ''}
          </Text>
        </View>
      </Pressable>

      <Pressable
        disabled={disabled || cards.length === 0}
        onPress={() => {
          onMethodChange('card');
          if (!cardId && cards.length > 0) {
            const def = cards.find((c) => c.isDefault) ?? cards[0];
            onCardIdChange(def.id);
          }
        }}
        style={[
          styles.option,
          method === 'card' && styles.optionSelected,
          cards.length === 0 && styles.optionDisabled,
        ]}
      >
        <CreditCard size={20} color={method === 'card' ? colors.primary[700] : colors.text.secondary} />
        <View style={styles.optionText}>
          <Text style={[styles.optionLabel, method === 'card' && styles.optionLabelSelected]}>
            Cartão salvo
          </Text>
          <Text style={styles.optionSub}>
            {cards.length === 0
              ? 'Cadastre um cartão em Carteira → Cartões'
              : 'Cobrança no cartão escolhido'}
          </Text>
        </View>
      </Pressable>

      {method === 'card' && cards.length > 0 && (
        <View style={styles.cardsList}>
          {cards.map((c) => (
            <Pressable
              key={c.id}
              disabled={disabled}
              onPress={() => onCardIdChange(c.id)}
              style={[styles.cardRow, cardId === c.id && styles.cardRowSelected]}
            >
              <Text style={styles.cardText}>
                {c.brand} •••• {c.last4}
                {c.isDefault ? ' (padrão)' : ''}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  title: { fontSize: 17, fontWeight: '700', color: colors.text.primary },
  hint: { fontSize: 13, color: colors.text.secondary, lineHeight: 18, marginBottom: spacing.xs },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  optionSelected: { borderColor: colors.primary[600], backgroundColor: colors.primary[50] },
  optionDisabled: { opacity: 0.5 },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15, fontWeight: '600', color: colors.text.secondary },
  optionLabelSelected: { color: colors.primary[700] },
  optionSub: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  cardsList: { gap: spacing.xs, marginLeft: spacing.sm },
  cardRow: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardRowSelected: { borderColor: colors.primary[600], backgroundColor: colors.primary[50] },
  cardText: { fontSize: 14, color: colors.text.primary },
});
