import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { z } from 'zod';
import { Button } from '../../../components/ui/Button';
import { Chip } from '../../../components/ui/Chip';
import { Input } from '../../../components/ui/Input';
import { SelectPicker } from '../../../components/ui/SelectPicker';
import { courtsService } from '../../../services/courts.service';
import { CITIES_BY_STATE, STATES } from '../../../constants/brazil-locations';
import { colors, spacing } from '../../../theme';

const SPORTS = ['Futebol', 'Society', 'Futsal', 'Futevôlei'];
const AMENITIES_OPTIONS = ['Vestiário', 'Estacionamento', 'Iluminação', 'Gramado sintético', 'Bar/Lanchonete', 'Wifi'];

const schema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  sport: z.string().min(1, 'Selecione o esporte'),
  description: z.string().optional(),
  addressLine: z.string().min(5, 'Endereço obrigatório'),
  city: z.string().min(2, 'Selecione a cidade'),
  state: z.string().length(2, 'Selecione o estado'),
  zip: z.string().min(8, 'CEP inválido'),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  rules: z.string().optional(),
  mapsUrl: z.string().url('Link inválido').optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

const STATE_OPTIONS = STATES.map((s) => ({ label: `${s.uf} – ${s.name}`, value: s.uf }));

export default function NewCourtScreen() {
  const queryClient = useQueryClient();
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  const { control, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', sport: '', description: '', addressLine: '', city: '', state: 'SP', zip: '', rules: '', mapsUrl: '' },
  });

  const selectedState = watch('state');
  const cityOptions = (CITIES_BY_STATE[selectedState] ?? []).map((c) => ({ label: c, value: c }));

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      courtsService.create({
        ...data,
        latitude: data.latitude ? Number(data.latitude) : -23.5505,
        longitude: data.longitude ? Number(data.longitude) : -46.6333,
        amenities: selectedAmenities as unknown as string[],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-courts'], exact: false });
      reset({ state: 'SP', city: '', name: '', sport: '', description: '', addressLine: '', zip: '', rules: '', mapsUrl: '' });
      setSelectedSport('');
      setSelectedAmenities([]);
      Alert.alert('Quadra cadastrada!', 'Sua quadra foi criada com sucesso.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? 'Não foi possível cadastrar a quadra.';
      Alert.alert('Erro', msg);
    },
  });

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Voltar</Text>
          </Pressable>

          <Text style={styles.title}>Nova Quadra</Text>

          <View style={styles.form}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label="Nome da quadra" placeholder="Ex: Arena Soccer" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
              )}
            />

            <View>
              <Text style={styles.label}>Esporte</Text>
              <View style={styles.chipsRow}>
                {SPORTS.map((sport) => (
                  <Chip
                    key={sport}
                    label={sport}
                    selected={selectedSport === sport}
                    onPress={() => { setSelectedSport(sport); setValue('sport', sport); }}
                  />
                ))}
              </View>
              {errors.sport && <Text style={styles.errorText}>{errors.sport.message}</Text>}
            </View>

            <Controller
              control={control}
              name="description"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label="Descrição (opcional)" placeholder="Descreva sua quadra..." value={value} onChangeText={onChange} onBlur={onBlur} multiline numberOfLines={3} />
              )}
            />

            <Controller
              control={control}
              name="addressLine"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label="Endereço" placeholder="Rua, número" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.addressLine?.message} />
              )}
            />

            <Controller
              control={control}
              name="state"
              render={({ field: { value } }) => (
                <SelectPicker
                  label="Estado"
                  placeholder="Selecione o estado..."
                  value={value}
                  options={STATE_OPTIONS}
                  onChange={(uf) => {
                    setValue('state', uf, { shouldValidate: true });
                    setValue('city', '', { shouldValidate: false });
                  }}
                  error={errors.state?.message}
                  searchable
                />
              )}
            />

            <Controller
              control={control}
              name="city"
              render={({ field: { value } }) => (
                <SelectPicker
                  label="Cidade"
                  placeholder={selectedState ? 'Selecione a cidade...' : 'Selecione o estado primeiro'}
                  value={value}
                  options={cityOptions}
                  onChange={(city) => setValue('city', city, { shouldValidate: true })}
                  error={errors.city?.message}
                  disabled={!selectedState}
                  searchable
                />
              )}
            />

            <Controller
              control={control}
              name="zip"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label="CEP" placeholder="00000-000" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.zip?.message} keyboardType="numeric" />
              )}
            />

            <View>
              <Text style={styles.label}>Comodidades</Text>
              <View style={styles.chipsRow}>
                {AMENITIES_OPTIONS.map((amenity) => (
                  <Chip
                    key={amenity}
                    label={amenity}
                    selected={selectedAmenities.includes(amenity)}
                    onPress={() => toggleAmenity(amenity)}
                  />
                ))}
              </View>
            </View>

            <Controller
              control={control}
              name="rules"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input label="Regras (opcional)" placeholder="Ex: Proibido fumar..." value={value} onChangeText={onChange} onBlur={onBlur} multiline numberOfLines={3} />
              )}
            />

            <Controller
              control={control}
              name="mapsUrl"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Link Google Maps (opcional)"
                  placeholder="https://maps.app.goo.gl/..."
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.mapsUrl?.message}
                  autoCapitalize="none"
                  keyboardType="url"
                />
              )}
            />

            <Button
              label="Cadastrar quadra"
              onPress={handleSubmit((d) => createMutation.mutate(d))}
              loading={isSubmitting || createMutation.isPending}
              fullWidth
              size="lg"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.md },
  backBtn: { marginBottom: spacing.sm },
  backText: { fontSize: 15, color: colors.primary[600], fontWeight: '500' },
  title: { fontSize: 28, fontWeight: '800', color: colors.text.primary, marginBottom: spacing.sm },
  form: { gap: spacing.md },
  label: { fontSize: 14, fontWeight: '500', color: colors.text.primary, marginBottom: 6 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  errorText: { fontSize: 12, color: colors.error, marginTop: 4 },
});
