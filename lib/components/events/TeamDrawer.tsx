import { useRef, useState, useEffect } from "react";
import {
  View,
  Animated,
  Text,
  ScrollView,
  Modal,
  Pressable,
  StyleSheet,
  PanResponder,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, eventFont as font, radius, spacing } from "../../theme";
import { RankStatsCard, SkillsStatsCard } from "./StatsCards";
import type { TeamSummary, TeamSkills } from "./StatsCards";
import { MatchRow } from "./MatchRow";
import { useStorage } from "../../state/storage";
import { upsertNote } from "../../supabase/notes";
import { fetchTeammateNotes } from "../../supabase/teams";
import type { VDAStats } from "../../data/vda";

type TeamMatch = {
  match: string;
  time: string;
  score: string;
  red: string[];
  blue: string[];
  played?: boolean;
};

interface Props {
  open: boolean;
  onClose: () => void;
  team: TeamSummary | null;
  skills: TeamSkills | null;
  matches: TeamMatch[];
  opr?: number | null;
  dpr?: number | null;
  ccwm?: number | null;
  onMatchPress?: (match: TeamMatch) => void;
  vdaMap?: Map<string, VDAStats> | null;
  predictionsEnabled?: boolean;
}

export const TeamDrawer = ({
  open,
  onClose,
  team,
  skills,
  matches,
  opr = null,
  dpr = null,
  ccwm = null,
  onMatchPress,
  vdaMap,
  predictionsEnabled,
}: Props) => {
  const insets = useSafeAreaInsets();
  const { notes, setNote, auth, scoutingTeams } = useStorage();
  const [noteText, setNoteText] = useState(notes[team?.team ?? ""] ?? "");
  const [teammateNotes, setTeammateNotes] = useState<
    { displayName: string; note: string; sharedTeams: string[] }[]
  >([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setNoteText(notes[team?.team ?? ""] ?? "");
    if (team?.team && auth && scoutingTeams.length > 0) {
      fetchTeammateNotes(team.team).then(setTeammateNotes);
    } else {
      setTeammateNotes([]);
    }
  }, [team?.team]);

  const handleNoteChange = (value: string) => {
    setNoteText(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (!team) return;
      setNote(team.team, value);
      if (auth) upsertNote(team.team, value);
    }, 1000);
  };

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const dragY = useRef(new Animated.Value(900)).current;
  const translateY = useRef(
    dragY.interpolate({
      inputRange: [0, 900],
      outputRange: [0, 900],
      extrapolateLeft: "clamp",
    }),
  ).current;
  const backdropOpacity = useRef(
    dragY.interpolate({
      inputRange: [0, 900],
      outputRange: [1, 0],
      extrapolate: "clamp",
    }),
  ).current;
  const dismiss = useRef(() => {
    Animated.timing(dragY, { toValue: 900, duration: 250, useNativeDriver: true }).start(
      () => {
        onCloseRef.current();
      },
    );
  }).current;
  useEffect(() => {
    if (open) {
      dragY.setValue(900);
      Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
    }
  }, [open]);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => dragY.setValue(0),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.5) {
          dismiss();
        } else {
          Animated.spring(dragY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;
  if (!team) return null;

  return (
    <Modal
      visible={open}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={dismiss}
    >
      <View style={styles.modalContainer}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: Math.max(insets.bottom, spacing.lg),
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.handleZone} {...panResponder.panHandlers}>
            <View style={styles.handle} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.teamNum}>{team.team}</Text>
            <Text style={styles.teamName}>{team.name || "No team name available"}</Text>

            <RankStatsCard team={team} opr={opr} dpr={dpr} ccwm={ccwm} />
            <SkillsStatsCard skills={skills} />
            <View style={styles.card}>
              <Text style={styles.notesLabel}>Scout Notes</Text>
              <TextInput
                style={styles.notesInput}
                multiline
                value={noteText}
                onChangeText={handleNoteChange}
                placeholder="Add notes about this team..."
                placeholderTextColor={colors.mutedForeground}
              />
            </View>
            {scoutingTeams.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.notesLabel}>Team Notes</Text>
                {teammateNotes.length === 0 ? (
                  <Text style={styles.noTeammateText}>
                    No teammates have noted this team yet.
                  </Text>
                ) : (
                  <View style={{ gap: 10 }}>
                    {teammateNotes.map((n, i) => (
                      <View key={i} style={styles.teammateNote}>
                        <Text style={styles.teammateNoteName}>{n.displayName}</Text>
                        {n.sharedTeams.length > 0 && (
                          <Text style={styles.teammateNoteTeams}>
                            {n.sharedTeams.join(" · ")}
                          </Text>
                        )}
                        <Text style={styles.teammateNoteText}>{n.note}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
            <Text style={styles.matchesTitle}>Matches</Text>
            {matches.length === 0 ? (
              <View style={styles.noMatches}>
                <Text style={styles.noMatchesText}>No matches found for this team.</Text>
              </View>
            ) : (
              <View style={{ gap: 4 }}>
                {matches.map((row, i) => {
                  const pred =
                    predictionsEnabled && vdaMap != null && !row.played
                      ? {
                          red: Math.round(
                            row.red.reduce(
                              (a, t) =>
                                a +
                                (vdaMap.get(t.toUpperCase())?.opr ??
                                  vdaMap.get(t)?.opr ??
                                  0),
                              0,
                            ) *
                              0.5 +
                              row.blue.reduce(
                                (a, t) =>
                                  a +
                                  (vdaMap.get(t.toUpperCase())?.dpr ??
                                    vdaMap.get(t)?.dpr ??
                                    0),
                                0,
                              ) *
                                0.5,
                          ),
                          blue: Math.round(
                            row.blue.reduce(
                              (a, t) =>
                                a +
                                (vdaMap.get(t.toUpperCase())?.opr ??
                                  vdaMap.get(t)?.opr ??
                                  0),
                              0,
                            ) *
                              0.5 +
                              row.red.reduce(
                                (a, t) =>
                                  a +
                                  (vdaMap.get(t.toUpperCase())?.dpr ??
                                    vdaMap.get(t)?.dpr ??
                                    0),
                                0,
                              ) *
                                0.5,
                          ),
                        }
                      : undefined;
                  return (
                    <MatchRow
                      key={i}
                      row={row}
                      highlightTeam={team.team}
                      predictedScore={pred}
                      onPress={onMatchPress ? () => onMatchPress(row) : undefined}
                    />
                  );
                })}
              </View>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: { flex: 1, justifyContent: "flex-end" as const },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
    maxHeight: "85%",
  },
  handleZone: {
    alignItems: "center",
    paddingVertical: 12,
    marginBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  teamNum: {
    fontSize: font["3xl"],
    fontWeight: "600",
    color: colors.foreground,
    lineHeight: 36,
  },
  teamName: {
    fontSize: font.base,
    color: colors.mutedForeground,
    marginTop: 4,
    marginBottom: 16,
  },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 12,
    backgroundColor: colors.background,
  },
  matchesTitle: {
    fontSize: font.xl,
    fontWeight: "500",
    color: colors.foreground,
    marginBottom: 12,
  },
  notesLabel: {
    fontSize: font.sm,
    fontWeight: "500",
    color: colors.mutedForeground,
    marginBottom: 8,
  },
  notesInput: {
    color: colors.foreground,
    fontSize: font.sm,
    minHeight: 80,
    textAlignVertical: "top",
  },
  noTeammateText: {
    fontSize: font.sm,
    color: colors.mutedForeground,
    fontStyle: "italic",
  },
  teammateNote: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  teammateNoteName: {
    fontSize: font.xs,
    fontWeight: "600",
    color: colors.mutedForeground,
    marginBottom: 1,
  },
  teammateNoteTeams: {
    fontSize: font.xs,
    color: colors.mutedForeground,
    marginBottom: 2,
  },
  teammateNoteText: {
    fontSize: font.sm,
    color: colors.foreground,
  },
  noMatches: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  noMatchesText: { fontSize: font.sm, color: colors.mutedForeground },
});
