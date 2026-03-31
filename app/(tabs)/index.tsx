import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, font, spacing, radius } from "../../lib/theme";
import { re } from "../../lib/robotevents";
import { useStorage } from "../../lib/state/storage";
import { TeamProfileView } from "../../lib/components/TeamProfileView";

export default function HomeScreen() {
  const { team: teamNumber, program: programId } = useStorage();
  const [teamId, setTeamId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setRefreshKey((k) => k + 1);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (!teamNumber) {
      setTeamId(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    (async () => {
      try {
        const programs = await re.depaginate(
          re.program.programGetPrograms({}, re.custom.maxPages),
          re.models.PaginatedProgramFromJSON,
        );
        const prog =
          programs.find((p) => p.id === programId) ??
          programs.find((p) => p.abbr === "V5RC") ??
          programs[0];
        if (!prog || cancelled) return;

        const candidates = await re.depaginate(
          re.team.teamGetTeams({ number: [teamNumber], program: [prog.id!] }),
          re.models.PaginatedTeamFromJSON,
        );
        const target =
          candidates.find((t) => t.number.toLowerCase() === teamNumber.toLowerCase()) ??
          candidates[0] ??
          null;

        if (!cancelled) setTeamId(target?.id ?? null);
      } catch {
        if (!cancelled) setTeamId(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [teamNumber, programId]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : teamId ? (
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
          <TeamProfileView key={refreshKey} teamId={teamId} isOwnTeam />
        </ScrollView>
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.emptyCard}>
            <Text style={styles.empty}>
              Set a team during onboarding to see team stats and personalized upcoming
              events.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing["3xl"] },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  empty: { color: colors.mutedForeground },
  errorText: { color: colors.destructive },
  errorBox: {
    backgroundColor: colors.destructive + "20",
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
