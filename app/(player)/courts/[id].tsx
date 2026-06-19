import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Clock, ExternalLink, MapPin, Star, Users } from 'lucide-react-native';
import { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Avatar } from '../../../components/ui/Avatar';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { RefreshableScrollView } from '../../../components/ui/RefreshableScrollView';
import { mergeRefetch, usePullToRefresh } from '../../../hooks/usePullToRefresh';
import { courtsService, resolvePhotoUrl } from '../../../services/courts.service';
import { matchesService } from '../../../services/matches.service';
import { colors, spacing } from '../../../theme';
import { formatCurrency, formatTime, getDayName } from '../../../utils/format';

const { width: SCREEN_W } = Dimensions.get('window');

// ── Tipos locais ──────────────────────────────────────────────────────────────

interface MinuteSlot {
  minutes: number; // minutos desde meia-noite
  label: string;   // "HH:MM"
  available: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function toLabel(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function getTodayString(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

/** Gera pontos de 30 em 30 min entre openTime e closeTime.
 *  Quando isToday=true, slots cujo fim já passou são marcados indisponíveis. */
function buildMinuteSlots(availability: any, isToday = false): MinuteSlot[] {
  if (!availability?.open || !availability.openTime || !availability.closeTime) return [];

  const start = toMinutes(availability.openTime);
  const end = toMinutes(availability.closeTime);

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const unavailable: { start: number; end: number }[] = (availability.unavailable ?? []).map((w: any) => {
    const s = new Date(w.startsAt);
    const e = new Date(w.endsAt);
    return {
      start: s.getUTCHours() * 60 + s.getUTCMinutes(),
      end: e.getUTCHours() * 60 + e.getUTCMinutes(),
    };
  });

  const slots: MinuteSlot[] = [];
  for (let m = start; m < end; m += 30) {
    const blocked = unavailable.some((w) => m < w.end && m + 30 > w.start);
    // Bloqueia slots que já passaram quando a data selecionada é hoje
    const isPast = isToday && m + 30 <= nowMinutes;
    slots.push({ minutes: m, label: toLabel(m), available: !blocked && !isPast });
  }
  return slots;
}

/** Calendário — gera as semanas do mês */
function buildCalendar(year: number, month: number): (Date | null)[][] {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Dom
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function dateToString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function dateKeyFromISO(iso: string): string {
  const d = new Date(iso);
  return dateToString(d);
}

const WEEK_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_LABELS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// ── Componente ────────────────────────────────────────────────────────────────

export default function CourtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [startSlot, setStartSlot] = useState<MinuteSlot | null>(null);
  const [endSlot, setEndSlot] = useState<MinuteSlot | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  const { data: court, isLoading, refetch: refetchCourt } = useQuery({
    queryKey: ['court', id],
    queryFn: () => courtsService.get(id),
  });

  const { data: availability, isLoading: loadingSlots, refetch: refetchAvail } = useQuery({
    queryKey: ['availability', id, selectedDate],
    queryFn: () => courtsService.getAvailability(id, selectedDate),
    enabled: !!id && !!selectedDate,
  });

  const { data: reviews = [], refetch: refetchReviews } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => courtsService.getReviews(id),
  });

  const { data: openMatchesRaw = [], refetch: refetchMatches } = useQuery({
    queryKey: ['matches', 'open', id, selectedDate],
    queryFn: () => matchesService.findOpen({ courtId: id, date: selectedDate }),
    enabled: !!id && !!selectedDate,
  });

  const openMatches = openMatchesRaw.filter(
    (match) => match.booking?.startsAt && dateKeyFromISO(match.booking.startsAt) === selectedDate,
  );

  const refetchAll = useCallback(
    () => mergeRefetch(refetchCourt, refetchAvail, refetchReviews, refetchMatches),
    [refetchCourt, refetchAvail, refetchReviews, refetchMatches],
  );
  const { refreshing, onRefresh } = usePullToRefresh(refetchAll);

  if (isLoading && !court) return <LoadingSpinner fullScreen />;
  if (!court) return null;

  const photos = court.photos ?? [];
  const amenities = Array.isArray(court.amenities)
    ? court.amenities
    : (() => { try { return JSON.parse(court.amenities as any); } catch { return []; } })();

  const minuteSlots = buildMinuteSlots(availability, selectedDate === getTodayString());
  const pricePerHour = availability?.pricePerHour ?? 0;

  // Calcula total: (endSlot - startSlot) / 60 * preço/hora
  const durationMinutes = startSlot && endSlot ? endSlot.minutes - startSlot.minutes : 0;
  const totalPrice = durationMinutes > 0 ? (durationMinutes / 60) * pricePerHour : 0;

  // Um slot é selecionável como END se: está após o start, e todos os slots entre start e ele são disponíveis
  function isValidEnd(slot: MinuteSlot): boolean {
    if (!startSlot || slot.minutes <= startSlot.minutes) return false;
    const between = minuteSlots.filter(
      (s) => s.minutes > startSlot.minutes && s.minutes < slot.minutes
    );
    return between.every((s) => s.available);
  }

  function handleSlotPress(slot: MinuteSlot) {
    if (!slot.available && !startSlot) return;
    if (!startSlot) {
      setStartSlot(slot);
      setEndSlot(null);
      return;
    }
    // Se clicar no mesmo, desmarca
    if (slot.minutes === startSlot.minutes) {
      setStartSlot(null);
      setEndSlot(null);
      return;
    }
    // Se for um end válido
    if (isValidEnd(slot)) {
      setEndSlot(slot);
      return;
    }
    // Caso contrário, redefine como novo start
    if (slot.available) {
      setStartSlot(slot);
      setEndSlot(null);
    }
  }

  function slotStyle(slot: MinuteSlot) {
    if (!slot.available) return [styles.slotBtn, styles.slotUnavailable];
    if (startSlot && endSlot && slot.minutes >= startSlot.minutes && slot.minutes < endSlot.minutes)
      return [styles.slotBtn, styles.slotInRange];
    if (startSlot && slot.minutes === startSlot.minutes)
      return [styles.slotBtn, styles.slotSelected];
    if (endSlot && slot.minutes === endSlot.minutes)
      return [styles.slotBtn, styles.slotSelected];
    if (startSlot && !endSlot && isValidEnd(slot))
      return [styles.slotBtn, styles.slotValidEnd];
    return [styles.slotBtn];
  }

  function slotTextStyle(slot: MinuteSlot) {
    if (!slot.available) return styles.slotTextUnavailable;
    if (startSlot && endSlot && slot.minutes >= startSlot.minutes && slot.minutes < endSlot.minutes)
      return styles.slotTextSelected;
    if (startSlot && slot.minutes === startSlot.minutes) return styles.slotTextSelected;
    if (endSlot && slot.minutes === endSlot.minutes) return styles.slotTextSelected;
    return styles.slotText;
  }

  function handleSelectDate(dateStr: string) {
    setSelectedDate(dateStr);
    setStartSlot(null);
    setEndSlot(null);
  }

  function prevMonth() {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  }

  function nextMonth() {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  }

  function handleBook() {
    if (!startSlot || !endSlot) return;
    router.push({
      pathname: '/(player)/booking/new',
      params: {
        courtId: court!.id,
        date: selectedDate,
        startTime: startSlot.label,
        endTime: endSlot.label,
        price: String(totalPrice.toFixed(2)),
      },
    });
  }

  const weeks = buildCalendar(calYear, calMonth);
  const todayStr = getTodayString();

  return (
    <SafeAreaView style={styles.safe}>
      <RefreshableScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshing={refreshing}
        onRefresh={onRefresh}
      >

        {/* ── Carrossel de fotos ── */}
        <View style={styles.imageContainer}>
          {photos.length > 0 ? (
            <>
              <FlatList
                data={photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(p) => p.id}
                onScroll={(e: NativeSyntheticEvent<NativeScrollEvent>) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
                  setPhotoIndex(idx);
                }}
                scrollEventThrottle={16}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: resolvePhotoUrl(item.url) }}
                    style={styles.image}
                    resizeMode="cover"
                  />
                )}
              />
              {photos.length > 1 && (
                <View style={styles.dotRow}>
                  {photos.map((_, i) => (
                    <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
                  ))}
                </View>
              )}
            </>
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

          {/* ── Título e rating ── */}
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
            <Text style={styles.locationText}>{court.addressLine}, {court.city} – {court.state}</Text>
          </View>

          {court.mapsUrl && (
            <TouchableOpacity
              style={styles.mapsLink}
              onPress={() => Linking.openURL(court.mapsUrl!)}
              activeOpacity={0.7}
            >
              <ExternalLink size={14} color={colors.primary[600]} />
              <Text style={styles.mapsLinkText}>Ver no Google Maps</Text>
            </TouchableOpacity>
          )}

          <Chip label={court.sport} style={{ alignSelf: 'flex-start' }} />

          {court.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sobre</Text>
              <Text style={styles.description}>{court.description}</Text>
            </View>
          )}

          {amenities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Comodidades</Text>
              <View style={styles.amenitiesRow}>
                {amenities.map((a: string, i: number) => <Chip key={i} label={a} />)}
              </View>
            </View>
          )}

          {court.rules && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Regras</Text>
              <Text style={styles.description}>{court.rules}</Text>
            </View>
          )}

          {/* ── Calendário ── */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Escolha a data</Text>
            <Card style={styles.calCard}>
              {/* Cabeçalho do mês */}
              <View style={styles.calHeader}>
                <Pressable onPress={prevMonth} hitSlop={10} style={styles.calArrow}>
                  <ChevronLeft size={20} color={colors.text.primary} />
                </Pressable>
                <Text style={styles.calMonthLabel}>{MONTH_LABELS[calMonth]} {calYear}</Text>
                <Pressable onPress={nextMonth} hitSlop={10} style={[styles.calArrow, styles.calArrowRight]}>
                  <ChevronLeft size={20} color={colors.text.primary} style={{ transform: [{ rotate: '180deg' }] }} />
                </Pressable>
              </View>

              {/* Labels dos dias da semana */}
              <View style={styles.calWeekRow}>
                {WEEK_LABELS.map((d) => (
                  <Text key={d} style={styles.calWeekLabel}>{d}</Text>
                ))}
              </View>

              {/* Semanas */}
              {weeks.map((week, wi) => (
                <View key={wi} style={styles.calWeekRow}>
                  {week.map((day, di) => {
                    if (!day) return <View key={di} style={styles.calDayEmpty} />;
                    const dateStr = dateToString(day);
                    const isPast = dateStr < todayStr;
                    const isSelected = dateStr === selectedDate;
                    const isToday = dateStr === todayStr;
                    return (
                      <Pressable
                        key={di}
                        onPress={() => !isPast && handleSelectDate(dateStr)}
                        style={[
                          styles.calDay,
                          isSelected && styles.calDaySelected,
                          isToday && !isSelected && styles.calDayToday,
                          isPast && styles.calDayPast,
                        ]}
                      >
                        <Text style={[
                          styles.calDayText,
                          isSelected && styles.calDayTextSelected,
                          isToday && !isSelected && styles.calDayTextToday,
                          isPast && styles.calDayTextPast,
                        ]}>
                          {day.getDate()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </Card>
          </View>

          {/* ── Seletor de horário ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Horário</Text>
              {pricePerHour > 0 && (
                <Text style={styles.priceHint}>{formatCurrency(pricePerHour)}/hora</Text>
              )}
            </View>

            {loadingSlots ? (
              <LoadingSpinner size="small" />
            ) : minuteSlots.length === 0 ? (
              <Text style={styles.noSlots}>Quadra fechada nesta data.</Text>
            ) : (
              <>
                <Text style={styles.slotHint}>
                  {!startSlot
                    ? 'Toque para selecionar o horário de início'
                    : !endSlot
                    ? 'Toque para selecionar o horário de término'
                    : `${startSlot.label} → ${endSlot.label}`}
                </Text>

                <View style={styles.slotsGrid}>
                  {minuteSlots.map((slot) => (
                    <Pressable
                      key={slot.minutes}
                      onPress={() => handleSlotPress(slot)}
                      disabled={!slot.available && !startSlot}
                      style={slotStyle(slot)}
                    >
                      <Text style={slotTextStyle(slot)}>{slot.label}</Text>
                    </Pressable>
                  ))}
                </View>

                {/* Legenda */}
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.primary[600] }]} />
                    <Text style={styles.legendText}>Selecionado</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.primary[100] }]} />
                    <Text style={styles.legendText}>Intervalo</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.neutral[200] }]} />
                    <Text style={styles.legendText}>Indisponível</Text>
                  </View>
                </View>

                {/* Resumo */}
                {startSlot && endSlot && (
                  <Card style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                      <Clock size={14} color={colors.primary[600]} />
                      <Text style={styles.summaryText}>
                        {startSlot.label} → {endSlot.label}
                        {'  ·  '}
                        {durationMinutes >= 60
                          ? `${Math.floor(durationMinutes / 60)}h${durationMinutes % 60 > 0 ? `${durationMinutes % 60}min` : ''}`
                          : `${durationMinutes}min`}
                      </Text>
                      <Text style={styles.summaryPrice}>{formatCurrency(totalPrice)}</Text>
                    </View>
                  </Card>
                )}
              </>
            )}
          </View>

          {/* ── Partidas abertas neste dia ── */}
          {openMatches.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Partidas abertas nesta data</Text>
              <Text style={styles.openMatchesHint}>
                Jogadores já organizaram partidas neste dia. Participe em vez de criar uma nova!
              </Text>
              {openMatches.map((match) => {
                const bk = match.booking;
                const totalSlots = match.totalSlots ?? 0;
                const estimatedQuota = match.estimatedQuota ?? 0;
                return (
                  <Pressable
                    key={match.id}
                    onPress={() => router.push({ pathname: '/(player)/matches/[id]', params: { id: match.id } })}
                  >
                    <Card style={styles.openMatchCard}>
                      <View style={styles.openMatchHeader}>
                        <Text style={styles.openMatchSport}>{match.sport}</Text>
                        <View style={styles.openMatchSlots}>
                          <Users size={13} color={colors.primary[600]} />
                          <Text style={styles.openMatchSlotsText}>{totalSlots}/{match.maxPlayers}</Text>
                        </View>
                      </View>
                      {bk?.startsAt && (
                        <Text style={styles.openMatchTime}>
                          {formatTime(bk.startsAt)} → {bk.endsAt ? formatTime(bk.endsAt) : ''}
                        </Text>
                      )}
                      {estimatedQuota > 0 && (
                        <Text style={styles.openMatchQuota}>{formatCurrency(estimatedQuota)}/jogador</Text>
                      )}
                      <Text style={styles.openMatchCta}>Toque para ver e participar →</Text>
                    </Card>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* ── Avaliações ── */}
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
      </RefreshableScrollView>

      {/* ── Bottom bar ── */}
      <View style={styles.bottomBar}>
        {startSlot && endSlot && (
          <View style={styles.bottomInfo}>
            <Text style={styles.bottomDate}>{selectedDate} · {startSlot.label}–{endSlot.label}</Text>
            <Text style={styles.bottomPrice}>{formatCurrency(totalPrice)}</Text>
          </View>
        )}
        <Button
          label={startSlot && endSlot ? 'Reservar agora' : 'Selecione horário de início e fim'}
          onPress={handleBook}
          disabled={!startSlot || !endSlot}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },

  // Fotos
  imageContainer: { position: 'relative' },
  image: { width: SCREEN_W, height: 280 },
  imagePlaceholder: { backgroundColor: colors.primary[50], alignItems: 'center', justifyContent: 'center' },
  backBtn: {
    position: 'absolute', top: 48, left: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  dotRow: {
    position: 'absolute', bottom: 12,
    flexDirection: 'row', alignSelf: 'center', gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: colors.white, width: 18 },

  // Conteúdo
  content: { padding: spacing.lg, gap: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  courtName: { fontSize: 24, fontWeight: '800', color: colors.text.primary, flex: 1 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText: { fontSize: 14, fontWeight: '700', color: colors.text.primary },
  ratingCount: { fontSize: 13, color: colors.text.secondary },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  locationText: { fontSize: 14, color: colors.text.secondary, flex: 1 },
  mapsLink: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' },
  mapsLinkText: { fontSize: 14, color: colors.primary[600], fontWeight: '600' },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceHint: { fontSize: 14, fontWeight: '600', color: colors.primary[600] },
  description: { fontSize: 14, color: colors.text.secondary, lineHeight: 22 },
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },

  // Calendário
  calCard: { padding: spacing.md, gap: spacing.sm },
  calHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  calMonthLabel: { fontSize: 15, fontWeight: '700', color: colors.text.primary },
  calArrow: { padding: 4 },
  calArrowRight: {},
  calWeekRow: { flexDirection: 'row', justifyContent: 'space-around' },
  calWeekLabel: { width: 36, textAlign: 'center', fontSize: 12, fontWeight: '600', color: colors.text.secondary, paddingBottom: 4 },
  calDay: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    marginVertical: 2,
  },
  calDayEmpty: { width: 36, height: 36 },
  calDaySelected: { backgroundColor: colors.primary[600] },
  calDayToday: { borderWidth: 1.5, borderColor: colors.primary[600] },
  calDayPast: {},
  calDayText: { fontSize: 14, fontWeight: '500', color: colors.text.primary },
  calDayTextSelected: { color: colors.white, fontWeight: '700' },
  calDayTextToday: { color: colors.primary[600], fontWeight: '700' },
  calDayTextPast: { color: colors.neutral[300] },

  // Slots
  slotHint: { fontSize: 13, color: colors.text.secondary },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1.5,
    borderColor: colors.border, backgroundColor: colors.white,
    minWidth: 72, alignItems: 'center',
  },
  slotSelected: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  slotInRange: { backgroundColor: colors.primary[100], borderColor: colors.primary[300] },
  slotValidEnd: { borderColor: colors.primary[400], borderStyle: 'dashed' },
  slotUnavailable: { backgroundColor: colors.neutral[100], borderColor: colors.neutral[200] },
  slotText: { fontSize: 13, fontWeight: '600', color: colors.text.primary },
  slotTextSelected: { fontSize: 13, fontWeight: '700', color: colors.white },
  slotTextUnavailable: { fontSize: 13, fontWeight: '500', color: colors.neutral[400] },
  noSlots: { fontSize: 14, color: colors.text.secondary },

  // Legenda
  legendRow: { flexDirection: 'row', gap: spacing.lg, marginTop: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: colors.text.secondary },

  // Resumo da seleção
  summaryCard: { backgroundColor: colors.primary[50], borderWidth: 0 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summaryText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.primary[700] },
  summaryPrice: { fontSize: 16, fontWeight: '800', color: colors.primary[600] },

  // Avaliações
  reviewCard: { marginBottom: spacing.sm },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 6 },
  reviewerName: { fontSize: 14, fontWeight: '600', color: colors.text.primary, flex: 1 },
  reviewRating: { flexDirection: 'row', gap: 1 },
  reviewComment: { fontSize: 13, color: colors.text.secondary, lineHeight: 20 },

  // Bottom bar
  bottomBar: {
    padding: spacing.lg, paddingBottom: spacing.xl,
    backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.border,
    gap: spacing.sm,
  },
  bottomInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bottomDate: { fontSize: 13, color: colors.text.secondary },
  bottomPrice: { fontSize: 20, fontWeight: '800', color: colors.primary[600] },

  // Partidas abertas
  openMatchesHint: { fontSize: 13, color: colors.text.secondary, marginTop: -spacing.xs },
  openMatchCard: { gap: 3, borderLeftWidth: 3, borderLeftColor: colors.primary[400] },
  openMatchHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  openMatchSport: { fontSize: 14, fontWeight: '700', color: colors.text.primary },
  openMatchSlots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  openMatchSlotsText: { fontSize: 13, fontWeight: '600', color: colors.primary[600] },
  openMatchTime: { fontSize: 13, color: colors.text.secondary },
  openMatchQuota: { fontSize: 14, fontWeight: '700', color: colors.primary[600] },
  openMatchCta: { fontSize: 12, color: colors.primary[500], marginTop: 2 },
});
