import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Controller, useForm } from 'react-hook-form';
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { RefreshableScrollView } from '../../components/ui/RefreshableScrollView';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { z } from 'zod';
import { Avatar } from '../../components/ui/Avatar';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/auth.store';
import { colors, spacing } from '../../theme';

const schema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function OwnerProfileScreen() {
  const { user, setUser, signOut } = useAuthStore();
  const queryClient = useQueryClient();

  const { refetch } = useQuery({
    queryKey: ['me'],
    queryFn: () => authService.getMe(),
    enabled: !!user,
  });

  const refreshProfile = useCallback(async () => {
    const me = await authService.getMe();
    setUser(me);
    await refetch();
  }, [refetch, setUser]);
  const { refreshing, onRefresh } = usePullToRefresh(refreshProfile);

  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name ?? '', phone: user?.phone ?? '' },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => authService.updateMe(data),
    onSuccess: (updated) => { setUser(updated); Alert.alert('Perfil atualizado'); },
    onError: () => Alert.alert('Erro', 'Não foi possível atualizar.'),
  });

  const avatarMutation = useMutation({
    mutationFn: ({ uri, mimeType }: { uri: string; mimeType?: string }) =>
      authService.uploadAvatar(uri, mimeType),
    onSuccess: (updated) => { setUser(updated); },
    onError: () => Alert.alert('Erro', 'Não foi possível atualizar a foto.'),
  });

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Permita o acesso à galeria para trocar a foto.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      avatarMutation.mutate({ uri: asset.uri, mimeType: asset.mimeType ?? undefined });
    }
  };

  const handleLogout = () => {
    Alert.alert('Sair', 'Deseja sair da conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          try { await authService.logout(); } catch {}
          await signOut();
          queryClient.clear();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <RefreshableScrollView contentContainerStyle={styles.scroll} refreshing={refreshing} onRefresh={onRefresh}>
        <Text style={styles.title}>Meu Perfil</Text>
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarWrapper} activeOpacity={0.8}>
            <Avatar name={user?.name} uri={user?.avatarUrl} size={80} />
            <View style={styles.cameraBadge}>
              <Text style={styles.cameraIcon}>📷</Text>
            </View>
          </TouchableOpacity>
          {avatarMutation.isPending && <Text style={styles.uploadingText}>Atualizando foto...</Text>}
          <Text style={styles.userName}>{user?.name}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <Text style={styles.userRole}>Dono de Quadra</Text>
        </View>
        <View style={styles.form}>
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Nome" value={value} onChangeText={onChange} onBlur={onBlur} error={errors.name?.message} />
            )}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input label="Telefone" value={value} onChangeText={onChange} onBlur={onBlur} keyboardType="phone-pad" />
            )}
          />
          <Button
            label="Salvar"
            onPress={handleSubmit((d) => updateMutation.mutate(d))}
            loading={isSubmitting || updateMutation.isPending}
            fullWidth
          />
        </View>
        <View style={styles.actions}>
          <Button label="Sair da conta" variant="outline" onPress={handleLogout} fullWidth />
        </View>
      </RefreshableScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  title: { fontSize: 26, fontWeight: '800', color: colors.text.primary },
  avatarSection: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  avatarWrapper: { position: 'relative' },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary[600],
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraIcon: { fontSize: 13 },
  uploadingText: { fontSize: 12, color: colors.text.secondary },
  userName: { fontSize: 20, fontWeight: '700', color: colors.text.primary },
  userEmail: { fontSize: 14, color: colors.text.secondary },
  userRole: { fontSize: 13, color: colors.primary[600], fontWeight: '600' },
  form: { gap: spacing.md },
  actions: { marginTop: spacing.md },
});
