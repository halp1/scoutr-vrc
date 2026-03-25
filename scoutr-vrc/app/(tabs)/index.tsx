import { useState, useEffect } from 'react';
import {
	View,
	Text,
	ScrollView,
	TouchableOpacity,
	StyleSheet,
	ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowRight, Gamepad2, Trophy, Award, TrendingUp } from 'lucide-react-native';
import { colors, font, spacing, radius } from '../../lib/theme';
import { re } from '../../lib/robotevents';
import type { Event, Team } from '../../lib/robotevents/robotevents/models';
import { useStorage } from '../../lib/state/storage';
import { CONSTANTS } from '../../lib/const';
import { getVDAStatsByTeamNum } from '../../lib/data/vda';
import type { VDAStats } from '../../lib/data/vda';

type TeamStats = {
	team: Team;
	winRate: number;
	wins: number;
	losses: number;
	ties: number;
	skillsRank: number | null;
	skillsScore: number | null;
	vdaStats: VDAStats | null;
	awardsCount: number;
};

const formatEventDate = (event: Event): string => {
	if (!event.start && !event.end) return 'Date TBD';
	if (event.start && event.end) {
		if (event.start.toDateString() === event.end.toDateString())
			return event.start.toLocaleDateString();
		return `${event.start.toLocaleDateString()} - ${event.end.toLocaleDateString()}`;
	}
	return (event.start ?? event.end!).toLocaleDateString();
};

export default function HomeScreen() {
	const { team: teamNumber, program: programId } = useStorage();
	const [loadingEvents, setLoadingEvents] = useState(true);
	const [loadingStats, setLoadingStats] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [teamStats, setTeamStats] = useState<TeamStats | null>(null);
	const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);

	useEffect(() => {
		let cancelled = false;

		const load = async () => {
			if (!teamNumber) {
				setTeamStats(null);
				setUpcomingEvents([]);
				setLoadingEvents(false);
				setLoadingStats(false);
				return;
			}

			setLoadingEvents(true);
			setLoadingStats(true);
			setError(null);

			try {
				const programs = await re.depaginate(
					re.program.programGetPrograms({}, re.custom.maxPages),
					re.models.PaginatedProgramFromJSON
				);
				const prog =
					programs.find((p) => p.id === programId) ??
					programs.find((p) => p.abbr === 'V5RC') ??
					programs[0];

				if (!prog || cancelled) return;

				const seasons = await re.depaginate(
					re.season.seasonGetSeasons({ program: [prog.id!] }, re.custom.maxPages),
					re.models.PaginatedSeasonFromJSON
				);
				if (cancelled || seasons.length === 0) return;

				const season = seasons.reduce((a, b) => (a.end! > b.end! ? a : b));

				const candidates = await re.depaginate(
					re.team.teamGetTeams({ number: [teamNumber], program: [prog.id!] }),
					re.models.PaginatedTeamFromJSON
				);
				const targetTeam =
					candidates.find((t) => t.number.toLowerCase() === teamNumber.toLowerCase()) ??
					candidates[0] ??
					null;

				if (!targetTeam || cancelled) {
					setTeamStats(null);
					setUpcomingEvents([]);
					setLoadingEvents(false);
					setLoadingStats(false);
					return;
				}

				const loadEvents = async () => {
					try {
						const events = await re.depaginate(
							re.team.teamGetEvents({ id: targetTeam.id, season: [season.id!], start: new Date() }),
							re.models.PaginatedEventFromJSON
						);
						if (cancelled) return;
						const now = new Date();
						now.setHours(0, 0, 0, 0);
						const sorted = events
							.filter((e) => {
								const d = e.start ?? e.end;
								return d ? d >= now : false;
							})
							.sort(
								(a, b) =>
									((a.start ?? a.end)?.getTime() ?? Infinity) -
									((b.start ?? b.end)?.getTime() ?? Infinity)
							);
						setUpcomingEvents(sorted);
					} catch (e) {
						if (!cancelled) setError((e as Error).message);
					} finally {
						if (!cancelled) setLoadingEvents(false);
					}
				};

				const loadStats = async () => {
					try {
						const [details, matches, skills, awards] = await Promise.all([
							re.team.teamGetTeam({ id: targetTeam.id }),
							re.depaginate(
								re.team.teamGetMatches(
									{ id: targetTeam.id, season: [season.id!] },
									re.custom.maxPages
								),
								re.models.PaginatedMatchFromJSON
							),
							re.custom.cache
								.load('skills.leaderboard', season.id!)
								.then(
									(leaderboard) => leaderboard.find((e) => e.team.id === targetTeam.id) ?? null
								),
							re.depaginate(
								re.team.teamGetAwards(
									{ id: targetTeam.id, season: [season.id!] },
									re.custom.maxPages
								),
								re.models.PaginatedAwardFromJSON
							)
						]);
						if (cancelled) return;

						const matchTotals = matches.reduce(
							(acc, match) => {
								const alliance = match.alliances.find((a) =>
									a.teams.some((t) => t.team?.id === targetTeam.id)
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

						const total = matchTotals.wins + matchTotals.losses + matchTotals.ties;
						const winRate = total > 0 ? (matchTotals.wins / total) * 100 : 0;

						const vdaStats = await getVDAStatsByTeamNum(season.id!, season.id!, targetTeam.number);
						if (cancelled) return;

						setTeamStats({
							team: details,
							winRate,
							...matchTotals,
							skillsRank: skills?.rank ?? null,
							skillsScore: skills?.scores?.score ?? null,
							vdaStats,
							awardsCount: awards.length
						});
					} catch (e) {
						if (!cancelled) setError((e as Error).message);
					} finally {
						if (!cancelled) setLoadingStats(false);
					}
				};

				loadEvents();
				loadStats();
			} catch (e) {
				if (!cancelled) {
					setError((e as Error).message);
					setLoadingEvents(false);
					setLoadingStats(false);
				}
			}
		};

		load();
		return () => {
			cancelled = true;
		};
	}, [teamNumber, programId]);

	const featuredEvent = upcomingEvents[0] ?? null;
	const futureEvents = upcomingEvents.slice(1);

	return (
		<SafeAreaView style={styles.safe} edges={['top']}>
			<ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
				<Section label="Upcoming Competition">
					{loadingEvents ? (
						<Card>
							<ActivityIndicator color={colors.primary} />
						</Card>
					) : featuredEvent ? (
						<TouchableOpacity
							style={[styles.card, styles.cardPrimary]}
							onPress={() => router.push(`/events/${featuredEvent.id}`)}
						>
							<View style={styles.cardRow}>
								<Text style={styles.eventName} numberOfLines={2}>
									{featuredEvent.name}
								</Text>
								<ArrowRight size={18} color={colors.primary} />
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

				<Section label="Team Snapshot">
					{loadingStats ? (
						<Card>
							<ActivityIndicator color={colors.primary} />
						</Card>
					) : teamStats ? (
						<Card>
							<Text style={styles.teamNumber}>{teamStats.team.number}</Text>
							<Text style={styles.teamName}>
								{teamStats.team.teamName ?? teamStats.team.organization ?? 'Team profile'}
							</Text>
							<View style={styles.statsRow}>
								<View style={styles.statBox}>
									<View style={styles.statLabel}>
										<Trophy size={14} color={colors.mutedForeground} />
										<Text style={styles.statLabelText}>Win Rate</Text>
									</View>
									<Text style={styles.statValue}>{teamStats.winRate.toFixed(1)}%</Text>
									<Text style={styles.statSub}>
										{teamStats.wins}-{teamStats.losses}-{teamStats.ties}
									</Text>
								</View>
								<View style={styles.statBox}>
									<View style={styles.statLabel}>
										<Gamepad2 size={14} color={colors.mutedForeground} />
										<Text style={styles.statLabelText}>Skills</Text>
									</View>
									<Text style={styles.statValue}>
										{teamStats.skillsScore !== null ? teamStats.skillsScore : 'N/A'}
									</Text>
									<Text style={styles.statSub}>
										Rank {teamStats.skillsRank !== null ? `#${teamStats.skillsRank}` : 'N/A'}
									</Text>
								</View>
								<View style={styles.statBox}>
									<View style={styles.statLabel}>
										<TrendingUp size={14} color={colors.mutedForeground} />
										<Text style={styles.statLabelText}>TrueSkill</Text>
									</View>
									<Text style={styles.statValue}>
										{teamStats.vdaStats?.trueSkill != null
											? teamStats.vdaStats.trueSkill.toFixed(1)
											: 'N/A'}
									</Text>
									<Text style={styles.statSub} numberOfLines={1}>
										{teamStats.vdaStats?.opr != null
											? `${teamStats.vdaStats.opr.toFixed(1)} OPR / ${teamStats.vdaStats.dpr?.toFixed(1)} DPR / ${teamStats.vdaStats.ccwm?.toFixed(1)} CCWM`
											: 'OPR / DPR / CCWM'}
									</Text>
								</View>
								<View style={styles.statBox}>
									<View style={styles.statLabel}>
										<Award size={14} color={colors.mutedForeground} />
										<Text style={styles.statLabelText}>Awards</Text>
									</View>
									<Text style={styles.statValue}>{teamStats.awardsCount}</Text>
									<Text style={styles.statSub}>this season</Text>
								</View>
							</View>
						</Card>
					) : (
						<Card>
							<Text style={styles.empty}>
								Set a team during onboarding to see team stats and personalized upcoming events.
							</Text>
						</Card>
					)}
				</Section>

				{futureEvents.length > 0 && (
					<Section label="Future Events">
						{futureEvents.map((event) => (
							<TouchableOpacity
								key={event.id}
								style={[styles.card, { marginBottom: 8 }]}
								onPress={() => router.push(`/events/${event.id}`)}
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

				{error && (
					<View style={styles.errorBox}>
						<Text style={styles.errorText}>{error}</Text>
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
	<View style={styles.section}>
		<Text style={styles.sectionLabel}>{label}</Text>
		{children}
	</View>
);

const Card = ({ children }: { children: React.ReactNode }) => (
	<View style={styles.card}>{children}</View>
);

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: colors.background },
	scroll: { flex: 1 },
	content: { padding: spacing.md, paddingBottom: spacing['3xl'] },
	section: { marginBottom: spacing.xl },
	sectionLabel: {
		fontSize: font.sm,
		fontWeight: '500',
		color: colors.mutedForeground,
		letterSpacing: 0.5,
		marginBottom: 8,
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
	eventDate: { fontSize: font.md, color: colors.mutedForeground, marginTop: 2 },
	teamNumber: { fontSize: font['2xl'], fontWeight: '600', color: colors.foreground },
	teamName: { fontSize: font.sm, color: colors.mutedForeground, marginTop: 2, marginBottom: 12 },
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
	empty: { color: colors.mutedForeground },
	errorBox: {
		backgroundColor: colors.destructive + '20',
		borderRadius: radius.md,
		padding: spacing.md
	},
	errorText: { color: colors.destructive }
});
