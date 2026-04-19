import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import { router } from "expo-router";
import {
  ArrowRight,
  Trophy,
  Gamepad2,
  TrendingUp,
  Award,
  Star,
  Bell,
  BellOff,
} from "lucide-react-native";
import { colors, font, radius, spacing } from "../theme";
import { re } from "../robotevents";
import { SkillType } from "../robotevents/robotevents/models";
import type { Event, Team } from "../robotevents/robotevents/models";
import { RankStatsCard, SkillsStatsCard } from "./events/StatsCards";
import type { TeamSummary, TeamSkills } from "./events/StatsCards";
import { getVDAStatsByTeamNum, type VDAStats } from "../data/vda";
import { useStorage } from "../state/storage";
import { useLivePolling } from "../hooks/useLivePolling";
import { requestNotificationPermission } from "../notifications";
import {
  addNotificationPreference,
  removeNotificationPreference,
  registerPushToken,
} from "../supabase/notifications";
import { getExpoPushToken } from "../notifications";

interface Props {
  teamId: number;
}

export const FavoriteTeamEntry = ({ teamId }: Props) => {
  const {
    addFavoriteTeam,
    removeFavoriteTeam,
    favorites,
    auth,
    notifications,
    toggleNotificationFavorite,
  } = useStorage();
  const isFav = favorites.teams.includes(teamId);
  const isNotifEnabled = notifications.favorites.includes(teamId);
  const toggleFav = () => {
    if (isFav) removeFavoriteTeam(teamId);
    else addFavoriteTeam(teamId);
  };
  const toggleNotif = async () => {
    if (!auth) {
      Alert.alert("Sign in required", "Sign in to enable push notifications.");
      return;
    }
    if (!isNotifEnabled) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          "Permission denied",
          "Enable notifications in your device settings to receive match and award updates.",
        );
        return;
      }
      const token = await getExpoPushToken();
      if (token) await registerPushToken(token);
      if (team) {
        await addNotificationPreference(teamId, team.number, team.program.id);
      }
    } else {
      await removeNotificationPreference(teamId);
    }
    toggleNotificationFavorite(teamId);
  };

  const [team, setTeam] = useState<Team | null>(null);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [activeEvent, setActiveEvent] = useState<Event | null | undefined>(undefined);
  const [loadingHeader, setLoadingHeader] = useState(true);

  const [matchStats, setMatchStats] = useState<{
    winRate: number;
    wins: number;
    losses: number;
    ties: number;
  } | null>(null);
  const [skillsStats, setSkillsStats] = useState<{
    rank: number | null;
    score: number | null;
  } | null>(null);
  const [vdaStats, setVdaStats] = useState<VDAStats | null>(null);
  const [awardsCount, setAwardsCount] = useState<number | null>(null);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [loadingSeasonSkills, setLoadingSeasonSkills] = useState(false);
  const [loadingVda, setLoadingVda] = useState(false);
  const [loadingAwards, setLoadingAwards] = useState(false);

  const [rankingRow, setRankingRow] = useState<TeamSummary | null>(null);
  const [skillsRow, setSkillsRow] = useState<TeamSkills | null>(null);
  const [loadingRank, setLoadingRank] = useState(false);
  const [loadingEventSkills, setLoadingEventSkills] = useState(false);

  const [activeDivId, setActiveDivId] = useState<number | null>(null);
  const [liveKey, setLiveKey] = useState(0);
  const hasLoadedOnceRef = useRef(false);

  const { lastRefreshed } = useLivePolling(() => {
    if (activeDivId !== null && activeEvent != null) setLiveKey((k) => k + 1);
  });

  useEffect(() => {
    let cancelled = false;
    setLoadingHeader(true);

    (async () => {
      try {
        const fetched = await re.team.teamGetTeam({ id: teamId });
        if (cancelled) return;

        setTeam(fetched);

        const seasons = await re.depaginate(
          re.season.seasonGetSeasons(
            { program: [fetched.program.id] },
            re.custom.maxPages,
          ),
          re.models.PaginatedSeasonFromJSON,
          250,
        );
        if (cancelled || seasons.length === 0) {
          if (!cancelled) setLoadingHeader(false);
          return;
        }

        const now = new Date();
        const started = seasons.filter((s) => s.start && s.start <= now);
        const pool = started.length > 0 ? started : seasons;
        const season = pool.reduce((a, b) => (a.start! > b.start! ? a : b));
        if (!cancelled) {
          setSeasonId(season.id!);
          setLoadingMatches(true);
          setLoadingSeasonSkills(true);
          setLoadingVda(true);
          setLoadingAwards(true);
        }

        const events = await re.depaginate(
          re.team.teamGetEvents({ id: teamId, season: [season.id!] }),
          re.models.PaginatedEventFromJSON,
        );
        if (cancelled) return;

        now.setHours(0, 0, 0, 0);
        const active =
          events.find((e) => {
            const start = e.start;
            const end = e.end ?? e.start;
            return start != null && end != null && start <= now && end >= now;
          }) ?? null;

        if (!cancelled) {
          setActiveEvent(active);
          setLoadingHeader(false);
        }

        (async () => {
          try {
            const matches = await re.depaginate(
              re.team.teamGetMatches(
                { id: teamId, season: [season.id!] },
                re.custom.maxPages,
              ),
              re.models.PaginatedMatchFromJSON,
              250,
            );
            if (cancelled) return;
            const totals = matches.reduce(
              (acc, match) => {
                const alliance = match.alliances.find((a) =>
                  a.teams.some((t) => t.team?.id === teamId),
                );
                const opposite = match.alliances.find((a) => a.color !== alliance?.color);
                if (!alliance || !opposite) return acc;
                if (alliance.score > opposite.score) acc.wins += 1;
                else if (alliance.score < opposite.score) acc.losses += 1;
                else acc.ties += 1;
                return acc;
              },
              { wins: 0, losses: 0, ties: 0 },
            );
            const total = totals.wins + totals.losses + totals.ties;
            if (!cancelled)
              setMatchStats({
                ...totals,
                winRate: total > 0 ? (totals.wins / total) * 100 : 0,
              });
          } catch {
          } finally {
            if (!cancelled) setLoadingMatches(false);
          }
        })();

        (async () => {
          try {
            const leaderboard = await re.custom.cache.load(
              "skills.leaderboard",
              season.id!,
            );
            if (cancelled) return;
            const entry = leaderboard.find((e) => e.team.id === teamId) ?? null;
            if (!cancelled)
              setSkillsStats({
                rank: entry?.rank ?? null,
                score: entry?.scores?.score ?? null,
              });
          } catch {
          } finally {
            if (!cancelled) setLoadingSeasonSkills(false);
          }
        })();

        (async () => {
          try {
            const vda = await getVDAStatsByTeamNum(
              season.id!,
              season.id!,
              fetched.number,
            );
            if (!cancelled) setVdaStats(vda);
          } catch {
          } finally {
            if (!cancelled) setLoadingVda(false);
          }
        })();

        (async () => {
          try {
            const awards = await re.depaginate(
              re.team.teamGetAwards(
                { id: teamId, season: [season.id!] },
                re.custom.maxPages,
              ),
              re.models.PaginatedAwardFromJSON,
              250,
            );
            if (!cancelled) setAwardsCount(awards.length);
          } catch {
          } finally {
            if (!cancelled) setLoadingAwards(false);
          }
        })();
      } catch {
        if (!cancelled) {
          setActiveEvent(null);
          setLoadingHeader(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [teamId]);

  useEffect(() => {
    if (!activeEvent) return;
    let cancelled = false;
    hasLoadedOnceRef.current = false;
    setActiveDivId(null);
    setLiveKey(0);

    re.events.eventGetEvent({ id: activeEvent.id }).then((eventData) => {
      if (cancelled) return;
      const sorted = [...(eventData.divisions ?? [])].sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0),
      );
      setActiveDivId((sorted[0] as (typeof sorted)[0] & { id: number })?.id ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [activeEvent?.id, teamId]);

  useEffect(() => {
    if (activeDivId === null || !activeEvent) return;
    let cancelled = false;
    const isFirstLoad = !hasLoadedOnceRef.current;
    if (isFirstLoad) {
      setLoadingRank(true);
      setLoadingEventSkills(true);
    }

    Promise.all([
      re.depaginate(
        re.events.eventGetDivisionRankings(
          { id: activeEvent.id, div: activeDivId },
          re.custom.maxPages,
        ),
        re.models.PaginatedRankingFromJSON,
        250,
      ),
      re.depaginate(
        re.events.eventGetTeams({ id: activeEvent.id }, re.custom.maxPages),
        re.models.PaginatedTeamFromJSON,
        250,
      ),
    ])
      .then(([rankings, teams]) => {
        if (cancelled) return;
        const teamMap = new Map(teams.map((t) => [t.id, t.number]));
        const myRank = rankings.find((r) => r.team?.id === teamId);
        const row: TeamSummary | null = myRank
          ? {
              rank: myRank.rank ?? 0,
              team: teamMap.get(myRank.team?.id ?? 0) ?? team?.number ?? "",
              name: teams.find((t) => t.id === myRank.team?.id)?.teamName ?? "",
              wins: myRank.wins ?? 0,
              losses: myRank.losses ?? 0,
              ties: myRank.ties ?? 0,
              wp: myRank.wp ?? 0,
              ap: myRank.ap ?? 0,
              sp: myRank.sp ?? 0,
            }
          : null;
        if (!cancelled) {
          hasLoadedOnceRef.current = true;
          setRankingRow(row);
          setLoadingRank(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingRank(false);
      });

    re.depaginate(
      re.events.eventGetSkills({ id: activeEvent.id }, re.custom.maxPages),
      re.models.PaginatedSkillFromJSON,
      250,
    )
      .then((skills) => {
        if (cancelled) return;
        const agg = new Map<
          number,
          { driver: number; auton: number; driverRuns: number; autonRuns: number }
        >();
        for (const skill of skills) {
          const id = skill.team?.id;
          if (!id) continue;
          const cur = agg.get(id) ?? { driver: 0, auton: 0, driverRuns: 0, autonRuns: 0 };
          const score = skill.score ?? 0;
          const attempts = skill.attempts ?? 0;
          if (skill.type === SkillType.Driver) {
            agg.set(id, {
              ...cur,
              driver: Math.max(cur.driver, score),
              driverRuns: Math.max(cur.driverRuns, attempts),
            });
          } else if (skill.type === SkillType.Programming) {
            agg.set(id, {
              ...cur,
              auton: Math.max(cur.auton, score),
              autonRuns: Math.max(cur.autonRuns, attempts),
            });
          }
        }
        const teamEntry = agg.get(teamId);
        if (!cancelled) {
          setSkillsRow(
            teamEntry
              ? {
                  rank: 0,
                  points: teamEntry.driver + teamEntry.auton,
                  driver: teamEntry.driver,
                  driverRuns: teamEntry.driverRuns,
                  auton: teamEntry.auton,
                  autonRuns: teamEntry.autonRuns,
                }
              : null,
          );
          setLoadingEventSkills(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingEventSkills(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeEvent?.id, activeDivId, teamId, liveKey]);

  if (loadingHeader) {
    return (
      <View style={styles.loaderWrapper}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          style={{ flex: 1 }}
          onPress={() => router.push(`/team/${teamId}` as any)}
        >
          <Text style={styles.teamNumber}>{team?.number ?? ""}</Text>
          <Text style={styles.teamName}>
            {team?.teamName ?? team?.organization ?? "Team profile"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleNotif} hitSlop={8} style={{ paddingRight: 8 }}>
          {isNotifEnabled ? (
            <Bell size={18} color={colors.primary} fill={colors.primary} />
          ) : (
            <BellOff size={18} color={colors.mutedForeground} />
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={toggleFav} hitSlop={8} style={{ paddingRight: 4 }}>
          <Star
            size={20}
            color={colors.foreground}
            fill={isFav ? colors.foreground : "transparent"}
          />
        </TouchableOpacity>
      </View>

      {activeEvent && (
        <>
          <View style={styles.divider} />
          <View style={styles.eventRow}>
            <View style={styles.eventLabelRow}>
              <Text style={styles.currentEventLabel}>Current Event</Text>
              <Text style={styles.eventName} numberOfLines={1}>
                {activeEvent.name}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.openBtn}
              onPress={() => router.push(`/events/${activeEvent.id}` as any)}
            >
              <Text style={styles.openBtnText}>Open</Text>
              <ArrowRight size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {lastRefreshed && (
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>
                Live ·{" "}
                {lastRefreshed.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          )}

          {loadingRank ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />
          ) : rankingRow ? (
            <RankStatsCard team={rankingRow} />
          ) : (
            <Text style={styles.emptyText}>Rankings not yet available.</Text>
          )}

          {loadingEventSkills ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />
          ) : (
            <SkillsStatsCard skills={skillsRow} />
          )}
        </>
      )}

      <View style={styles.divider} />

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <View style={styles.statLabel}>
            <Trophy size={14} color={colors.mutedForeground} />
            <Text style={styles.statLabelText}>Win Rate</Text>
          </View>
          {loadingMatches ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={styles.statLoader}
            />
          ) : (
            <>
              <Text style={styles.statValue}>
                {matchStats ? `${matchStats.winRate.toFixed(1)}%` : "N/A"}
              </Text>
              <Text style={styles.statSub}>
                {matchStats
                  ? `${matchStats.wins}-${matchStats.losses}-${matchStats.ties}`
                  : "—"}
              </Text>
            </>
          )}
        </View>
        <View style={styles.statBox}>
          <View style={styles.statLabel}>
            <Gamepad2 size={14} color={colors.mutedForeground} />
            <Text style={styles.statLabelText}>Skills</Text>
          </View>
          {loadingSeasonSkills ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={styles.statLoader}
            />
          ) : (
            <>
              <Text style={styles.statValue}>{skillsStats?.score ?? "N/A"}</Text>
              <Text style={styles.statSub}>
                Rank {skillsStats?.rank != null ? `#${skillsStats.rank}` : "N/A"}
              </Text>
            </>
          )}
        </View>
        <View style={styles.statBox}>
          <View style={styles.statLabel}>
            <TrendingUp size={14} color={colors.mutedForeground} />
            <Text style={styles.statLabelText}>TrueSkill</Text>
          </View>
          {loadingVda ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={styles.statLoader}
            />
          ) : (
            <>
              <Text style={styles.statValue}>
                {vdaStats?.trueSkill != null ? vdaStats.trueSkill.toFixed(1) : "N/A"}
              </Text>
              <Text style={styles.statSub} numberOfLines={1}>
                {vdaStats?.opr != null
                  ? `${vdaStats.opr.toFixed(1)} OPR / ${vdaStats.dpr?.toFixed(1)} DPR / ${vdaStats.ccwm?.toFixed(1)} CCWM`
                  : "OPR / DPR / CCWM"}
              </Text>
            </>
          )}
        </View>
        <View style={styles.statBox}>
          <View style={styles.statLabel}>
            <Award size={14} color={colors.mutedForeground} />
            <Text style={styles.statLabelText}>Awards</Text>
          </View>
          {loadingAwards ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
              style={styles.statLoader}
            />
          ) : (
            <>
              <Text style={styles.statValue}>{awardsCount ?? "N/A"}</Text>
              <Text style={styles.statSub}>this season</Text>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  loaderWrapper: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  teamNumber: { fontSize: font["2xl"], fontWeight: "600", color: colors.foreground },
  teamName: { fontSize: font.sm, color: colors.mutedForeground, marginTop: 2 },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  eventLabelRow: {
    flex: 1,
    gap: 2,
  },
  currentEventLabel: {
    fontSize: font.xs,
    fontWeight: "600",
    color: colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.green,
  },
  liveText: {
    fontSize: font.xs,
    color: colors.mutedForeground,
  },
  eventName: {
    fontSize: font.sm,
    fontWeight: "600",
    color: colors.foreground,
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  openBtnText: {
    fontSize: font.sm,
    color: colors.primary,
    fontWeight: "500",
  },
  emptyText: {
    fontSize: font.sm,
    color: colors.mutedForeground,
    textAlign: "center",
  },
  statsRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  statBox: {
    width: "47.5%",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  statLabel: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  statLabelText: { fontSize: font.sm, color: colors.mutedForeground },
  statValue: { fontSize: font.xl, fontWeight: "600", color: colors.foreground },
  statSub: { fontSize: font.sm, color: colors.mutedForeground, marginTop: 2 },
  statLoader: { marginTop: 4, alignSelf: "flex-start" },
});
