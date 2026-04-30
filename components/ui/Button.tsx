import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { colors, radius, spacing } from '../../theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
  icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' || variant === 'ghost' ? colors.primary[600] : colors.white}
          size="small"
        />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`]]}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
  },
  fullWidth: { width: '100%' },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },

  primary: { backgroundColor: colors.primary[600] },
  secondary: { backgroundColor: colors.neutral[100] },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary[600],
  },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.error },

  size_sm: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs + 2, minHeight: 36 },
  size_md: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2, minHeight: 44 },
  size_lg: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, minHeight: 52 },

  label: { fontWeight: '600', letterSpacing: 0.2 },
  label_primary: { color: colors.white },
  label_secondary: { color: colors.neutral[800] },
  label_outline: { color: colors.primary[600] },
  label_ghost: { color: colors.primary[600] },
  label_danger: { color: colors.white },

  labelSize_sm: { fontSize: 13 },
  labelSize_md: { fontSize: 15 },
  labelSize_lg: { fontSize: 16 },
});
