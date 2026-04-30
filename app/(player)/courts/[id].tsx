import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, MapPin, Star } from 'lucide-react-native';
import { useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { courtsService } from '../../../services/courts.service';
import { colors, spacing } from '../../../theme';
import type { TimeSlot } from '../../../types';
import { formatCurrency, formatDate, getDayName } from '../../../utils/format';

export default function CourtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const { data: court, isLoading } = useQuery({
    queryKey: ['court', id],
    queryFn: () => courtsService.get(id),
  });

  const { data: slots = [], isLoading: loadingSlots } = useQuery({
    queryKey: ['availability', id, selectedDate],
    queryFn: () => courtsService.getAvailability(id, selectedDate),
    enabled: !!id && !!selectedDate,
  });

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => courtsService.getReviews(id),
  });

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!court) return null;

  const photos = court.photos ?? [];
  const amenities = Array.isArray(court.amenities)
    ? court.amenities
    : JSON.parse(court.amenities as unknown as string) ?? [];

  const dates = getNextDays(7);

  function handleBook() {
    if (!selectedSlot) return;
    router.push({
      pathname: '/(player)/booking/new',
      params: {
        courtId: court!.id,
        date: selectedDate,
        time: selectedSlot.time,
        price: String(selectedSlot.price),
      },
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Photo carousel */}
        <View style={styles.imageContainer}>
          {photos.length > 0 ? (
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(p) => p.id}
              renderItem={({ item }) => (
                <Image source={{ uri: item.url }} style={styles.image} resizeMode="cover" />
              )}
            />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Text style={{ fontSize: 64 }}>⚽</Text>
            </View>
          )}
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ChevronLeft size={24} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.content}>
          {/* Title */}
          <View style={styles.titleRow}>
            <Text style={styles.courtName}>{court.name}</Text>
            {court.ratingCount > 0 && (
              <View style={styles.ratingBadge}>
                <Star size={14} color="#f59e0b" fill="#f59e0b" />
                <Text style={styles.ratingText}>{court.ratingAvg.toFixed(1)}</Text>
                <Text style={styles.ratingCount}>({court.ratingCount})</Text>
              </View>
            )}
          </View>

          <View style={styles.locationRow}>
            <MapPin size={14} color={colors.primary[600]} />
            <Text style={styles.locationText}>
              {court.addressLine}, {court.city} – {court.state}
            </Text>
          </View>

          <Chip label={court.sport} style={{ alignSelf: 'flex-start' }} />

          {/* Description */}
          {court.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sobre</Text>
              <Text style={styles.description}>{court.description}</Text>
            </View>
          )}

          {/* Amenities */}
          {amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Comodidades</Text>
              <View style={styles.amenitiesRow}>
                {amenities.map((a: string, i: number) => (
                  <Chip key={i} label={a} />
                ))}
              </View>
            </View>
          )}

          {/* Rules */}
          {court.rules && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Regras</Text>
              <Text style={styles.description}>{court.rules}</Text>
            </View>
          )}

          {/* Date picker */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Escolha a data</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.datesRow}>
                {dates.map((d) => {
                  const isSelected = d.value === selectedDate;
                  return (
                    <Pressable
                      key={d.value}
                      onPress={() => { setSelectedDate(d.value); setSelectedSlot(null); }}
                      style={[styles.dateBtn, isSelected && styles.dateBtnSelected]}
                    >
                      <Text style={[styles.dateDayName, isSelected && styles.dateTextSelected]}>
                        {d.dayName}
                      </Text>
                      <Text style={[styles.dateDay, isSelected && styles.dateTextSelected]}>
                        {d.dayNum}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </View>

          {/* Time slots */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Horários disponíveis</Text>
            {loadingSlots ? (
              <LoadingSpinner size="small" />
            ) : slots.length === 0 ? (
              <Text style={styles.noSlots}>Nenhum horário disponível nesta data.</Text>
            ) : (
              <View style={styles.slotsGrid}>
                {slots.map((slot) => {
                  const isSelected = selectedSlot?.time === slot.time;
                  return (
                    <Pressable
                      key={slot.time}
                      disabled={!slot.available}
                      onPress={() => setSelectedSlot(slot)}
                      style={[
                        styles.slotBtn,
                        isSelected && styles.slotSelected,
                        !slot.available && styles.slotUnavailable,
                      ]}
                    >
                      <Text style={[styles.slotTime, isSelected && styles.slotTimeSelected, !slot.available && styles.slotTimeUnavailable]}>
                        {slot.time}
                      </Text>
                      <Text style={[styles.slotPrice, isSelected && styles.slotTimeSelected, !slot.available && styles.slotTimeUnavailable]}>
                        {formatCurrency(slot.price)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          {/* Reviews */}
          {reviews.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Avaliações</Text>
              {reviews.slice(0, 3).map((r) => (
                <Card key={r.id} style={styles.reviewCard}>
                  <View style={styles.reviewHeader}>
                    <Avatar name={r.from?.name} uri={r.from?.avatarUrl} size={32} />
                    <Text style={styles.reviewerName}>{r.from?.name}</Text>
                    <View style={styles.reviewRating}>
                      {Array.from({ length: r.rating }).map((_, i) => (
                        <Star key={i} size={12} color="#f59e0b" fill="#f59e0b" />
                      ))}
                    </View>
                  </View>
                  {r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
                </Card>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        {selectedSlot && (
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedTime}>{selectedDate} · {selectedSlot.time}</Text>
            <Text style={styles.selectedPrice}>{formatCurrency(selectedSlot.price)}</Text>
          </View>
        )}
        <Button
          label={selectedSlot ? 'Reservar agora' : 'Selecione um horário'}
          onPress={handleBook}
          disabled={!selectedSlot}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

function getTodayString() {
  return new Date().toISOString().split('T')[0]!;
}

function getNextDays(n: number) {
  const days = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      value: d.toISOString().split('T')[0]!,
      dayName: getDayName(d.getDay()),
      dayNum: d.getDate(),
    });
  }
  return days;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 280 },
  imagePlaceholder: { backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  backBtn: {
    position: 'absolute',
    top: 48,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { padding: spacing.lg, gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  courtName: { fontSize: 24, fontWeight: '800', color: colors.text.primary, flex: 1 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 14, fontWeight: '700', color: colors.text.primary },
  ratingCount: { fontSize: 13, color: colors.text.secondary },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  locationText: { fontSize: 14, color: colors.text.secondary, flex: 1 },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary },
  description: { fontSize: 14, color: colors.text.secondary, lineHeight: 22 },
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  datesRow: { flexDirection: 'row', gap: spacing.sm, paddingBottom: 4 },
  dateBtn: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    minWidth: 60,
  },
  dateBtnSelected: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  dateDayName: { fontSize: 11, fontWeight: '600', color: colors.text.secondary },
  dateDay: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
  dateTextSelected: { color: colors.white },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  slotBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    minWidth: 90,
  },
  slotSelected: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  slotUnavailable: { backgroundColor: colors.neutral[100], borderColor: colors.neutral[200] },
  slotTime: { fontSize: 14, fontWeight: '700', color: colors.text.primary },
  slotTimeSelected: { color: colors.white },
  slotTimeUnavailable: { color: colors.neutral[400] },
  slotPrice: { fontSize: 12, color: colors.text.secondary },
  noSlots: { fontSize: 14, color: colors.text.secondary },
  reviewCard: { marginBottom: spacing.sm },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  reviewerName: { fontSize: 14, fontWeight: '600', color: colors.text.primary, flex: 1 },
  reviewRating: { flexDirection: 'row', gap: 1 },
  reviewComment: { fontSize: 13, color: colors.text.secondary, lineHeight: 20 },
  bottomBar: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  selectedInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  selectedTime: { fontSize: 14, color: colors.text.secondary },
  selectedPrice: { fontSize: 18, fontWeight: '800', color: colors.primary[600] },
});
