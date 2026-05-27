import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, spacing } from '../../theme';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string }> = {
  success: { bg: '#dcfce7', text: '#15803d' },
  warning: { bg: '#fef9c3', text: '#a16207' },
  error: { bg: '#fee2e2', text: '#b91c1c' },
  info: { bg: '#dbeafe', text: '#1d4ed8' },
  neutral: { bg: colors.neutral[100], text: colors.neutral[600] },
  primary: { bg: colors.primary[100], text: colors.primary[700] },
};

export function Badge({ label, variant = 'neutral', style }: BadgeProps) {
  const { bg, text } = variantStyles[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }, style]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

export function bookingStatusBadge(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    open: 'primary',
    pending: 'warning',
    confirmed: 'info',
    completed: 'success',
    cancelled: 'error',
  };
  return map[status] ?? 'neutral';
}

export function payStatusBadge(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    pending: 'warning',
    paid: 'success',
    refunded: 'info',
    failed: 'error',
  };
  return map[status] ?? 'neutral';
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.3 },
});
