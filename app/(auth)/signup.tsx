import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
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
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/auth.store';
import { colors, spacing } from '../../theme';

const schema = z
  .object({
    name: z.string().min(2, 'Nome muito curto'),
    email: z.string().email('E-mail inválido'),
    phone: z.string().optional(),
    password: z.string().min(8, 'Mínimo 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function SignupScreen() {
  const { role } = useLocalSearchParams<{ role: 'player' | 'owner' }>();
  const signIn = useAuthStore((s) => s.signIn);
  const isOwner = role === 'owner';

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authService.signup({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        role: role ?? 'player',
      });
      await signIn(res);
      if (isOwner) router.replace('/(owner)');
      else router.replace('/(player)');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao criar conta.';
      Alert.alert('Erro', msg);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Voltar</Text>
          </Pressable>

          <Text style={styles.title}>Criar conta</Text>
          <Text style={styles.subtitle}>
            {isOwner ? 'Cadastre-se como Dono de Quadra' : 'Cadastre-se como Jogador'}
          </Text>

          <View style={styles.form}>
            <Controller
              control={control}
              name="name"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Nome completo"
                  placeholder="Seu nome"
                  autoCapitalize="words"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.name?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="E-mail"
                  placeholder="seu@email.com"
                  keyboardType="email-address"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Telefone (opcional)"
                  placeholder="(11) 99999-9999"
                  keyboardType="phone-pad"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Senha"
                  placeholder="Mínimo 8 caracteres"
                  secureTextEntry
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Confirmar senha"
                  placeholder="Repita a senha"
                  secureTextEntry
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.confirmPassword?.message}
                />
              )}
            />

            <Button
              label="Criar conta"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              fullWidth
              size="lg"
            />
          </View>

          <Text style={styles.loginText}>
            Já tem conta?{' '}
            <Text style={styles.loginLink} onPress={() => router.push('/(auth)/login')}>
              Entrar
            </Text>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, padding: spacing.lg },
  backBtn: { marginBottom: spacing.lg },
  backText: { fontSize: 15, color: colors.primary[600], fontWeight: '500' },
  title: { fontSize: 32, fontWeight: '800', color: colors.text.primary, marginBottom: 6 },
  subtitle: { fontSize: 16, color: colors.text.secondary, marginBottom: spacing.xl },
  form: { gap: spacing.md },
  loginText: { fontSize: 15, textAlign: 'center', color: colors.text.secondary, marginTop: spacing.xl },
  loginLink: { color: colors.primary[600], fontWeight: '700' },
});
