import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Button } from '../ui/Button';
import { paymentsService } from '../../services/payments.service';
import { colors, spacing } from '../../theme';
import { formatCurrency } from '../../utils/format';

interface Props {
  visible: boolean;
  paymentId: string;
  amount: number;
  qrCode?: string;
  qrCodeUrl?: string;
  title?: string;
  onPaid: () => void;
  onClose: () => void;
}

export function PixPaymentModal({
  visible,
  paymentId,
  amount,
  qrCode,
  qrCodeUrl,
  title = 'Pagamento PIX',
  onPaid,
  onClose,
}: Props) {
  const [polling, setPolling] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!visible || !paymentId) return;
    setPolling(true);
    const interval = setInterval(async () => {
      try {
        const { status } = await paymentsService.getStatus(paymentId);
        if (status === 'paid') {
          clearInterval(interval);
          setPolling(false);
          Alert.alert('Sucesso', 'Pagamento confirmado!');
          onPaid();
        }
      } catch {
        /* ignore */
      }
    }, 3000);
    return () => {
      clearInterval(interval);
      setPolling(false);
    };
  }, [visible, paymentId, onPaid]);

  const shareCode = () => {
    if (qrCode) Share.share({ message: qrCode });
  };

  const qrImageUrl =
    qrCodeUrl ??
    (qrCode
      ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrCode)}`
      : undefined);

  async function simulatePayment() {
    setConfirming(true);
    try {
      await paymentsService.confirmPayment(paymentId);
      Alert.alert('Sucesso', 'Pagamento simulado com sucesso!');
      onPaid();
    } catch {
      Alert.alert('Erro', 'Não foi possível confirmar o pagamento.');
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.amount}>{formatCurrency(amount)}</Text>

          {qrImageUrl ? (
            <Image source={{ uri: qrImageUrl }} style={styles.qr} resizeMode="contain" />
          ) : (
            <Text style={styles.hint}>QR Code indisponível. Use o código copia-e-cola abaixo.</Text>
          )}

          {qrCode ? (
            <Pressable onPress={shareCode} style={styles.codeBox}>
              <Text style={styles.codeLabel}>Toque para compartilhar o PIX</Text>
              <Text style={styles.code} numberOfLines={3}>
                {qrCode}
              </Text>
            </Pressable>
          ) : null}

          <Text style={styles.wait}>
            {polling ? 'Aguardando confirmação do pagamento...' : ''}
          </Text>

          <Button
            label="Simular PIX pago (teste)"
            variant="outline"
            onPress={simulatePayment}
            loading={confirming}
          />
          <Button label="Fechar" variant="ghost" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.xl,
    gap: spacing.md,
  },
  title: { fontSize: 20, fontWeight: '800', color: colors.text.primary },
  amount: { fontSize: 28, fontWeight: '800', color: colors.primary[600] },
  qr: { width: 220, height: 220, alignSelf: 'center' },
  hint: { fontSize: 14, color: colors.text.secondary, textAlign: 'center' },
  codeBox: {
    backgroundColor: colors.neutral[100],
    padding: spacing.md,
    borderRadius: 12,
  },
  codeLabel: { fontSize: 12, color: colors.text.secondary, marginBottom: 4 },
  code: { fontSize: 11, color: colors.text.primary },
  wait: { fontSize: 13, color: colors.text.secondary, textAlign: 'center', minHeight: 18 },
});
