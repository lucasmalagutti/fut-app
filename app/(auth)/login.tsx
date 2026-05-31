import { zodResolver } from '@hookform/resolvers/zod';
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
  TouchableOpacity,
  View,
} from 'react-native';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/auth.store';
import { colors, radius, spacing } from '../../theme';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Informe a senha'),
});

type FormData = z.infer<typeof schema>;

export default function LoginScreen() {
  const signIn = useAuthStore((s) => s.signIn);
  const [remember, setRemember] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authService.login({
        email: data.email,
        password: data.password,
        keepConnected: remember,
      });
      await signIn(res, remember);
      if (res.user.role === 'owner') {
        router.replace('/(owner)');
      } else {
        router.replace('/(player)');
      }
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Erro ao entrar. Verifique suas credenciais.';
      Alert.alert('Erro', msg);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Voltar</Text>
          </Pressable>

          <Text style={styles.title}>Entrar</Text>
          <Text style={styles.subtitle}>Bem-vindo de volta!</Text>

          <View style={styles.form}>
            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="E-mail"
                  placeholder="seu@email.com"
                  keyboardType="email-address"
                  autoComplete="email"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Senha"
                  placeholder="••••••••"
                  secureTextEntry
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                />
              )}
            />

            {/* Lembrar-me + Esqueci senha */}
            <View style={styles.row}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setRemember((v) => !v)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, remember && styles.checkboxChecked]}>
                  {remember && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.checkboxLabel}>Lembrar de mim</Text>
              </TouchableOpacity>

              <Pressable onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.forgotText}>Esqueci minha senha</Text>
              </Pressable>
            </View>

            <Button
              label="Entrar"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              fullWidth
              size="lg"
            />
          </View>

          <Text style={styles.signupText}>
            Não tem conta?{' '}
            <Text style={styles.signupLink} onPress={() => router.push('/(auth)/welcome')}>
              Cadastrar
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary[600],
    borderColor: colors.primary[600],
  },
  checkmark: { fontSize: 12, color: colors.white, fontWeight: '700', lineHeight: 14 },
  checkboxLabel: { fontSize: 14, color: colors.text.primary },
  forgotText: { fontSize: 14, color: colors.primary[600], fontWeight: '500' },
  signupText: { fontSize: 15, textAlign: 'center', color: colors.text.secondary, marginTop: spacing.xl },
  signupLink: { color: colors.primary[600], fontWeight: '700' },
});
