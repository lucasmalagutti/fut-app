import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  fullScreen?: boolean;
}

export function LoadingSpinner({ size = 'large', fullScreen = false }: LoadingSpinnerProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size={size} color={colors.primary[600]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 32, alignItems: 'center', justifyContent: 'center' },
  fullScreen: { flex: 1 },
});
