import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Plus } from 'lucide-react-native';
import { FlatList, Image, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { Avatar } from '../../../components/ui/Avatar';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { EmptyState } from '../../../components/ui/EmptyState';
import { LoadingSpinner } from '../../../components/ui/LoadingSpinner';
import { courtsService, resolvePhotoUrl } from '../../../services/courts.service';
import { useAuthStore } from '../../../store/auth.store';
import { colors, spacing } from '../../../theme';

export default function OwnerCourtsScreen() {
  const user = useAuthStore((s) => s.user);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['owner-courts', user?.id],
    queryFn: () => courtsService.listByOwner(user!.id),
    enabled: !!user?.id,
  });

  const courts = data ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Minhas Quadras</Text>
        <Button
          label="Nova quadra"
          size="sm"
          icon={<Plus size={16} color={colors.white} />}
          onPress={() => router.push('/(owner)/courts/new')}
        />
      </View>

      {isLoading ? (
        <LoadingSpinner />
      ) : courts.length === 0 ? (
        <EmptyState
          title="Nenhuma quadra cadastrada"
          description="Cadastre sua primeira quadra para começar a receber reservas."
          actionLabel="Cadastrar quadra"
          onAction={() => router.push('/(owner)/courts/new')}
        />
      ) : (
        <FlatList
          data={courts}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <Card
              onPress={() =>
                router.push({ pathname: '/(owner)/courts/[id]', params: { id: item.id } })
              }
              style={styles.courtCard}
            >
              <View style={styles.courtRow}>
                {(() => {
                  // Backend retorna fotos ordenadas por createdAt asc — primeira é a mais antiga presente
                  const firstPhoto = item.photos?.[0];
                  return firstPhoto ? (
                    <Image
                      source={{ uri: resolvePhotoUrl(firstPhoto.url) }}
                      style={styles.courtThumb}
                    />
                  ) : (
                    <View style={styles.courtEmoji}>
                      <Text style={{ fontSize: 28 }}>⚽</Text>
                    </View>
                  );
                })()}
                <View style={{ flex: 1 }}>
                  <View style={styles.courtHeader}>
                    <Text style={styles.courtName}>{item.name}</Text>
                    <Badge
                      label={item.status === 'active' ? 'Ativa' : 'Inativa'}
                      variant={item.status === 'active' ? 'success' : 'neutral'}
                    />
                  </View>
                  <Text style={styles.courtSport}>{item.sport}</Text>
                  <Text style={styles.courtCity}>{item.city}</Text>
                </View>
              </View>
            </Card>
          )}
          contentContainerStyle={styles.list}
          onRefresh={refetch}
          refreshing={isLoading}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg },
  title: { fontSize: 26, fontWeight: '800', color: colors.text.primary },
  list: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  courtCard: {},
  courtRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  courtEmoji: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  courtThumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  courtHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
  courtName: { fontSize: 16, fontWeight: '700', color: colors.text.primary, flex: 1 },
  courtSport: { fontSize: 13, color: colors.primary[600], fontWeight: '500' },
  courtCity: { fontSize: 13, color: colors.text.secondary },
});
