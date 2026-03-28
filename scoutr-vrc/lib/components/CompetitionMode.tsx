import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, Clock, MapPin } from 'lucide-react-native';
import { colors, font, radius, spacing } from '../theme';
import { re } from '../robotevents';
import { SkillType } from '../robotevents/robotevents/models';
import { RankStatsCard, SkillsStatsCard } from './events/StatsCards';
import type { TeamSummary, TeamSkills } from './events/StatsCards';
import type { Event, MatchObj } from '../robotevents/robotevents/models';

type RankingRow = {
	rank: number;
	team: string;
	name: string;
	wins: number;
	losses: number;
	ties: number;
	wp: number;
	ap: number;
	sp: number;
};

type SkillsRow = {
	rank: number;
	team: string;
	name: string;
	points: number;
	driver: number;
	driverRuns: number;
	auton: number;
	autonRuns: number;
};

type NextMatchInfo = {
	name: string;
	field: string | undefined;
	time: string;
	matchesUntil: number;
	alliance: 'red' | 'blue';
	myTeams: string[];
	opponents: string[];
	partnerTeams: string[];
};

interface Props {
	event: Event;
	teamId: number;
	teamNumber: string;
}

const formatMatchName = (match: MatchObj): string => {
	const raw = match.name?.trim() ?? '';
	if (raw.length > 0) {
		const n = raw.replace(/\s+/g, ' ').trim();
		const practice = n.match(/^practice\s*#?\s*(\d+)$/i);
		if (practice) return `P${practice[1]}`;
		const qualifier = n.match(/^(?:qualifier|qualification)\s*#?\s*(\d+)$/i);
		if (qualifier) return `Q${qualifier[1]}`;
		const parseElim = (pattern: RegExp, prefix: string) => {
			const parsed = n.match(pattern);
			if (!parsed) return null;
			const inst = parsed[1] ?? `${match.instance || 1}`;
			const num = parsed[2] ?? `${match.matchnum || 1}`;
			return `${prefix} ${inst}-${num}`;
		};
		const r16 = parseElim(/^(?:round\s*of\s*16|r16)\s*#?\s*(\d+)(?:\s*-\s*(\d+))?$/i, 'R16');
		if (r16) return r16;
		const qf = parseElim(
			/^(?:quarter\s*final|quarterfinal|qf)\s*#?\s*(\d+)(?:\s*-\s*(\d+))?$/i,
			'QF'
		);
		if (qf) return qf;
		const sf = parseElim(/^(?:semi\s*final|semifinal|sf)\s*#?\s*(\d+)(?:\s*-\s*(\d+))?$/i, 'SF');
		if (sf) return sf;
		const finals = parseElim(/^(?:final|finals|f)\s*#?\s*(\d+)(?:\s*-\s*(\d+))?$/i, 'F');
		if (finals) return finals;
		return n;
	}
	const labels: Record<number, string> = { 1: 'P', 2: 'Q', 3: 'QF', 4: 'SF', 5: 'F', 6: 'R16' };
	const label = labels[match.round] ?? `Round ${match.round}`;
	if (match.round === 2) return `${label}${match.matchnum}`;
	if (match.round >= 3 && match.instance > 0) return `${label} ${match.instance}-${match.matchnum}`;
	return `${label} ${match.matchnum}`;
};

const formatTime = (v?: Date) => {
	if (!v) return 'TBD';
	return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(v);
};

export const CompetitionMode = ({ event, teamId, teamNumber }: Props) => {
	const [loadingMatch, setLoadingMatch] = useState(true);
	const [matchError, setMatchError] = useState<string | null>(null);
	const [nextMatch, setNextMatch] = useState<NextMatchInfo | null>(null);

	const [loadingRank, setLoadingRank] = useState(true);
	const [rankError, setRankError] = useState<string | null>(null);
	const [rankingRow, setRankingRow] = useState<TeamSummary | null>(null);

	const [loadingSkills, setLoadingSkills] = useState(true);
	const [skillsError, setSkillsError] = useState<string | null>(null);
	const [skillsRow, setSkillsRow] = useState<TeamSkills | null>(null);

	useEffect(() => {
		let cancelled = false;

		const getFirstDivId = async (): Promise<number | null> => {
			const eventData = await re.events.eventGetEvent({ id: event.id });
			const sorted = [...(eventData.divisions ?? [])].sort(
				(a, b) => (a.order ?? 0) - (b.order ?? 0)
			);
			return (sorted[0] as (typeof sorted)[0] & { id: number })?.id ?? null;
		};

		(async () => {
			try {
				const divId = await getFirstDivId();
				if (divId === null || cancelled) return;

				const matches = await re.depaginate(
					re.events.eventGetDivisionMatches({ id: event.id, div: divId }, re.custom.maxPages),
					re.models.PaginatedMatchFromJSON
				);
				if (cancelled) return;

				const getTime = (m: (typeof matches)[0]) =>
					m.scheduled?.getTime() ?? m.started?.getTime() ?? null;

				const unplayed = [...matches]
					.filter((m) => m.started == null)
					.sort((a, b) => {
						const lt = getTime(a),
							rt = getTime(b);
						if (lt !== null && rt !== null && lt !== rt) return lt - rt;
						if (lt !== null && rt === null) return -1;
						if (lt === null && rt !== null) return 1;
						if (a.round !== b.round) return a.round - b.round;
						if (a.instance !== b.instance) return a.instance - b.instance;
						return a.matchnum - b.matchnum;
					});

				const myIdx = unplayed.findIndex((m) =>
					m.alliances.some((a) => a.teams.some((t) => t.team?.id === teamId))
				);

				if (myIdx === -1) {
					if (!cancelled) {
						setNextMatch(null);
						setLoadingMatch(false);
					}
					return;
				}

				const match = unplayed[myIdx];
				const myAlliance = match.alliances.find((a) => a.teams.some((t) => t.team?.id === teamId));
				const opponentAlliance = match.alliances.find((a) => a.color !== myAlliance?.color);
				const alliance = (myAlliance?.color?.toLowerCase() ?? 'red') as 'red' | 'blue';

				const myTeams = (myAlliance?.teams ?? [])
					.filter((t) => !t.sitting)
					.map((t) => t.team?.name ?? t.team?.code ?? '');
				const partnerTeams = myTeams.filter(
					(t) => t.trim().toLowerCase() !== teamNumber.trim().toLowerCase()
				);
				const opponents = (opponentAlliance?.teams ?? [])
					.filter((t) => !t.sitting)
					.map((t) => t.team?.name ?? t.team?.code ?? '');

				const matchName = formatMatchName(match);

				if (!cancelled) {
					setNextMatch({
						name: matchName,
						field: match.field,
						time: formatTime(match.scheduled),
						matchesUntil: myIdx,
						alliance,
						myTeams,
						partnerTeams,
						opponents
					});
					setLoadingMatch(false);
				}
			} catch (e) {
				if (!cancelled) {
					setMatchError((e as Error).message || 'Failed to load match schedule.');
					setLoadingMatch(false);
				}
			}
		})();

		(async () => {
			try {
				const divId = await (async () => {
					const eventData = await re.events.eventGetEvent({ id: event.id });
					const sorted = [...(eventData.divisions ?? [])].sort(
						(a, b) => (a.order ?? 0) - (b.order ?? 0)
					);
					return (sorted[0] as (typeof sorted)[0] & { id: number })?.id ?? null;
				})();
				if (divId === null || cancelled) return;

				const [rankings, teams] = await Promise.all([
					re.depaginate(
						re.events.eventGetDivisionRankings({ id: event.id, div: divId }, re.custom.maxPages),
						re.models.PaginatedRankingFromJSON
					),
					re.depaginate(
						re.events.eventGetTeams({ id: event.id }, re.custom.maxPages),
						re.models.PaginatedTeamFromJSON
					)
				]);
				if (cancelled) return;

				const teamMap = new Map(teams.map((t) => [t.id, t.number]));
				const myRank = rankings.find((r) => r.team?.id === teamId);
				const row: TeamSummary | null = myRank
					? {
							rank: myRank.rank ?? 0,
							team: teamMap.get(myRank.team?.id ?? 0) ?? teamNumber,
							name: teams.find((t) => t.id === myRank.team?.id)?.teamName ?? '',
							wins: myRank.wins ?? 0,
							losses: myRank.losses ?? 0,
							ties: myRank.ties ?? 0,
							wp: myRank.wp ?? 0,
							ap: myRank.ap ?? 0,
							sp: myRank.sp ?? 0
						}
					: null;
				if (!cancelled) {
					setRankingRow(row);
					setLoadingRank(false);
				}
			} catch (e) {
				if (!cancelled) {
					setRankError((e as Error).message || 'Failed to load rankings.');
					setLoadingRank(false);
				}
			}
		})();

		(async () => {
			try {
				const skills = await re.depaginate(
					re.events.eventGetSkills({ id: event.id }, re.custom.maxPages),
					re.models.PaginatedSkillFromJSON
				);
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
							driverRuns: Math.max(cur.driverRuns, attempts)
						});
					} else if (skill.type === SkillType.Programming) {
						agg.set(id, {
							...cur,
							auton: Math.max(cur.auton, score),
							autonRuns: Math.max(cur.autonRuns, attempts)
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
									autonRuns: teamEntry.autonRuns
								}
							: null
					);
					setLoadingSkills(false);
				}
			} catch (e) {
				if (!cancelled) {
					setSkillsError((e as Error).message || 'Failed to load skills.');
					setLoadingSkills(false);
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [event.id, teamId, teamNumber]);

	const allianceColor = nextMatch?.alliance === 'red' ? colors.red : colors.blue;
	const allianceBg = nextMatch?.alliance === 'red' ? colors.red + '20' : colors.blue + '20';

	return (
		<View>
			<View style={styles.header}>
				<Text style={styles.eventName} numberOfLines={1}>
					{event.name}
				</Text>
				<TouchableOpacity
					style={styles.openBtn}
					onPress={() => router.push(`/events/${event.id}` as any)}
				>
					<Text style={styles.openBtnText}>Open</Text>
					<ArrowRight size={14} color={colors.primary} />
				</TouchableOpacity>
			</View>

			<View style={styles.sectionLabel}>
				<Text style={styles.sectionTitle}>Next Match</Text>
			</View>

			{loadingMatch ? (
				<View style={styles.loadingCard}>
					<ActivityIndicator color={colors.primary} />
				</View>
			) : matchError ? (
				<View style={styles.errorCard}>
					<Text style={styles.errorText}>{matchError}</Text>
				</View>
			) : nextMatch === null ? (
				<View style={styles.card}>
					<Text style={styles.noMatchText}>No upcoming matches found for your team.</Text>
				</View>
			) : (
				<View
					style={[
						styles.matchCard,
						{ backgroundColor: allianceBg, borderColor: allianceColor + '60' }
					]}
				>
					<View style={styles.matchTopRow}>
						<Text style={[styles.matchName, { color: allianceColor }]}>{nextMatch.name}</Text>
						<View style={styles.matchMeta}>
							{nextMatch.field ? (
								<View style={styles.badge}>
									<MapPin size={11} color={colors.mutedForeground} />
									<Text style={styles.badgeText}>{nextMatch.field}</Text>
								</View>
							) : null}
							{nextMatch.matchesUntil > 0 ? (
								<View style={styles.badge}>
									<Text style={styles.badgeText}>
										{nextMatch.matchesUntil} match{nextMatch.matchesUntil !== 1 ? 'es' : ''} away
									</Text>
								</View>
							) : (
								<View
									style={[
										styles.badge,
										{ backgroundColor: colors.primary + '30', borderColor: colors.primary + '60' }
									]}
								>
									<Text style={[styles.badgeText, { color: colors.primary }]}>Next up</Text>
								</View>
							)}
						</View>
					</View>

					<View style={styles.matchTimeRow}>
						<Clock size={13} color={colors.mutedForeground} />
						<Text style={styles.matchTime}>{nextMatch.time}</Text>
					</View>

					<View style={styles.allianceGrid}>
						<View style={styles.allianceSide}>
							<Text style={[styles.allianceLabel, { color: allianceColor }]}>
								{nextMatch.alliance === 'red' ? 'Red' : 'Blue'} Alliance
							</Text>
							{nextMatch.myTeams.map((t) => {
								const isMe = t.trim().toLowerCase() === teamNumber.trim().toLowerCase();
								return (
									<Text key={t} style={[styles.teamEntry, isMe && styles.teamEntryMe]}>
										{t}
									</Text>
								);
							})}
						</View>
						<View style={[styles.divider, { backgroundColor: colors.border }]} />
						<View style={styles.allianceSide}>
							<Text style={[styles.allianceLabel, { color: colors.mutedForeground }]}>
								{nextMatch.alliance === 'red' ? 'Blue' : 'Red'} Alliance
							</Text>
							{nextMatch.opponents.map((t) => (
								<Text key={t} style={styles.opponentEntry}>
									{t}
								</Text>
							))}
						</View>
					</View>
				</View>
			)}

			<View style={styles.sectionLabel}>
				<Text style={styles.sectionTitle}>Event Stats</Text>
			</View>

			{loadingRank ? (
				<View style={styles.loadingCard}>
					<ActivityIndicator color={colors.primary} />
				</View>
			) : rankError ? (
				<View style={styles.errorCard}>
					<Text style={styles.errorText}>{rankError}</Text>
				</View>
			) : rankingRow ? (
				<RankStatsCard team={rankingRow} />
			) : (
				<View style={styles.card}>
					<Text style={styles.noMatchText}>Rankings not yet available.</Text>
				</View>
			)}

			{loadingSkills ? (
				<View style={styles.loadingCard}>
					<ActivityIndicator color={colors.primary} />
				</View>
			) : skillsError ? (
				<View style={styles.errorCard}>
					<Text style={styles.errorText}>{skillsError}</Text>
				</View>
			) : (
				<SkillsStatsCard skills={skillsRow} />
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: spacing.sm
	},
	eventName: {
		flex: 1,
		fontSize: font.base,
		fontWeight: '600',
		color: colors.foreground,
		marginRight: spacing.sm
	},
	openBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: colors.card,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: colors.border,
		paddingHorizontal: 10,
		paddingVertical: 5
	},
	openBtnText: {
		fontSize: font.sm,
		color: colors.primary,
		fontWeight: '500'
	},
	sectionLabel: {
		marginBottom: spacing.sm
	},
	sectionTitle: {
		fontSize: font.sm,
		fontWeight: '600',
		color: colors.mutedForeground,
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	loadingCard: {
		borderRadius: radius.xl,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.xl,
		marginBottom: 12,
		backgroundColor: colors.card,
		alignItems: 'center'
	},
	errorCard: {
		borderRadius: radius.xl,
		borderWidth: 1,
		borderColor: colors.destructive + '40',
		padding: spacing.md,
		marginBottom: 12,
		backgroundColor: colors.destructive + '10'
	},
	errorText: { fontSize: font.sm, color: colors.destructive },
	card: {
		borderRadius: radius.xl,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.md,
		marginBottom: 12,
		backgroundColor: colors.card
	},
	noMatchText: { fontSize: font.sm, color: colors.mutedForeground, textAlign: 'center' },
	matchCard: {
		borderRadius: radius.xl,
		borderWidth: 1,
		padding: spacing.md,
		marginBottom: 12,
		gap: 10
	},
	matchTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	matchName: {
		fontSize: font['2xl'],
		fontWeight: '700'
	},
	matchMeta: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		flexWrap: 'wrap',
		justifyContent: 'flex-end'
	},
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3,
		backgroundColor: 'rgba(255,255,255,0.08)',
		borderRadius: radius.full,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.12)',
		paddingHorizontal: 8,
		paddingVertical: 3
	},
	badgeText: {
		fontSize: font.xs,
		color: colors.mutedForeground
	},
	matchTimeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5
	},
	matchTime: {
		fontSize: font.sm,
		color: colors.mutedForeground
	},
	allianceGrid: {
		flexDirection: 'row',
		gap: 12
	},
	allianceSide: {
		flex: 1,
		gap: 4
	},
	divider: {
		width: 1,
		alignSelf: 'stretch'
	},
	allianceLabel: {
		fontSize: font.xs,
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: 2
	},
	teamEntry: {
		fontSize: font.base,
		color: colors.foreground,
		fontWeight: '400'
	},
	teamEntryMe: {
		fontWeight: '700',
		textDecorationLine: 'underline'
	},
	opponentEntry: {
		fontSize: font.base,
		color: colors.mutedForeground
	}
});
