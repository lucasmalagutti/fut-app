import { MapPin, Star } from 'lucide-react-native';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { resolvePhotoUrl } from '../../services/courts.service';
import { colors, radius, spacing } from '../../theme';
import type { Court } from '../../types';
import { formatCurrency, formatDistance } from '../../utils/format';
import { Card } from '../ui/Card';
import { Chip } from '../ui/Chip';

interface CourtCardProps {
  court: Court;
  onPress?: () => void;
}

export function CourtCard({ court, onPress }: CourtCardProps) {
  const photo = court.photos?.[0]?.url ? resolvePhotoUrl(court.photos[0].url) : undefined;
  const minPrice = court.schedules?.reduce(
    (min: number, s) => Math.min(min, s.basePrice),
    Infinity
  );

  return (
    <Card onPress={onPress} style={styles.card} padding={0}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.imagePlaceholder]}>
          <Text style={styles.placeholderText}>⚽</Text>
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {court.name}
          </Text>
          {court.ratingCount > 0 && (
            <View style={styles.rating}>
              <Star size={13} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.ratingText}>{court.ratingAvg.toFixed(1)}</Text>
            </View>
          )}
        </View>

        <View style={styles.location}>
          <MapPin size={12} color={colors.text.secondary} />
          <Text style={styles.locationText} numberOfLines={1}>
            {court.city}
            {court.distance != null ? ` · ${formatDistance(court.distance)}` : ''}
          </Text>
        </View>

        <View style={styles.footer}>
          <Chip label={court.sport} style={styles.sportChip} />
          {minPrice != null && minPrice !== Infinity && (
            <Text style={styles.price}>{formatCurrency(minPrice)}/h</Text>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  image: { width: '100%', height: 160, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  imagePlaceholder: { backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  placeholderText: { fontSize: 48 },
  content: { padding: spacing.md, gap: spacing.xs },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 16, fontWeight: '700', color: colors.text.primary, flex: 1 },
  rating: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  location: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationText: { fontSize: 13, color: colors.text.secondary, flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  sportChip: { paddingHorizontal: spacing.sm, paddingVertical: 2 },
  price: { fontSize: 15, fontWeight: '700', color: colors.primary[600] },
});
