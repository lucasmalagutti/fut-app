import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Calendar, Camera, ChevronLeft, Clock, Pencil, Plus, Trash2 } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Chip } from '../../../components/ui/Chip';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { SelectPicker } from '../../../components/ui/SelectPicker';
import { RefreshableScrollView } from '../../../components/ui/RefreshableScrollView';
import { mergeRefetch, usePullToRefresh } from '../../../hooks/usePullToRefresh';
import { CITIES_BY_STATE, STATES } from '../../../constants/brazil-locations';
import { courtsService } from '../../../services/courts.service';
import { resolveMediaUrl } from '../../../utils/media';
import { colors, spacing } from '../../../theme';
import { formatCurrency } from '../../../utils/format';
import { getCourtSports } from '../../../utils/court';

// ── Constantes ────────────────────────────────────────────────────────────────

const TIME_OPTIONS = Array.from({ length: 37 }, (_, i) => {
  const totalMinutes = 6 * 60 + i * 30;
  const h = String(Math.floor(totalMinutes / 60) % 24).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  const label = h === '00' && m === '00' ? '00:00 (meia-noite)' : `${h}:${m}`;
  return { label, value: `${h}:${m}` };
});

const DAY_LABELS: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
};
const DAY_FULL: Record<number, string> = {
  0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta', 4: 'Quinta', 5: 'Sexta', 6: 'Sábado',
};

const SPORTS = ['Futebol', 'Society', 'Futsal', 'Futevôlei'];
const AMENITIES_OPTIONS = ['Vestiário', 'Estacionamento', 'Iluminação', 'Gramado sintético', 'Bar/Lanchonete', 'Wifi'];
const STATE_OPTIONS = STATES.map((s) => ({ label: `${s.uf} – ${s.name}`, value: s.uf }));

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(raw: string): string {
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function parseDateToISO(formatted: string): string {
  const [d, m, y] = formatted.split('/');
  return `${y}-${m}-${d}`;
}

const TODAY_FORMATTED = (() => {
  const n = new Date();
  return `${String(n.getDate()).padStart(2, '0')}/${String(n.getMonth() + 1).padStart(2, '0')}/${n.getFullYear()}`;
})();

// ── Tipos locais ──────────────────────────────────────────────────────────────

interface BlockForm {
  date: string;
  startTime: string;
  endTime: string;
  reason: string;
}

interface EditForm {
  name: string;
  sports: string[];
  description: string;
  addressLine: string;
  city: string;
  state: string;
  zip: string;
  rules: string;
  mapsUrl: string;
  amenities: string[];
}

const DEFAULT_SCHEDULE = {
  selectedDays: [] as number[],
  openTime: '08:00',
  closeTime: '22:00',
  basePrice: '',
};

const DEFAULT_BLOCK: BlockForm = {
  date: TODAY_FORMATTED,
  startTime: '08:00',
  endTime: '10:00',
  reason: '',
};

// ── Componente ────────────────────────────────────────────────────────────────

export default function OwnerCourtDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [scheduleModal, setScheduleModal] = useState(false);
  const [blockModal, setBlockModal] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ ...DEFAULT_SCHEDULE });
  const [blockForm, setBlockForm] = useState<BlockForm>({ ...DEFAULT_BLOCK });
  const [editForm, setEditForm] = useState<EditForm>({
    name: '', sports: [], description: '', addressLine: '',
    city: '', state: 'SP', zip: '', rules: '', mapsUrl: '', amenities: [],
  });

  const { data: court, isLoading, refetch: refetchCourt } = useQuery({
    queryKey: ['court', id],
    queryFn: () => courtsService.get(id),
  });

  const { data: schedules = [], refetch: refetchSchedules } = useQuery({
    queryKey: ['court-schedules', id],
    queryFn: () => courtsService.getSchedules(id),
  });

  const { data: blocks = [], refetch: refetchBlocks } = useQuery({
    queryKey: ['court-blocks', id],
    queryFn: () => courtsService.getBlocks(id),
  });

  const refetchAll = useCallback(
    () => mergeRefetch(refetchCourt, refetchSchedules, refetchBlocks),
    [refetchCourt, refetchSchedules, refetchBlocks],
  );
  const { refreshing, onRefresh } = usePullToRefresh(refetchAll);

  // Preenche o form de edição quando os dados da quadra carregam
  useEffect(() => {
    if (!court) return;
    const amenities = Array.isArray(court.amenities)
      ? court.amenities
      : (() => { try { return JSON.parse(court.amenities as unknown as string); } catch { return []; } })();
    const sports = getCourtSports(court);

    setEditForm({
      name: court.name ?? '',
      sports,
      description: court.description ?? '',
      addressLine: court.addressLine ?? '',
      city: court.city ?? '',
      state: court.state ?? 'SP',
      zip: court.zip ?? '',
      rules: court.rules ?? '',
      mapsUrl: court.mapsUrl ?? '',
      amenities,
    });
  }, [court]);

  // ── Mutations ───────────────────────────────────────────────────────────────

  const updateCourtMutation = useMutation({
    mutationFn: (data: Partial<EditForm>) => courtsService.update(id, data as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['court', id] });
      queryClient.invalidateQueries({ queryKey: ['owner-courts'], exact: false });
      setEditModal(false);
      Alert.alert('Sucesso', 'Quadra atualizada com sucesso!');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Não foi possível atualizar a quadra.';
      Alert.alert('Erro', msg);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: () =>
      courtsService.update(id, { status: court?.status === 'active' ? 'inactive' : 'active' } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['court', id] });
      queryClient.invalidateQueries({ queryKey: ['owner-courts'], exact: false });
    },
    onError: () => Alert.alert('Erro', 'Não foi possível atualizar o status da quadra.'),
  });

  const addScheduleMutation = useMutation({
    mutationFn: (data: { dayOfWeek: number; openTime: string; closeTime: string; slotMinutes: number; basePrice: number }) =>
      courtsService.addSchedule(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['court-schedules', id] }),
    onError: () => Alert.alert('Erro', 'Não foi possível salvar o horário.'),
  });

  const removeScheduleMutation = useMutation({
    mutationFn: (scheduleId: string) => courtsService.removeSchedule(id, scheduleId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['court-schedules', id] }),
    onError: () => Alert.alert('Erro', 'Não foi possível remover o horário.'),
  });

  const addBlockMutation = useMutation({
    mutationFn: (data: { startsAt: string; endsAt: string; reason?: string }) =>
      courtsService.addBlock(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['court-blocks', id] });
      setBlockModal(false);
      setBlockForm({ ...DEFAULT_BLOCK });
    },
    onError: () => Alert.alert('Erro', 'Não foi possível adicionar o bloqueio.'),
  });

  const removeBlockMutation = useMutation({
    mutationFn: (blockId: string) => courtsService.removeBlock(id, blockId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['court-blocks', id] }),
    onError: () => Alert.alert('Erro', 'Não foi possível remover o bloqueio.'),
  });

  const addPhotoMutation = useMutation({
    mutationFn: ({ uri, mimeType }: { uri: string; mimeType?: string }) =>
      courtsService.uploadPhoto(id, uri, mimeType),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['court', id] }),
    onError: (err: any) => Alert.alert('Erro', err?.message ?? 'Não foi possível adicionar a foto.'),
  });

  const removePhotoMutation = useMutation({
    mutationFn: (photoId: string) => courtsService.removePhoto(id, photoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['court', id] }),
    onError: () => Alert.alert('Erro', 'Não foi possível remover a foto.'),
  });

  // ── Handlers ────────────────────────────────────────────────────────────────

  async function handleAddPhoto() {
    const photos = (court?.photos ?? []) as any[];
    if (photos.length >= 5) {
      Alert.alert('Limite atingido', 'A quadra já possui 5 fotos.');
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Permita o acesso à galeria para adicionar fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      addPhotoMutation.mutate({ uri: asset.uri, mimeType: asset.mimeType ?? undefined });
    }
  }

  function toggleAmenity(amenity: string) {
    setEditForm((f) => ({
      ...f,
      amenities: f.amenities.includes(amenity)
        ? f.amenities.filter((a) => a !== amenity)
        : [...f.amenities, amenity],
    }));
  }

  function toggleDay(day: number) {
    setScheduleForm((f) => ({
      ...f,
      selectedDays: f.selectedDays.includes(day)
        ? f.selectedDays.filter((d) => d !== day)
        : [...f.selectedDays, day].sort(),
    }));
  }

  function submitEdit() {
    if (!editForm.name.trim() || editForm.name.trim().length < 2) {
      Alert.alert('Atenção', 'Nome da quadra deve ter ao menos 2 caracteres.');
      return;
    }
    if (editForm.sports.length === 0) {
      Alert.alert('Atenção', 'Selecione ao menos um esporte.');
      return;
    }
    if (!editForm.addressLine.trim()) {
      Alert.alert('Atenção', 'Informe o endereço.');
      return;
    }
    if (!editForm.city) {
      Alert.alert('Atenção', 'Selecione a cidade.');
      return;
    }
    if (editForm.mapsUrl && !/^https?:\/\/.+/.test(editForm.mapsUrl)) {
      Alert.alert('Atenção', 'Link do Google Maps inválido.');
      return;
    }
    updateCourtMutation.mutate({
      ...editForm,
      sports: editForm.sports,
      sport: editForm.sports[0] ?? '',
      mapsUrl: editForm.mapsUrl || undefined,
      rules: editForm.rules || undefined,
      description: editForm.description || undefined,
    } as any);
  }

  async function submitSchedule() {
    if (scheduleForm.selectedDays.length === 0) {
      Alert.alert('Atenção', 'Selecione pelo menos um dia da semana.');
      return;
    }
    const price = parseFloat(scheduleForm.basePrice.replace(/\./g, '').replace(',', '.'));
    if (!scheduleForm.basePrice || isNaN(price) || price <= 0) {
      Alert.alert('Atenção', 'Informe o preço por hora.');
      return;
    }
    if (scheduleForm.openTime >= scheduleForm.closeTime && scheduleForm.closeTime !== '00:00') {
      Alert.alert('Atenção', 'O horário de abertura deve ser anterior ao de fechamento.');
      return;
    }
    const conflictingDays = scheduleForm.selectedDays.filter((day) =>
      schedules.some((s) => s.dayOfWeek === day)
    );
    if (conflictingDays.length > 0) {
      const names = conflictingDays.map((d) => DAY_FULL[d]).join(', ');
      Alert.alert('Dia já configurado', `${names} já possui horário. Remova antes de adicionar.`);
      return;
    }
    for (const day of scheduleForm.selectedDays) {
      await addScheduleMutation.mutateAsync({
        dayOfWeek: day,
        openTime: scheduleForm.openTime,
        closeTime: scheduleForm.closeTime,
        slotMinutes: 1,
        basePrice: price,
      });
    }
    setScheduleModal(false);
    setScheduleForm({ ...DEFAULT_SCHEDULE });
  }

  function submitBlock() {
    if (!blockForm.date || blockForm.date.length < 10) {
      Alert.alert('Atenção', 'Informe a data no formato DD/MM/AAAA.');
      return;
    }
    if (blockForm.startTime >= blockForm.endTime) {
      Alert.alert('Atenção', 'O horário inicial deve ser anterior ao final.');
      return;
    }
    const isoDate = parseDateToISO(blockForm.date);
    const startsAt = new Date(`${isoDate}T${blockForm.startTime}:00`).toISOString();
    const endsAt = new Date(`${isoDate}T${blockForm.endTime}:00`).toISOString();
    addBlockMutation.mutate({ startsAt, endsAt, reason: blockForm.reason || undefined });
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (isLoading) return <LoadingSpinner fullScreen />;
  if (!court) return null;

  const amenities = Array.isArray(court.amenities)
    ? court.amenities
    : (() => { try { return JSON.parse(court.amenities as unknown as string); } catch { return []; } })();

  const sortedSchedules = [...schedules].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const cityOptions = (CITIES_BY_STATE[editForm.state] ?? []).map((c) => ({ label: c, value: c }));

  return (
    <SafeAreaView style={styles.safe}>
      <RefreshableScrollView showsVerticalScrollIndicator={false} refreshing={refreshing} onRefresh={onRefresh}>

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <ChevronLeft size={24} color={colors.text.primary} />
          </Pressable>
          <Text style={styles.courtName} numberOfLines={1}>{court.name}</Text>
          <Badge
            label={court.status === 'active' ? 'Ativa' : 'Inativa'}
            variant={court.status === 'active' ? 'success' : 'neutral'}
          />
        </View>

        <View style={styles.content}>

          {/* Informações */}
          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Informações</Text>
              <TouchableOpacity onPress={() => setEditModal(true)} style={styles.editBtn}>
                <Pencil size={14} color={colors.primary[600]} />
                <Text style={styles.editBtnText}>Editar</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.infoLabel}>Esportes</Text>
            <View style={styles.chipsRow}>
              {getCourtSports(court).map((s, i) => <Chip key={i} label={s} />)}
            </View>

            <Text style={styles.infoLabel}>Endereço</Text>
            <Text style={styles.infoValue}>{court.addressLine}, {court.city} – {court.state}</Text>

            <Text style={styles.infoLabel}>CEP</Text>
            <Text style={styles.infoValue}>{court.zip}</Text>

            {court.description ? <>
              <Text style={styles.infoLabel}>Descrição</Text>
              <Text style={styles.infoValue}>{court.description}</Text>
            </> : null}

            {amenities.length > 0 ? <>
              <Text style={styles.infoLabel}>Comodidades</Text>
              <View style={styles.chipsRow}>
                {amenities.map((a: string, i: number) => <Chip key={i} label={a} />)}
              </View>
            </> : null}

            {court.rules ? <>
              <Text style={styles.infoLabel}>Regras</Text>
              <Text style={styles.infoValue}>{court.rules}</Text>
            </> : null}

            {court.mapsUrl ? <>
              <Text style={styles.infoLabel}>Google Maps</Text>
              <TouchableOpacity onPress={() => Linking.openURL(court.mapsUrl!)}>
                <Text style={styles.mapsLink}>📍 Ver no Google Maps</Text>
              </TouchableOpacity>
            </> : null}

            {court.ratingCount > 0 && (
              <Text style={styles.rating}>⭐ {court.ratingAvg.toFixed(1)} ({court.ratingCount} avaliações)</Text>
            )}
          </Card>

          {/* Fotos */}
          {(() => {
            const photos = (court.photos ?? []) as any[];
            return (
              <Card>
                <View style={styles.rowBetween}>
                  <Text style={styles.sectionTitle}>Fotos ({photos.length}/5)</Text>
                  {photos.length < 5 && (
                    <TouchableOpacity
                      onPress={handleAddPhoto}
                      style={styles.editBtn}
                      disabled={addPhotoMutation.isPending}
                    >
                      <Camera size={14} color={colors.primary[600]} />
                      <Text style={styles.editBtnText}>
                        {addPhotoMutation.isPending ? 'Enviando...' : 'Adicionar'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {photos.length === 0 ? (
                  <TouchableOpacity style={styles.photoEmpty} onPress={handleAddPhoto}>
                    <Camera size={32} color={colors.neutral[400]} />
                    <Text style={styles.photoEmptyText}>Toque para adicionar fotos</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.photosGrid}>
                    {photos.map((photo: any) => (
                      <View key={photo.id} style={styles.photoThumb}>
                        <Image
                          source={{ uri: resolveMediaUrl(photo.url) }}
                          style={styles.photoImg}
                          resizeMode="cover"
                        />
                        <TouchableOpacity
                          style={styles.photoRemoveBtn}
                          onPress={() => Alert.alert('Remover foto', 'Deseja remover esta foto?', [
                            { text: 'Cancelar', style: 'cancel' },
                            { text: 'Remover', style: 'destructive', onPress: () => removePhotoMutation.mutate(photo.id) },
                          ])}
                          hitSlop={4}
                        >
                          <Text style={styles.photoRemoveIcon}>✕</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            );
          })()}

          {/* Horários */}
          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Horários de Funcionamento</Text>
              <TouchableOpacity onPress={() => setScheduleModal(true)} style={styles.editBtn}>
                <Plus size={14} color={colors.primary[600]} />
                <Text style={styles.editBtnText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
            {sortedSchedules.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum horário configurado.</Text>
            ) : (
              sortedSchedules.map((s) => (
                <View key={s.id} style={styles.scheduleRow}>
                  <Clock size={13} color={colors.text.secondary} />
                  <Text style={styles.scheduleDay}>{DAY_LABELS[s.dayOfWeek]}</Text>
                  <Text style={styles.scheduleTime}>{s.openTime} – {s.closeTime}</Text>
                  <Text style={styles.schedulePrice}>{formatCurrency(s.basePrice)}/h</Text>
                  <TouchableOpacity
                    onPress={() => Alert.alert('Remover horário', `Remover ${DAY_FULL[s.dayOfWeek]}?`, [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Remover', style: 'destructive', onPress: () => removeScheduleMutation.mutate(s.id) },
                    ])}
                    hitSlop={10}
                  >
                    <Trash2 size={14} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </Card>

          {/* Bloqueios */}
          <Card>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Bloqueios</Text>
              <TouchableOpacity onPress={() => setBlockModal(true)} style={styles.editBtn}>
                <Plus size={14} color={colors.primary[600]} />
                <Text style={styles.editBtnText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
            {blocks.length === 0 ? (
              <Text style={styles.emptyText}>Nenhum bloqueio ativo.</Text>
            ) : (
              blocks.map((b) => (
                <View key={b.id} style={styles.blockItem}>
                  <Calendar size={14} color={colors.text.secondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.blockTime}>
                      {new Date(b.startsAt).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      {' → '}
                      {new Date(b.endsAt).toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    {b.reason ? <Text style={styles.blockReason}>{b.reason}</Text> : null}
                  </View>
                  <TouchableOpacity
                    onPress={() => Alert.alert('Remover bloqueio', 'Deseja remover este bloqueio?', [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Remover', style: 'destructive', onPress: () => removeBlockMutation.mutate(b.id) },
                    ])}
                    hitSlop={10}
                  >
                    <Trash2 size={14} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </Card>

          {/* Ativar / Desativar */}
          <Button
            label={court.status === 'active' ? 'Desativar quadra' : 'Ativar quadra'}
            variant={court.status === 'active' ? 'outline' : 'primary'}
            onPress={() => Alert.alert(
              court.status === 'active' ? 'Desativar quadra' : 'Ativar quadra',
              court.status === 'active'
                ? 'A quadra ficará invisível para jogadores. Deseja continuar?'
                : 'A quadra voltará a aparecer para jogadores. Deseja continuar?',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Confirmar', onPress: () => toggleStatusMutation.mutate() },
              ]
            )}
            loading={toggleStatusMutation.isPending}
            fullWidth
          />
        </View>
      </RefreshableScrollView>

      {/* ── Modal: Editar Quadra ── */}
      <Modal visible={editModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditModal(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar Quadra</Text>
            <TouchableOpacity onPress={() => setEditModal(false)} hitSlop={12}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">

            {/* Nome */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nome da quadra</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.name}
                onChangeText={(v) => setEditForm((f) => ({ ...f, name: v }))}
                placeholder="Ex: Arena Soccer"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>

            {/* Esportes — multi-select */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Esportes <Text style={{ fontSize: 12, color: colors.text.secondary, fontWeight: '400' }}>(selecione um ou mais)</Text></Text>
              <View style={styles.chipsRow}>
                {SPORTS.map((sport) => (
                  <Chip
                    key={sport}
                    label={sport}
                    selected={editForm.sports.includes(sport)}
                    onPress={() => setEditForm((f) => ({
                      ...f,
                      sports: f.sports.includes(sport)
                        ? f.sports.filter((s) => s !== sport)
                        : [...f.sports, sport],
                    }))}
                  />
                ))}
              </View>
            </View>

            {/* Descrição */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Descrição (opcional)</Text>
              <TextInput
                style={[styles.textInput, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                value={editForm.description}
                onChangeText={(v) => setEditForm((f) => ({ ...f, description: v }))}
                placeholder="Descreva sua quadra..."
                placeholderTextColor={colors.neutral[400]}
                multiline
              />
            </View>

            {/* Endereço */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Endereço</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.addressLine}
                onChangeText={(v) => setEditForm((f) => ({ ...f, addressLine: v }))}
                placeholder="Rua, número"
                placeholderTextColor={colors.neutral[400]}
              />
            </View>

            {/* Estado */}
            <SelectPicker
              label="Estado"
              value={editForm.state}
              options={STATE_OPTIONS}
              onChange={(uf) => setEditForm((f) => ({ ...f, state: uf, city: '' }))}
              searchable
            />

            {/* Cidade */}
            <SelectPicker
              label="Cidade"
              value={editForm.city}
              options={cityOptions}
              onChange={(city) => setEditForm((f) => ({ ...f, city }))}
              placeholder={editForm.state ? 'Selecione a cidade...' : 'Selecione o estado primeiro'}
              disabled={!editForm.state}
              searchable
            />

            {/* CEP */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>CEP</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.zip}
                onChangeText={(v) => setEditForm((f) => ({ ...f, zip: v }))}
                placeholder="00000-000"
                placeholderTextColor={colors.neutral[400]}
                keyboardType="numeric"
              />
            </View>

            {/* Comodidades */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Comodidades</Text>
              <View style={styles.chipsRow}>
                {AMENITIES_OPTIONS.map((amenity) => (
                  <Chip
                    key={amenity}
                    label={amenity}
                    selected={editForm.amenities.includes(amenity)}
                    onPress={() => toggleAmenity(amenity)}
                  />
                ))}
              </View>
            </View>

            {/* Regras */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Regras (opcional)</Text>
              <TextInput
                style={[styles.textInput, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                value={editForm.rules}
                onChangeText={(v) => setEditForm((f) => ({ ...f, rules: v }))}
                placeholder="Ex: Proibido fumar..."
                placeholderTextColor={colors.neutral[400]}
                multiline
              />
            </View>

            {/* Google Maps */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Link Google Maps (opcional)</Text>
              <TextInput
                style={styles.textInput}
                value={editForm.mapsUrl}
                onChangeText={(v) => setEditForm((f) => ({ ...f, mapsUrl: v }))}
                placeholder="https://maps.app.goo.gl/..."
                placeholderTextColor={colors.neutral[400]}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <Button
              label="Salvar alterações"
              onPress={submitEdit}
              loading={updateCourtMutation.isPending}
              fullWidth
              size="lg"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Modal: Adicionar Horário ── */}
      <Modal visible={scheduleModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setScheduleModal(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Adicionar Horário</Text>
            <TouchableOpacity onPress={() => { setScheduleModal(false); setScheduleForm({ ...DEFAULT_SCHEDULE }); }} hitSlop={12}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Dias de funcionamento</Text>
              <View style={styles.daysRow}>
                {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                  const selected = scheduleForm.selectedDays.includes(day);
                  const alreadySet = schedules.some((s) => s.dayOfWeek === day);
                  return (
                    <TouchableOpacity
                      key={day}
                      onPress={() => !alreadySet && toggleDay(day)}
                      style={[styles.dayChip, selected && styles.dayChipSelected, alreadySet && styles.dayChipDisabled]}
                    >
                      <Text style={[styles.dayChipText, selected && styles.dayChipTextSelected, alreadySet && styles.dayChipTextDisabled]}>
                        {DAY_LABELS[day]}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.shortcutsRow}>
                <TouchableOpacity onPress={() => setScheduleForm((f) => ({ ...f, selectedDays: [1, 2, 3, 4, 5].filter((d) => !schedules.some((s) => s.dayOfWeek === d)) }))}>
                  <Text style={styles.shortcutText}>Seg – Sex</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setScheduleForm((f) => ({ ...f, selectedDays: [6, 0].filter((d) => !schedules.some((s) => s.dayOfWeek === d)) }))}>
                  <Text style={styles.shortcutText}>Sáb – Dom</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setScheduleForm((f) => ({ ...f, selectedDays: [0, 1, 2, 3, 4, 5, 6].filter((d) => !schedules.some((s) => s.dayOfWeek === d)) }))}>
                  <Text style={styles.shortcutText}>Todos os dias</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setScheduleForm((f) => ({ ...f, selectedDays: [] }))}>
                  <Text style={[styles.shortcutText, { color: colors.error }]}>Limpar</Text>
                </TouchableOpacity>
              </View>
              {schedules.length > 0 && (
                <Text style={styles.hintText}>Dias em cinza já possuem horário cadastrado.</Text>
              )}
            </View>

            <SelectPicker
              label="Abre às"
              value={scheduleForm.openTime}
              options={TIME_OPTIONS}
              onChange={(v) => setScheduleForm((f) => ({ ...f, openTime: v }))}
            />

            <SelectPicker
              label="Fecha às"
              value={scheduleForm.closeTime}
              options={TIME_OPTIONS}
              onChange={(v) => setScheduleForm((f) => ({ ...f, closeTime: v }))}
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Preço por hora (R$)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Ex: 150,00"
                placeholderTextColor={colors.neutral[400]}
                keyboardType="decimal-pad"
                value={scheduleForm.basePrice}
                onChangeText={(raw) => setScheduleForm((f) => ({ ...f, basePrice: formatPrice(raw) }))}
              />
            </View>

            <Button
              label="Salvar horário"
              onPress={submitSchedule}
              loading={addScheduleMutation.isPending}
              fullWidth
              size="lg"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Modal: Adicionar Bloqueio ── */}
      <Modal visible={blockModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setBlockModal(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Adicionar Bloqueio</Text>
            <TouchableOpacity onPress={() => setBlockModal(false)} hitSlop={12}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Data</Text>
              <TextInput
                style={styles.textInput}
                placeholder="DD/MM/AAAA"
                placeholderTextColor={colors.neutral[400]}
                value={blockForm.date}
                onChangeText={(v) => setBlockForm((f) => ({ ...f, date: formatDateInput(v) }))}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>

            <SelectPicker
              label="Horário início"
              value={blockForm.startTime}
              options={TIME_OPTIONS}
              onChange={(v) => setBlockForm((f) => ({ ...f, startTime: v }))}
            />

            <SelectPicker
              label="Horário fim"
              value={blockForm.endTime}
              options={TIME_OPTIONS}
              onChange={(v) => setBlockForm((f) => ({ ...f, endTime: v }))}
            />

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Motivo (opcional)</Text>
              <TextInput
                style={[styles.textInput, { height: 80, textAlignVertical: 'top', paddingTop: 12 }]}
                placeholder="Ex: Manutenção, evento privado..."
                placeholderTextColor={colors.neutral[400]}
                value={blockForm.reason}
                onChangeText={(v) => setBlockForm((f) => ({ ...f, reason: v }))}
                multiline
              />
            </View>

            <Button
              label="Salvar bloqueio"
              onPress={submitBlock}
              loading={addBlockMutation.isPending}
              fullWidth
              size="lg"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.lg, backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  courtName: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text.primary },
  content: { padding: spacing.lg, gap: spacing.md },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: spacing.sm },
  infoLabel: { fontSize: 12, color: colors.text.secondary, marginTop: spacing.sm, marginBottom: 4 },
  infoValue: { fontSize: 14, color: colors.text.primary },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  mapsLink: { fontSize: 14, color: colors.primary[600], fontWeight: '500', marginTop: 2 },
  rating: { fontSize: 14, fontWeight: '600', color: colors.text.primary, marginTop: spacing.sm },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editBtnText: { fontSize: 13, color: colors.primary[600], fontWeight: '600' },
  scheduleRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.border, gap: 6,
  },
  scheduleDay: { width: 36, fontSize: 13, fontWeight: '700', color: colors.text.primary },
  scheduleTime: { flex: 1, fontSize: 13, color: colors.text.secondary },
  schedulePrice: { fontSize: 13, fontWeight: '700', color: colors.primary[600], marginRight: 8 },
  blockItem: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  blockTime: { fontSize: 13, color: colors.text.primary, fontWeight: '500' },
  blockReason: { fontSize: 12, color: colors.text.secondary, marginTop: 2 },
  emptyText: { fontSize: 14, color: colors.text.secondary },

  // Modal
  modal: { flex: 1, backgroundColor: colors.background },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  modalClose: { fontSize: 20, color: colors.text.secondary },
  modalBody: { padding: spacing.lg, gap: spacing.md },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: colors.text.primary },
  textInput: {
    backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.border,
    borderRadius: 8, paddingHorizontal: spacing.md, paddingVertical: 12,
    fontSize: 15, color: colors.text.primary, minHeight: 48,
  },
  hintText: { fontSize: 12, color: colors.text.secondary, marginTop: 4 },

  // Dias da semana
  daysRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 4 },
  dayChip: {
    width: 42, height: 42, borderRadius: 21, borderWidth: 1.5,
    borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white,
  },
  dayChipSelected: { backgroundColor: colors.primary[600], borderColor: colors.primary[600] },
  dayChipDisabled: { backgroundColor: colors.neutral[100], borderColor: colors.neutral[200] },
  dayChipText: { fontSize: 12, fontWeight: '600', color: colors.text.secondary },
  dayChipTextSelected: { color: colors.white },
  dayChipTextDisabled: { color: colors.neutral[400] },
  shortcutsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 8 },
  shortcutText: { fontSize: 13, color: colors.primary[600], fontWeight: '500' },

  // Fotos
  photoEmpty: {
    borderWidth: 1.5, borderColor: colors.border, borderStyle: 'dashed',
    borderRadius: 10, paddingVertical: 32,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  photoEmptyText: { fontSize: 13, color: colors.neutral[400] },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  photoThumb: { width: '30%', aspectRatio: 4 / 3, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  photoImg: { width: '100%', height: '100%' },
  photoRemoveBtn: {
    position: 'absolute', top: 4, right: 4,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },
  photoRemoveIcon: { color: colors.white, fontSize: 11, fontWeight: '700', lineHeight: 14 },
});
