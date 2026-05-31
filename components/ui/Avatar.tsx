import React from 'react';
import { Image, ImageStyle, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { resolveMediaUrl } from '../../utils/media';
import { colors, radius } from '../../theme';
import { getInitials } from '../../utils/format';

interface AvatarProps {
  name?: string;
  uri?: string | null;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ name, uri, size = 40, style }: AvatarProps) {
  const initials = name ? getInitials(name) : '?';
  const fontSize = size * 0.38;

  if (uri) {
    return (
      <Image
        source={{ uri: resolveMediaUrl(uri) }}
        style={[{ width: size, height: size, borderRadius: size / 2 } as ImageStyle, style as ImageStyle]}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.white,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
