import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight, Gamepad2, Trophy, Award, TrendingUp, Star } from 'lucide-react-native';
import { colors, font, spacing, radius } from '../theme';
import { re } from '../robotevents';
import type { Event, Team } from '../robotevents/robotevents/models';
import { getVDAStatsByTeamNum } from '../data/vda';
import type { VDAStats } from '../data/vda';
import { CompetitionMode } from './CompetitionMode';
import { useStorage } from '../state/storage';

type MatchStats = { winRate: number; wins: number; losses: number; ties: number };
type SkillsStats = { rank: number | null; score: number | null };

const formatEventDate = (event: Event): string => {
	if (!event.start && !event.end) return 'Date TBD';
	if (event.start && event.end) {
		if (event.start.toDateString() === event.end.toDateString())
			return event.start.toLocaleDateString();
		return `${event.start.toLocaleDateString()} - ${event.end.toLocaleDateString()}`;
	}
	return (event.start ?? event.end!).toLocaleDateString();
};

interface Props {
	teamId: number;
	isOwnTeam?: boolean;
	showFavorite?: boolean;
}

export const TeamProfileView = ({ teamId, isOwnTeam = false, showFavorite = false }: Props) => {
	const { addFavoriteTeam, removeFavoriteTeam, favorites } = useStorage();
	const isFav = favorites.teams.includes(teamId);
	const toggleFav = () => {
		if (isFav) removeFavoriteTeam(teamId);
		else addFavoriteTeam(teamId);
	};

	const [loadingTeam, setLoadingTeam] = useState(true);
	const [loadingEvents, setLoadingEvents] = useState(true);
	const [loadingMatches, setLoadingMatches] = useState(false);
	const [loadingSkills, setLoadingSkills] = useState(false);
	const [loadingVda, setLoadingVda] = useState(false);
	const [loadingAwards, setLoadingAwards] = useState(false);

	const [team, setTeam] = useState<Team | null>(null);
	const [matchStats, setMatchStats] = useState<MatchStats | null>(null);
	const [skillsStats, setSkillsStats] = useState<SkillsStats | null>(null);
	const [vdaStats, setVdaStats] = useState<VDAStats | null>(null);
	const [awardsCount, setAwardsCount] = useState<number | null>(null);
	const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
	const [pastEvents, setPastEvents] = useState<Event[]>([]);
	const [activeCompetition, setActiveCompetition] = useState<Event | null>(null);

	useEffect(() => {
		let cancelled = false;
		setLoadingTeam(true);
		setLoadingEvents(true);
		setMatchStats(null);
		setSkillsStats(null);
		setVdaStats(null);
		setAwardsCount(null);
		setActiveCompetition(null);
		setUpcomingEvents([]);
		setPastEvents([]);

		(async () => {
			try {
				const targetTeam = await re.team.teamGetTeam({ id: teamId });
				if (!targetTeam || cancelled) return;

				setTeam(targetTeam);
				setLoadingTeam(false);
				setLoadingMatches(true);
				setLoadingSkills(true);
				setLoadingVda(true);
				setLoadingAwards(true);

				const seasons = await re.depaginate(
					re.season.seasonGetSeasons({ program: [targetTeam.program.id!] }, re.custom.maxPages),
					re.models.PaginatedSeasonFromJSON
				);
				if (cancelled || seasons.length === 0) return;

				const season = seasons.reduce((a, b) => (a.end! > b.end! ? a : b));

				(async () => {
					try {
						const events = await re.depaginate(
							re.team.teamGetEvents({ id: teamId, season: [season.id!] }),
							re.models.PaginatedEventFromJSON
						);
						if (cancelled) return;
						const now = new Date();
						now.setHours(0, 0, 0, 0);
						const active =
							events.find((e) => {
								const start = e.start;
								const end = e.end ?? e.start;
								return start != null && end != null && start <= now && end >= now;
							}) ?? null;
						const sorted = events
							.filter((e) => {
								const d = e.start ?? e.end;
								return d ? d > now : false;
							})
							.sort(
								(a, b) =>
									((a.start ?? a.end)?.getTime() ?? Infinity) -
									((b.start ?? b.end)?.getTime() ?? Infinity)
							);
						const past = events
							.filter((e) => {
								const end = e.end ?? e.start;
								return end ? end < now : false;
							})
							.sort(
								(a, b) =>
									((b.end ?? b.start)?.getTime() ?? 0) - ((a.end ?? a.start)?.getTime() ?? 0)
							);
						if (!cancelled) {
							setActiveCompetition(active);
							setUpcomingEvents(sorted);
							setPastEvents(past);
						}
					} finally {
						if (!cancelled) setLoadingEvents(false);
					}
				})();

				(async () => {
					try {
						const matches = await re.depaginate(
							re.team.teamGetMatches({ id: teamId, season: [season.id!] }, re.custom.maxPages),
							re.models.PaginatedMatchFromJSON
						);
						if (cancelled) return;
						const totals = matches.reduce(
							(acc, match) => {
								const alliance = match.alliances.find((a) =>
									a.teams.some((t) => t.team?.id === teamId)
								);
								const opposite = match.alliances.find((a) => a.color !== alliance?.color);
								if (!alliance || !opposite) return acc;
								if (alliance.score > opposite.score) acc.wins += 1;
								else if (alliance.score < opposite.score) acc.losses += 1;
								else acc.ties += 1;
								return acc;
							},
							{ wins: 0, losses: 0, ties: 0 }
						);
						const total = totals.wins + totals.losses + totals.ties;
						if (!cancelled)
							setMatchStats({ ...totals, winRate: total > 0 ? (totals.wins / total) * 100 : 0 });
					} finally {
						if (!cancelled) setLoadingMatches(false);
					}
				})();

				(async () => {
					try {
						const leaderboard = await re.custom.cache.load('skills.leaderboard', season.id!);
						if (cancelled) return;
						const entry = leaderboard.find((e) => e.team.id === teamId) ?? null;
						if (!cancelled)
							setSkillsStats({ rank: entry?.rank ?? null, score: entry?.scores?.score ?? null });
					} finally {
						if (!cancelled) setLoadingSkills(false);
					}
				})();

				(async () => {
					try {
						const vda = await getVDAStatsByTeamNum(season.id!, season.id!, targetTeam.number);
						if (!cancelled) setVdaStats(vda);
					} finally {
						if (!cancelled) setLoadingVda(false);
					}
				})();

				(async () => {
					try {
						const awards = await re.depaginate(
							re.team.teamGetAwards({ id: teamId, season: [season.id!] }, re.custom.maxPages),
							re.models.PaginatedAwardFromJSON
						);
						if (!cancelled) setAwardsCount(awards.length);
					} finally {
						if (!cancelled) setLoadingAwards(false);
					}
				})();
			} catch {
				if (!cancelled) {
					setLoadingTeam(false);
					setLoadingEvents(false);
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [teamId]);

	const featuredEvent = upcomingEvents[0] ?? null;
	const futureEvents = upcomingEvents.slice(1);

	const competitionSectionLabel =
		activeCompetition && team
			? isOwnTeam
				? 'Competition Mode'
				: 'Current Event'
			: 'Upcoming Competition';

	return (
		<View>
			<Section label="Team Snapshot">
				{loadingTeam ? (
					<Card>
						<ActivityIndicator color={colors.primary} />
					</Card>
				) : team ? (
					<Card>
						<View style={styles.cardHeaderRow}>
							<View style={{ flex: 1 }}>
								<Text style={styles.teamNumber}>{team.number}</Text>
								<Text style={styles.teamName}>
									{team.teamName ?? team.organization ?? 'Team profile'}
								</Text>
							</View>
							{showFavorite && (
								<TouchableOpacity onPress={toggleFav} hitSlop={8} style={{ paddingRight: 4 }}>
									<Star
										size={20}
										color={colors.foreground}
										fill={isFav ? colors.foreground : 'transparent'}
									/>
								</TouchableOpacity>
							)}
						</View>
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
											{matchStats ? `${matchStats.winRate.toFixed(1)}%` : 'N/A'}
										</Text>
										<Text style={styles.statSub}>
											{matchStats
												? `${matchStats.wins}-${matchStats.losses}-${matchStats.ties}`
												: '—'}
										</Text>
									</>
								)}
							</View>
							<View style={styles.statBox}>
								<View style={styles.statLabel}>
									<Gamepad2 size={14} color={colors.mutedForeground} />
									<Text style={styles.statLabelText}>Skills</Text>
								</View>
								{loadingSkills ? (
									<ActivityIndicator
										size="small"
										color={colors.primary}
										style={styles.statLoader}
									/>
								) : (
									<>
										<Text style={styles.statValue}>{skillsStats?.score ?? 'N/A'}</Text>
										<Text style={styles.statSub}>
											Rank {skillsStats?.rank != null ? `#${skillsStats.rank}` : 'N/A'}
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
											{vdaStats?.trueSkill != null ? vdaStats.trueSkill.toFixed(1) : 'N/A'}
										</Text>
										<Text style={styles.statSub} numberOfLines={1}>
											{vdaStats?.opr != null
												? `${vdaStats.opr.toFixed(1)} OPR / ${vdaStats.dpr?.toFixed(1)} DPR / ${vdaStats.ccwm?.toFixed(1)} CCWM`
												: 'OPR / DPR / CCWM'}
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
										<Text style={styles.statValue}>{awardsCount ?? 'N/A'}</Text>
										<Text style={styles.statSub}>this season</Text>
									</>
								)}
							</View>
						</View>
					</Card>
				) : (
					<Card>
						<Text style={styles.empty}>Team not found.</Text>
					</Card>
				)}
			</Section>

			<Section label={competitionSectionLabel}>
				{loadingEvents ? (
					<Card>
						<ActivityIndicator color={colors.primary} />
					</Card>
				) : activeCompetition && team ? (
					<CompetitionMode event={activeCompetition} teamId={team.id} teamNumber={team.number} />
				) : featuredEvent ? (
					<TouchableOpacity
						style={styles.card}
						onPress={() => router.push(`/events/${featuredEvent.id}` as any)}
					>
						<View style={styles.cardRow}>
							<Text style={styles.eventName} numberOfLines={2}>
								{featuredEvent.name}
							</Text>
							<ArrowRight size={18} color={colors.mutedForeground} />
						</View>
						<Text style={styles.eventLocation}>
							{featuredEvent.location?.city}, {featuredEvent.location?.region}
						</Text>
						<Text style={styles.eventDate}>{formatEventDate(featuredEvent)}</Text>
					</TouchableOpacity>
				) : (
					<Card>
						<Text style={styles.empty}>No upcoming competitions found.</Text>
					</Card>
				)}
			</Section>

			{futureEvents.length > 0 && (
				<Section label="Future Events">
					{futureEvents.map((event) => (
						<TouchableOpacity
							key={event.id}
							style={[styles.card, { marginBottom: 8 }]}
							onPress={() => router.push(`/events/${event.id}` as any)}
						>
							<View style={styles.cardRow}>
								<View style={{ flex: 1 }}>
									<Text style={styles.eventNameSm} numberOfLines={2}>
										{event.name}
									</Text>
									<Text style={styles.eventDate}>{formatEventDate(event)}</Text>
								</View>
								<ArrowRight size={16} color={colors.mutedForeground} />
							</View>
						</TouchableOpacity>
					))}
				</Section>
			)}

			{pastEvents.length > 0 && (
				<Section label="Past Competitions">
					{pastEvents.map((event) => (
						<TouchableOpacity
							key={event.id}
							style={[styles.card, { marginBottom: 8 }]}
							onPress={() => router.push(`/events/${event.id}` as any)}
						>
							<View style={styles.cardRow}>
								<View style={{ flex: 1 }}>
									<Text style={styles.eventNameSm} numberOfLines={2}>
										{event.name}
									</Text>
									<Text style={styles.eventDate}>{formatEventDate(event)}</Text>
								</View>
								<ArrowRight size={16} color={colors.mutedForeground} />
							</View>
						</TouchableOpacity>
					))}
				</Section>
			)}
		</View>
	);
};

const Section = ({
	label,
	children,
	headerRight
}: {
	label: string;
	children: React.ReactNode;
	headerRight?: React.ReactNode;
}) => (
	<View style={styles.section}>
		<View style={styles.sectionHeader}>
			<Text style={styles.sectionLabel}>{label}</Text>
			{headerRight}
		</View>
		{children}
	</View>
);

const Card = ({ children }: { children: React.ReactNode }) => (
	<View style={styles.card}>{children}</View>
);

const styles = StyleSheet.create({
	section: { marginBottom: spacing.xl },
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 8
	},
	sectionLabel: {
		fontSize: font.sm,
		fontWeight: '500',
		color: colors.mutedForeground,
		letterSpacing: 0.5,
		textTransform: 'uppercase'
	},
	card: {
		backgroundColor: colors.card,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.md
	},
	cardPrimary: { borderColor: colors.primary },
	cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
	cardHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
	eventName: {
		flex: 1,
		fontSize: font.xl,
		fontWeight: '600',
		color: colors.foreground,
		lineHeight: 28
	},
	eventNameSm: {
		fontSize: font.base,
		fontWeight: '500',
		color: colors.foreground,
		marginBottom: 2
	},
	eventLocation: { fontSize: font.md, color: colors.foreground, marginTop: 4 },
	eventDate: { fontSize: font.sm, color: colors.mutedForeground, marginTop: 2 },
	teamNumber: { fontSize: font['2xl'], fontWeight: '600', color: colors.foreground },
	teamName: { fontSize: font.sm, color: colors.mutedForeground, marginTop: 2 },
	statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
	statBox: {
		width: '47.5%',
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: colors.border,
		padding: spacing.md
	},
	statLabel: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
	statLabelText: { fontSize: font.sm, color: colors.mutedForeground },
	statValue: { fontSize: font.xl, fontWeight: '600', color: colors.foreground },
	statSub: { fontSize: font.sm, color: colors.mutedForeground, marginTop: 2 },
	statLoader: { marginTop: 4, alignSelf: 'flex-start' },
	empty: { color: colors.mutedForeground }
});
