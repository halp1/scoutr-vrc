import { useState, useEffect, useRef, useCallback } from 'react';
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	StyleSheet,
	ActivityIndicator,
	Dimensions,
	NativeScrollEvent,
	NativeSyntheticEvent
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Clock3, Gamepad2, Info, ListOrdered, Users } from 'lucide-react-native';
import { colors, font, spacing, radius } from '../../lib/theme';
import { re, calculateOprDprCcwm, robotEventsMatchesToScoredMatches } from '../../lib/robotevents';
import type {
	MatchObj,
	Ranking,
	Skill,
	Award,
	Team,
	Division
} from '../../lib/robotevents/robotevents/models';
import { SkillType } from '../../lib/robotevents/robotevents/models';
import { ScheduleTab } from '../../lib/components/events/ScheduleTab';
import { RankingsTab } from '../../lib/components/events/RankingsTab';
import { SkillsTab } from '../../lib/components/events/SkillsTab';
import { InfoTab } from '../../lib/components/events/InfoTab';
import { TeamDrawer } from '../../lib/components/events/TeamDrawer';
import { MatchDrawer } from '../../lib/components/events/MatchDrawer';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ScheduleRow = {
	group: 'practice' | 'qualifier' | 'elimination';
	match: string;
	time: string;
	score: string;
	red: string[];
	blue: string[];
	field?: string;
	played: boolean;
};

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

type EventInfo = {
	name: string;
	locationLine1: string;
	locationLine2: string;
	date: string;
};

type TeamLookup = { number: string; name: string };

const tabs = ['schedule', 'rankings', 'skills', 'info'] as const;
type EventTab = (typeof tabs)[number];

const tabMeta: { key: EventTab; icon: typeof Clock3 }[] = [
	{ key: 'schedule', icon: Clock3 },
	{ key: 'rankings', icon: ListOrdered },
	{ key: 'skills', icon: Gamepad2 },
	{ key: 'info', icon: Info }
];

const fallbackInfo: EventInfo = {
	name: 'Event',
	locationLine1: 'Location TBD',
	locationLine2: '',
	date: 'Date TBD'
};

const formatDate = (v: Date) =>
	new Intl.DateTimeFormat('en-US', {
		weekday: 'short',
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	}).format(v);

const formatDateRange = (start?: Date, end?: Date) => {
	if (!start && !end) return 'Date TBD';
	if (start && end) {
		if (start.toDateString() === end.toDateString()) return formatDate(start);
		return `${formatDate(start)} \u2013 ${formatDate(end)}`;
	}
	return formatDate(start ?? end!);
};

const formatTime = (v?: Date) => {
	if (!v) return 'TBD';
	return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(v);
};

const buildInfoData = (
	event: Awaited<ReturnType<typeof re.events.eventGetEvent>>,
	division: string
): EventInfo => {
	const loc = event.location;
	const line1 = [loc?.venue, loc?.address1, loc?.address2]
		.filter((v) => Boolean(v?.trim()))
		.join(', ');
	const line2 = [loc?.city, loc?.region, loc?.country].filter((v) => Boolean(v?.trim())).join(', ');
	return {
		name: event.name,
		locationLine1: line1 || 'Location TBD',
		locationLine2: line2,
		date: formatDateRange(event.start, event.end)
	};
};

const buildTeamLookup = (teams: Team[]) =>
	new Map<number, TeamLookup>(
		teams.map((t) => [t.id, { number: t.number, name: (t.teamName ?? '').trim() }])
	);

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

const getMatchGroup = (match: MatchObj): 'practice' | 'qualifier' | 'elimination' => {
	if (match.round === 1) return 'practice';
	if (match.round === 2) return 'qualifier';
	if (match.round >= 3) return 'elimination';
	const n = (match.name ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
	if (n.startsWith('practice')) return 'practice';
	if (n.startsWith('qualifier') || n.startsWith('qualification')) return 'qualifier';
	return 'elimination';
};

const mapMatches = (matches: MatchObj[]): ScheduleRow[] => {
	const getTime = (m: MatchObj) => m.scheduled?.getTime() ?? m.started?.getTime() ?? null;
	return [...matches]
		.sort((a, b) => {
			const lt = getTime(a),
				rt = getTime(b);
			if (lt !== null && rt !== null && lt !== rt) return lt - rt;
			if (lt !== null && rt === null) return -1;
			if (lt === null && rt !== null) return 1;
			if (a.round !== b.round) return a.round - b.round;
			if (a.instance !== b.instance) return a.instance - b.instance;
			return a.matchnum - b.matchnum;
		})
		.map((match) => {
			const red = match.alliances.find((a) => a.color?.toLowerCase() === 'red');
			const blue = match.alliances.find((a) => a.color?.toLowerCase() === 'blue');
			return {
				group: getMatchGroup(match),
				match: formatMatchName(match),
				time: formatTime(match.scheduled ?? match.started),
				score: `${red?.score ?? 0} - ${blue?.score ?? 0}`,
				red: (red?.teams ?? []).map((t) => t.team?.name ?? t.team?.code ?? '---'),
				blue: (blue?.teams ?? []).map((t) => t.team?.name ?? t.team?.code ?? '---'),
				field: match.field,
				played: match.started != null
			};
		});
};

const mapRankings = (rankings: Ranking[], teams: Map<number, TeamLookup>): RankingRow[] =>
	[...rankings]
		.sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER))
		.map((r) => {
			const team = r.team?.id ? teams.get(r.team.id) : undefined;
			return {
				rank: r.rank ?? 0,
				team: team?.number ?? r.team?.name ?? r.team?.code ?? '---',
				name: team?.name ?? r.team?.code ?? '',
				wins: r.wins ?? 0,
				losses: r.losses ?? 0,
				ties: r.ties ?? 0,
				wp: r.wp ?? 0,
				ap: r.ap ?? 0,
				sp: r.sp ?? 0
			};
		});

const mapSkills = (skills: Skill[], teams: Map<number, TeamLookup>): SkillsRow[] => {
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
	return [...agg.entries()]
		.map(([id, a]) => {
			const team = teams.get(id);
			const points = a.driver + a.auton;
			return { team: team?.number ?? `${id}`, name: team?.name ?? '', points, ...a };
		})
		.sort((a, b) => b.points - a.points || b.driver - a.driver || b.auton - a.auton)
		.map((row, i) => ({ ...row, rank: i + 1 }));
};

export default function EventScreen() {
	const { id: idParam } = useLocalSearchParams<{ id: string }>();
	const eventId = parseInt(idParam ?? '', 10);

	const [loadingEvent, setLoadingEvent] = useState(false);
	const [loadingDivision, setLoadingDivision] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);

	const [eventMeta, setEventMeta] = useState<Awaited<
		ReturnType<typeof re.events.eventGetEvent>
	> | null>(null);
	const [eventSku, setEventSku] = useState<string>('');
	const [divisions, setDivisions] = useState<(Division & { id: number })[]>([]);
	const [selectedDivisionId, setSelectedDivisionId] = useState<number | null>(null);
	const [teamLookup, setTeamLookup] = useState<Map<number, TeamLookup>>(new Map());
	const [allSkills, setAllSkills] = useState<Skill[]>([]);
	const [awards, setAwards] = useState<Award[]>([]);
	const [scheduleRows, setScheduleRows] = useState<ScheduleRow[]>([]);
	const [rankingRows, setRankingRows] = useState<RankingRow[]>([]);
	const [skillsRows, setSkillsRows] = useState<SkillsRow[]>([]);
	const [divisionMatches, setDivisionMatches] = useState<MatchObj[]>([]);
	const [infoData, setInfoData] = useState<EventInfo>(fallbackInfo);
	const [divisionSelectorOpen, setDivisionSelectorOpen] = useState(false);

	const [activeIndex, setActiveIndex] = useState(0);
	const tabScrollRef = useRef<ScrollView>(null);

	const [teamDrawerOpen, setTeamDrawerOpen] = useState(false);
	const [selectedTeam, setSelectedTeam] = useState<RankingRow | null>(null);
	const [matchDrawerOpen, setMatchDrawerOpen] = useState(false);
	const [selectedMatch, setSelectedMatch] = useState<ScheduleRow | null>(null);

	const divisionRatings = (() => {
		const quals = divisionMatches.filter((m) => m.round === 2);
		if (quals.length === 0) return null;
		return calculateOprDprCcwm(robotEventsMatchesToScoredMatches(quals, { includeUnscored: true }));
	})();

	const teamNumberToId = new Map<string, number>(
		[...teamLookup.entries()].map(([id, info]) => [info.number.toLowerCase(), id])
	);

	const normalize = (v: string) => v.trim().toLowerCase();

	const selectedTeamKey = selectedTeam ? normalize(selectedTeam.team) : null;
	const selectedTeamId = selectedTeamKey ? teamNumberToId.get(selectedTeamKey) : undefined;

	const selectedTeamRatings =
		divisionRatings && selectedTeamId !== undefined
			? {
					opr: divisionRatings.opr[selectedTeamId] ?? null,
					dpr: divisionRatings.dpr[selectedTeamId] ?? null,
					ccwm: divisionRatings.ccwm[selectedTeamId] ?? null
				}
			: { opr: null, dpr: null, ccwm: null };

	const selectedTeamSkills = selectedTeamKey
		? (skillsRows.find((r) => normalize(r.team) === selectedTeamKey) ?? null)
		: null;

	const selectedTeamMatches = selectedTeamKey
		? scheduleRows.filter(
				(r) =>
					r.red.some((t) => normalize(t) === selectedTeamKey) ||
					r.blue.some((t) => normalize(t) === selectedTeamKey)
			)
		: [];

	useEffect(() => {
		if (!Number.isFinite(eventId) || eventId <= 0) {
			setLoadError('Invalid event id.');
			return;
		}

		let cancelled = false;
		setLoadingEvent(true);
		setLoadError(null);

		(async () => {
			try {
				const [event, teams, skills, eventAwards] = await Promise.all([
					re.events.eventGetEvent({ id: eventId }),
					re.depaginate(
						re.events.eventGetTeams({ id: eventId }, re.custom.maxPages),
						re.models.PaginatedTeamFromJSON
					),
					re.depaginate(
						re.events.eventGetSkills({ id: eventId }, re.custom.maxPages),
						re.models.PaginatedSkillFromJSON
					),
					re
						.depaginate(
							re.events.eventGetAwards({ id: eventId }, re.custom.maxPages),
							re.models.PaginatedAwardFromJSON
						)
						.catch(() => [] as Award[])
				]);

				if (cancelled) return;

				const sortedDivs = [...(event.divisions ?? [])].sort(
					(a, b) => (a.order ?? 0) - (b.order ?? 0)
				) as (Division & { id: number })[];

				setEventMeta(event);
				setEventSku((event as any).sku ?? '');
				setDivisions(sortedDivs);
				setTeamLookup(buildTeamLookup(teams));
				setAllSkills(skills);
				setAwards(eventAwards);
				setInfoData(buildInfoData(event, sortedDivs[0]?.name ?? 'Division'));

				const firstDiv = sortedDivs[0];
				if (firstDiv) setSelectedDivisionId(firstDiv.id);
			} catch (e) {
				if (!cancelled) setLoadError((e as Error).message || 'Unable to load event data.');
			} finally {
				if (!cancelled) setLoadingEvent(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [eventId]);

	useEffect(() => {
		if (!eventMeta || selectedDivisionId === null) return;

		const divName = divisions.find((d) => d.id === selectedDivisionId)?.name ?? 'Division';
		setInfoData(buildInfoData(eventMeta, divName));

		const filtered = allSkills.filter((s) => s.division?.id === selectedDivisionId);
		setSkillsRows(mapSkills(filtered.length > 0 ? filtered : allSkills, teamLookup));

		let cancelled = false;
		setLoadingDivision(true);

		(async () => {
			try {
				const [rankings, matches] = await Promise.all([
					re.depaginate(
						re.events.eventGetDivisionRankings(
							{ id: eventId, div: selectedDivisionId },
							re.custom.maxPages
						),
						re.models.PaginatedRankingFromJSON
					),
					re.depaginate(
						re.events.eventGetDivisionMatches(
							{ id: eventId, div: selectedDivisionId },
							re.custom.maxPages
						),
						re.models.PaginatedMatchFromJSON
					)
				]);

				if (cancelled) return;
				setRankingRows(mapRankings(rankings, teamLookup));
				setScheduleRows(mapMatches(matches));
				setDivisionMatches(matches);
			} catch (e) {
				if (!cancelled) setLoadError((e as Error).message || 'Unable to load division data.');
			} finally {
				if (!cancelled) setLoadingDivision(false);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [eventId, selectedDivisionId, eventMeta]);

	const goToTab = (index: number) => {
		setActiveIndex(index);
		tabScrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
	};

	const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
		const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
		setActiveIndex(index);
	};

	const openTeamDrawer = (row: RankingRow) => {
		setSelectedTeam(row);
		setTeamDrawerOpen(true);
	};

	const openMatchDrawer = (row: ScheduleRow) => {
		setSelectedMatch(row);
		setMatchDrawerOpen(true);
	};

	const isLoading = loadingEvent || loadingDivision;

	const selectedDivisionName =
		divisions.find((d) => d.id === selectedDivisionId)?.name ?? 'Division';

	const teamEntries = [...teamLookup.entries()].map(([id, t]) => ({
		id,
		number: t.number,
		name: t.name
	}));

	return (
		<SafeAreaView style={styles.safe} edges={['top']}>
			<View style={styles.topBar}>
				<TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
					<ArrowLeft size={24} color={colors.foreground} />
				</TouchableOpacity>
				<TouchableOpacity
					style={styles.divisionSelector}
					onPress={() => divisions.length > 1 && setDivisionSelectorOpen(true)}
				>
					<Users size={16} color={colors.mutedForeground} />
					<Text style={styles.divisionText}>{selectedDivisionName}</Text>
				</TouchableOpacity>
			</View>

			{isLoading && (
				<View style={styles.loadingBar}>
					<ActivityIndicator size="small" color={colors.primary} />
				</View>
			)}

			{loadError && (
				<View style={styles.errorBox}>
					<Text style={styles.errorText}>{loadError}</Text>
				</View>
			)}

			<View style={styles.tabBar}>
				{tabMeta.map((tab, i) => {
					const Icon = tab.icon;
					const active = activeIndex === i;
					return (
						<TouchableOpacity
							key={tab.key}
							style={[styles.tabBtn, active && styles.tabBtnActive]}
							onPress={() => goToTab(i)}
						>
							<Icon
								size={22}
								color={active ? colors.primary : colors.mutedForeground}
								strokeWidth={2.25}
							/>
						</TouchableOpacity>
					);
				})}
			</View>

			<ScrollView
				ref={tabScrollRef}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				scrollEventThrottle={16}
				onMomentumScrollEnd={onScrollEnd}
				style={styles.tabPages}
				decelerationRate="fast"
			>
				<ScrollView style={styles.tabPage} contentContainerStyle={styles.tabContent}>
					<ScheduleTab rows={scheduleRows} onMatchSelect={openMatchDrawer} />
				</ScrollView>
				<ScrollView style={styles.tabPage} contentContainerStyle={styles.tabContent}>
					<RankingsTab rows={rankingRows} onTeamSelect={openTeamDrawer} />
				</ScrollView>
				<ScrollView style={styles.tabPage} contentContainerStyle={styles.tabContent}>
					<SkillsTab rows={skillsRows} />
				</ScrollView>
				<ScrollView style={styles.tabPage} contentContainerStyle={styles.tabContent}>
					<InfoTab
						info={infoData}
						teams={teamEntries}
						awards={awards}
						rankingRows={rankingRows}
						hasSchedule={scheduleRows.length > 0}
						season={eventMeta?.season?.id ?? 0}
						onTeamSelect={openTeamDrawer}
						sku={eventSku}
					/>
				</ScrollView>
			</ScrollView>

			{divisions.length > 1 && divisionSelectorOpen && (
				<View style={styles.divDropdown}>
					{divisions.map((div) => (
						<TouchableOpacity
							key={div.id}
							style={[styles.divOption, div.id === selectedDivisionId && styles.divOptionActive]}
							onPress={() => {
								setSelectedDivisionId(div.id);
								setDivisionSelectorOpen(false);
							}}
						>
							<Text
								style={[
									styles.divOptionText,
									div.id === selectedDivisionId && styles.divOptionTextActive
								]}
							>
								{div.name}
							</Text>
						</TouchableOpacity>
					))}
				</View>
			)}

			<TeamDrawer
				open={teamDrawerOpen}
				onClose={() => setTeamDrawerOpen(false)}
				team={selectedTeam}
				skills={selectedTeamSkills}
				matches={selectedTeamMatches}
				opr={selectedTeamRatings.opr}
				dpr={selectedTeamRatings.dpr}
				ccwm={selectedTeamRatings.ccwm}
			/>
			<MatchDrawer
				open={matchDrawerOpen}
				onClose={() => setMatchDrawerOpen(false)}
				row={selectedMatch}
				rankingRows={rankingRows}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	safe: { flex: 1, backgroundColor: colors.background },
	topBar: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: spacing.md,
		paddingVertical: 8
	},
	backBtn: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: 'center',
		justifyContent: 'center'
	},
	divisionSelector: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		backgroundColor: colors.card,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: colors.border,
		paddingHorizontal: 12,
		paddingVertical: 7
	},
	divisionText: { fontSize: font.sm, color: colors.foreground },
	loadingBar: {
		paddingVertical: 4,
		paddingHorizontal: spacing.md,
		alignItems: 'flex-start'
	},
	errorBox: {
		marginHorizontal: spacing.md,
		marginBottom: 8,
		backgroundColor: colors.destructive + '20',
		borderRadius: radius.md,
		padding: spacing.md
	},
	errorText: { color: colors.destructive, fontSize: font.sm },
	tabBar: {
		flexDirection: 'row',
		backgroundColor: colors.card,
		borderTopWidth: 1,
		borderTopColor: colors.border,
		marginHorizontal: spacing.md,
		borderRadius: radius.xl,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: 'hidden'
	},
	tabBtn: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center' },
	tabBtnActive: { backgroundColor: colors.primary + '25' },
	tabPages: { flex: 1, marginTop: 8 },
	tabPage: { width: SCREEN_WIDTH },
	tabContent: {
		paddingHorizontal: spacing.md,
		paddingTop: spacing.md,
		paddingBottom: spacing['3xl']
	},
	divDropdown: {
		position: 'absolute',
		top: 60,
		right: spacing.md,
		backgroundColor: colors.card,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: colors.border,
		overflow: 'hidden',
		zIndex: 100,
		minWidth: 160
	},
	divOption: { paddingHorizontal: 16, paddingVertical: 12 },
	divOptionActive: { backgroundColor: colors.primary + '20' },
	divOptionText: { fontSize: font.base, color: colors.foreground },
	divOptionTextActive: { color: colors.primary, fontWeight: '500' }
});
