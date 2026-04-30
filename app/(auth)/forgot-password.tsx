import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { z } from 'zod';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { authService } from '../../services/auth.service';
import { colors, spacing } from '../../theme';

const schema = z.object({ email: z.string().email('E-mail inválido') });
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordScreen() {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      await authService.forgotPassword(data.email);
      Alert.alert(
        'E-mail enviado',
        'Verifique sua caixa de entrada para redefinir a senha.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar o e-mail. Tente novamente.');
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.container}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Voltar</Text>
          </Pressable>

          <Text style={styles.title}>Redefinir senha</Text>
          <Text style={styles.subtitle}>
            Informe o e-mail da sua conta e enviaremos um link para redefinir a senha.
          </Text>

          <View style={styles.form}>
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
            <Button
              label="Enviar link"
              onPress={handleSubmit(onSubmit)}
              loading={isSubmitting}
              fullWidth
              size="lg"
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.lg },
  backBtn: { marginBottom: spacing.lg },
  backText: { fontSize: 15, color: colors.primary[600], fontWeight: '500' },
  title: { fontSize: 32, fontWeight: '800', color: colors.text.primary, marginBottom: 6 },
  subtitle: { fontSize: 16, color: colors.text.secondary, marginBottom: spacing.xl, lineHeight: 24 },
  form: { gap: spacing.md },
});
