import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/auth.store';

export default function Index() {
  const { accessToken, user } = useAuthStore();

  if (!accessToken) return <Redirect href="/(auth)/welcome" />;
  if (user?.role === 'owner') return <Redirect href="/(owner)" />;
  return <Redirect href="/(player)" />;
}
