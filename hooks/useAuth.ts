import { useAuthStore } from '../store/auth.store';

export function useAuth() {
  const { user, accessToken, isLoading, signIn, signOut, setUser } = useAuthStore();
  return {
    user,
    accessToken,
    isLoading,
    isAuthenticated: !!accessToken,
    isPlayer: user?.role === 'player',
    isOwner: user?.role === 'owner',
    isMaster: user?.role === 'master',
    signIn,
    signOut,
    setUser,
  };
}
