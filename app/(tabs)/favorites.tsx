import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { ArrowRight, ArrowUpDown, Star } from "lucide-react-native";
import DraggableFlatList, {
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { colors, font, spacing, radius } from "../../lib/theme";
import { re } from "../../lib/robotevents";
import type { Event } from "../../lib/robotevents/robotevents/models";
import { useStorage } from "../../lib/state/storage";
import { FavoriteTeamEntry } from "../../lib/components/FavoriteTeamEntry";
import { DragTeamRow } from "../../lib/components/DragTeamRow";
import { clearVdaCache } from "../../lib/data/vda";

export default function FavoritesScreen() {
  const { favorites, reorderFavoriteTeams } = useStorage();
  const [editMode, setEditMode] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    clearVdaCache();
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (favorites.events.length === 0) {
      setEvents([]);
      setRefreshing(false);
      return;
    }

    let cancelled = false;
    setLoadingEvents(true);

    Promise.all(favorites.events.map((id) => re.events.eventGetEvent({ id })))
      .then((results) => {
        if (!cancelled) {
          setEvents(results);
          setLoadingEvents(false);
          setRefreshing(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadingEvents(false);
          setRefreshing(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [favorites.events.join(","), refreshKey]);

  const isEmpty = favorites.teams.length === 0 && favorites.events.length === 0;

  const renderDragItem = ({ item, drag, isActive }: RenderItemParams<number>) => (
    <DragTeamRow teamId={item} drag={drag} isActive={isActive} />
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.headingRow}>
          <Text style={styles.heading}>Favorites</Text>
          {favorites.teams.length > 0 && (
            <TouchableOpacity onPress={() => setEditMode((v) => !v)} hitSlop={8}>
              {editMode ? (
                <Text style={styles.doneButton}>Done</Text>
              ) : (
                <ArrowUpDown size={22} color={colors.mutedForeground} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {isEmpty && (
          <View style={styles.emptyBox}>
            <Star size={32} color={colors.mutedForeground} />
            <Text style={styles.emptyText}>No favorites yet</Text>
            <Text style={styles.emptySubtext}>
              Save teams and events to find them here.
            </Text>
          </View>
        )}

        {events.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Events</Text>
            {loadingEvents && (
              <ActivityIndicator color={colors.primary} style={{ marginBottom: 8 }} />
            )}
            {events.map((event) => (
              <TouchableOpacity
                key={event.id}
                style={[styles.card, { marginBottom: 8 }]}
                onPress={() => router.push(`/events/${event.id}`)}
              >
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.eventName} numberOfLines={2}>
                      {event.name}
                    </Text>
                    <Text style={styles.eventMeta}>
                      {event.location?.city}, {event.location?.region}
                    </Text>
                  </View>
                  <ArrowRight size={16} color={colors.mutedForeground} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {favorites.teams.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Teams</Text>
            {!editMode && (
              <Text style={styles.sectionHint}>Tap a team to view more information</Text>
            )}
            {editMode ? (
              <DraggableFlatList
                data={favorites.teams}
                keyExtractor={(item) => String(item)}
                renderItem={renderDragItem}
                onDragEnd={({ data }) => reorderFavoriteTeams(data)}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              />
            ) : (
              <View style={styles.teamsList}>
                {favorites.teams.map((id) => (
                  <FavoriteTeamEntry key={`${refreshKey}-${id}`} teamId={id} />
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing["3xl"] },
  headingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  heading: {
    fontSize: font["2xl"],
    fontWeight: "600",
    color: colors.foreground,
  },
  doneButton: {
    fontSize: font.base,
    fontWeight: "600",
    color: colors.primary,
  },
  section: { marginBottom: spacing.xl },
  sectionLabel: {
    fontSize: font.sm,
    fontWeight: "500",
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  eventName: { fontSize: font.base, fontWeight: "500", color: colors.foreground },
  eventMeta: { fontSize: font.sm, color: colors.mutedForeground, marginTop: 2 },
  teamsList: { gap: spacing.xl },
  sectionHint: {
    fontSize: font.xs,
    color: colors.mutedForeground,
    marginBottom: spacing.sm,
  },
  emptyBox: { alignItems: "center", marginTop: 64, gap: 8 },
  emptyText: { fontSize: font.lg, fontWeight: "500", color: colors.foreground },
  emptySubtext: { fontSize: font.sm, color: colors.mutedForeground, textAlign: "center" },
});
