import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/auth.store';

export default function Index() {
  const { accessToken, user, isHydrated } = useAuthStore();

  // Aguarda hidratação completa antes de decidir rota
  if (!isHydrated) return null;

  // Sem token: vai para tela de boas-vindas
  if (!accessToken || !user) return <Redirect href="/(auth)/welcome" />;

  // Com token e user: redireciona pelo papel
  if (user.role === 'owner') return <Redirect href="/(owner)" />;
  return <Redirect href="/(player)" />;
}
