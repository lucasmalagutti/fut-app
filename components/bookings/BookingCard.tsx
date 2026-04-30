import { Calendar, Clock } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '../../theme';
import type { Booking } from '../../types';
import { formatCurrency, formatDate, formatTime } from '../../utils/format';
import { Badge, bookingStatusBadge } from '../ui/Badge';
import { Card } from '../ui/Card';

const statusLabel: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmada',
  completed: 'Concluída',
  cancelled: 'Cancelada',
};

interface BookingCardProps {
  booking: Booking;
  onPress?: () => void;
}

export function BookingCard({ booking, onPress }: BookingCardProps) {
  return (
    <Card onPress={onPress}>
      <View style={styles.header}>
        <Text style={styles.courtName} numberOfLines={1}>
          {booking.court?.name ?? 'Quadra'}
        </Text>
        <Badge
          label={statusLabel[booking.status] ?? booking.status}
          variant={bookingStatusBadge(booking.status)}
        />
      </View>

      <View style={styles.info}>
        <View style={styles.infoRow}>
          <Calendar size={14} color={colors.text.secondary} />
          <Text style={styles.infoText}>{formatDate(booking.startsAt)}</Text>
        </View>
        <View style={styles.infoRow}>
          <Clock size={14} color={colors.text.secondary} />
          <Text style={styles.infoText}>
            {formatTime(booking.startsAt)} – {formatTime(booking.endsAt)}
          </Text>
        </View>
      </View>

      <Text style={styles.price}>{formatCurrency(booking.totalPrice)}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  courtName: { fontSize: 16, fontWeight: '700', color: colors.text.primary, flex: 1, marginRight: spacing.sm },
  info: { gap: spacing.xs, marginBottom: spacing.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 13, color: colors.text.secondary },
  price: { fontSize: 17, fontWeight: '700', color: colors.primary[600] },
});
