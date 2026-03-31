import { View, Text, StyleSheet, Pressable } from "react-native";
import { Zap } from "lucide-react-native";
import { colors, eventFont as font } from "../../theme";

type MatchRowData = {
  match: string;
  time: string;
  score: string;
  red: string[];
  blue: string[];
};

interface Props {
  row: MatchRowData;
  highlightTeam?: string | null;
  onPress?: () => void;
  predictedScore?: { red: number; blue: number };
}

const parseScore = (score: string): [number, number] => {
  const [l = "0", r = "0"] = score.split("-");
  const left = parseInt(l.trim(), 10);
  const right = parseInt(r.trim(), 10);
  return [isNaN(left) ? 0 : left, isNaN(right) ? 0 : right];
};

const winner = (score: string): "red" | "blue" | "tie" => {
  const [l, r] = parseScore(score);
  if (l > r) return "red";
  if (l < r) return "blue";
  return "tie";
};

const normalize = (v: string) => v.trim().toLowerCase();

export const MatchRow = ({
  row,
  highlightTeam = null,
  onPress,
  predictedScore,
}: Props) => {
  const isHighlighted = (team: string) =>
    highlightTeam !== null && normalize(team) === normalize(highlightTeam);

  const highlightedAlliance = row.red.some(isHighlighted)
    ? "red"
    : row.blue.some(isHighlighted)
      ? "blue"
      : null;

  const w = winner(row.score);
  const [redScore, blueScore] = parseScore(row.score);

  const displayRed = predictedScore != null ? Math.round(predictedScore.red) : redScore;
  const displayBlue =
    predictedScore != null ? Math.round(predictedScore.blue) : blueScore;

  const predictedWinner: "red" | "blue" | "tie" | null = predictedScore
    ? predictedScore.red > predictedScore.blue
      ? "red"
      : predictedScore.red < predictedScore.blue
        ? "blue"
        : "tie"
    : null;

  const effectiveWinner = predictedScore != null ? predictedWinner : w;

  const matchColor = highlightedAlliance
    ? effectiveWinner === highlightedAlliance
      ? "#86efac"
      : effectiveWinner === (highlightedAlliance === "red" ? "blue" : "red")
        ? "#fca5a5"
        : colors.foreground
    : effectiveWinner === "red"
      ? "#fca5a5"
      : effectiveWinner === "blue"
        ? "#93c5fd"
        : colors.foreground;

  return (
    <Pressable style={styles.row} onPress={onPress} disabled={!onPress}>
      <Text style={[styles.matchLabel, { color: matchColor }]}>{row.match}</Text>

      <View style={styles.scoreCol}>
        <View style={styles.scoreGrid}>
          {predictedScore != null ? (
            <Zap size={10} color={colors.primary} fill={colors.primary} />
          ) : (
            <Text style={styles.timeTxt}>{row.time}</Text>
          )}
          <View style={styles.scoreRow}>
            <Text style={styles.redScore}>{displayRed}</Text>
            <Text style={styles.dash}>-</Text>
            <Text style={styles.blueScore}>{displayBlue}</Text>
          </View>
        </View>
      </View>

      <View style={styles.teamsCol}>
        <View style={styles.allianceCol}>
          {row.red.map((team, i) => (
            <Text
              key={i}
              style={[styles.redTeam, isHighlighted(team) && styles.highlighted]}
            >
              {team}
            </Text>
          ))}
        </View>
        <View style={styles.allianceColRight}>
          {row.blue.map((team, i) => (
            <Text
              key={i}
              style={[styles.blueTeam, isHighlighted(team) && styles.highlighted]}
            >
              {team}
            </Text>
          ))}
        </View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 6,
  },
  matchLabel: { flex: 2, fontSize: font["2xl"], fontWeight: "500" },
  scoreCol: { flex: 3, alignItems: "flex-end", paddingRight: 12 },
  scoreGrid: { gap: 2, alignItems: "center" },
  timeTxt: { fontSize: font.base, color: colors.mutedForeground },
  scoreRow: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  redScore: { fontSize: font.base, color: "#fca5a5", fontVariant: ["tabular-nums"] },
  dash: { fontSize: font.base, color: colors.mutedForeground, paddingHorizontal: 16 },
  blueScore: { fontSize: font.base, color: "#93c5fd", fontVariant: ["tabular-nums"] },
  teamsCol: {
    flex: 3,
    flexDirection: "row",
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingLeft: 16,
    gap: 12,
  },
  allianceCol: { flex: 1, gap: 2 },
  allianceColRight: { flex: 1, gap: 2, alignItems: "flex-end" },
  redTeam: { fontSize: font.sm, color: "#fca5a5", fontVariant: ["tabular-nums"] },
  blueTeam: { fontSize: font.sm, color: "#93c5fd", fontVariant: ["tabular-nums"] },
  highlighted: { fontWeight: "700", textDecorationLine: "underline" },
});
