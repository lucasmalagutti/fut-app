import { router } from 'expo-router';
import { StyleSheet, Text, View, SafeAreaView, Image } from 'react-native';
import { Button } from '../../components/ui/Button';
import { colors, spacing } from '../../theme';

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>⚽</Text>
        </View>
        <Text style={styles.appName}>FutMatch</Text>
        <Text style={styles.tagline}>
          Encontre e reserve quadras de futebol perto de você
        </Text>
      </View>

      <View style={styles.cards}>
        <View style={styles.roleCard} onTouchEnd={() => router.push('/(auth)/signup?role=player')}>
          <Text style={styles.roleIcon}>🏃</Text>
          <View>
            <Text style={styles.roleTitle}>Sou Jogador</Text>
            <Text style={styles.roleDesc}>Busque e reserve quadras</Text>
          </View>
        </View>
        <View style={styles.roleCard} onTouchEnd={() => router.push('/(auth)/signup?role=owner')}>
          <Text style={styles.roleIcon}>🏟️</Text>
          <View>
            <Text style={styles.roleTitle}>Sou Dono de Quadra</Text>
            <Text style={styles.roleDesc}>Cadastre e gerencie suas quadras</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <Text style={styles.loginText}>
          Já tem conta?{' '}
          <Text
            style={styles.loginLink}
            onPress={() => router.push('/(auth)/login')}
          >
            Entrar
          </Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.primary[600] },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  logoIcon: { fontSize: 52 },
  appName: { fontSize: 40, fontWeight: '800', color: colors.white, letterSpacing: -0.5 },
  tagline: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    lineHeight: 24,
  },
  cards: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  roleIcon: { fontSize: 36 },
  roleTitle: { fontSize: 17, fontWeight: '700', color: colors.text.primary },
  roleDesc: { fontSize: 13, color: colors.text.secondary, marginTop: 2 },
  actions: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
  },
  loginText: { fontSize: 15, color: 'rgba(255,255,255,0.8)' },
  loginLink: { color: colors.white, fontWeight: '700' },
});
