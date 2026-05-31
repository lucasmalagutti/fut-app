import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import { MapPin, Search } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { mergeRefetch, usePullToRefresh } from "../../hooks/usePullToRefresh";
import { CourtCard } from "../../components/courts/CourtCard";
import { Chip } from "../../components/ui/Chip";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadingSpinner } from "../../components/ui/LoadingSpinner";
import { useGeolocation } from "../../hooks/useGeolocation";
import { courtsService } from "../../services/courts.service";
import { useAuthStore } from "../../store/auth.store";
import { colors, spacing } from "../../theme";

const SPORTS = ["Todos", "Futebol", "Society", "Futsal", "Futevôlei"];

export default function PlayerHomeScreen() {
  const user = useAuthStore((s) => s.user);
  const { location } = useGeolocation();
  const [search, setSearch] = useState("");
  const [selectedSport, setSelectedSport] = useState("Todos");

  const { data: courts = [], isLoading, refetch } = useQuery({
    queryKey: [
      "courts",
      {
        q: search,
        sport: selectedSport,
        lat: location?.latitude,
        lng: location?.longitude,
      },
    ],
    queryFn: () =>
      courtsService.listAll({
        q: search || undefined,
        sport: selectedSport === "Todos" ? undefined : selectedSport,
        lat: location?.latitude,
        lng: location?.longitude,
        radius: location ? 50 : undefined,
      }),
    staleTime: 60_000,
  });

  const refetchCourts = useCallback(() => refetch(), [refetch]);
  const { refreshing, onRefresh } = usePullToRefresh(refetchCourts);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Olá, {user?.name?.split(" ")[0]} 👋
          </Text>
          <View style={styles.locationRow}>
            <MapPin size={14} color={colors.primary[600]} />
            <Text style={styles.locationText}>Quadras próximas</Text>
          </View>
        </View>
      </View>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color={colors.neutral[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar quadra..."
            placeholderTextColor={colors.neutral[400]}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Sport filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersRow}
      >
        {SPORTS.map((sport) => (
          <Chip
            key={sport}
            label={sport}
            selected={selectedSport === sport}
            onPress={() => setSelectedSport(sport)}
          />
        ))}
      </ScrollView>

      {/* Courts list */}
      {isLoading ? (
        <LoadingSpinner />
      ) : courts.length === 0 ? (
        <EmptyState
          title="Nenhuma quadra encontrada"
          description="Tente buscar com outros termos ou filtros."
          actionLabel="Limpar filtros"
          onAction={() => {
            setSearch("");
            setSelectedSport("Todos");
          }}
        />
      ) : (
        <FlatList
          data={courts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CourtCard
              court={item}
              onPress={() =>
                router.push({
                  pathname: "/(player)/courts/[id]",
                  params: { id: item.id },
                })
              }
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary[600]} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  greeting: { fontSize: 22, fontWeight: "800", color: colors.text.primary },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  locationText: { fontSize: 13, color: colors.text.secondary },
  searchContainer: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text.primary },
  filtersRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    alignItems: 'center',
  },
  list: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
});
