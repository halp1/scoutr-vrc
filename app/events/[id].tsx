import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
	Animated,
	View,
	Text,
	TouchableOpacity,
	Pressable,
	ScrollView,
	Modal,
	TextInput,
	StyleSheet,
	ActivityIndicator,
	RefreshControl,
	Dimensions,
	NativeScrollEvent,
	NativeSyntheticEvent
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
	ArrowLeft,
	Clock3,
	Gamepad2,
	Info,
	ListOrdered,
	Search,
	User,
	Users
} from 'lucide-react-native';
import { colors, eventFont as font, spacing, radius } from '../../lib/theme';
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
import { MyTeamTab } from '../../lib/components/events/MyTeamTab';
import { TeamDrawer } from '../../lib/components/events/TeamDrawer';
import { MatchDrawer } from '../../lib/components/events/MatchDrawer';
import { useStorage } from '../../lib/state/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_WIDTH = (SCREEN_WIDTH - spacing.md * 2) / 5;

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

const tabs = ['myteam', 'schedule', 'rankings', 'skills', 'info'] as const;
type EventTab = (typeof tabs)[number];

const tabMeta: { key: EventTab; icon: typeof Clock3 }[] = [
	{ key: 'myteam', icon: User },
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
	const [loadingTeams, setLoadingTeams] = useState(false);
	const [loadingRankings, setLoadingRankings] = useState(false);
	const [loadingMatches, setLoadingMatches] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);
	const [refreshKey, setRefreshKey] = useState(0);
	const [refreshing, setRefreshing] = useState(false);

	const [eventMeta, setEventMeta] = useState<Awaited<
		ReturnType<typeof re.events.eventGetEvent>
	> | null>(null);
	const [eventSku, setEventSku] = useState<string>('');
	const [divisions, setDivisions] = useState<(Division & { id: number })[]>([]);
	const [selectedDivisionId, setSelectedDivisionId] = useState<number | null>(null);
	const [teamLookup, setTeamLookup] = useState<Map<number, TeamLookup>>(new Map());
	const [allSkills, setAllSkills] = useState<Skill[]>([]);
	const [awards, setAwards] = useState<Award[]>([]);
	const [rawRankings, setRawRankings] = useState<Ranking[]>([]);
	const [rawMatches, setRawMatches] = useState<MatchObj[]>([]);
	const [infoData, setInfoData] = useState<EventInfo>(fallbackInfo);
	const [divisionSelectorOpen, setDivisionSelectorOpen] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState('');

	const tabScrollRef = useRef<ScrollView>(null);

	const [selectorHeight, setSelectorHeight] = useState(0);

	const [teamDrawerOpen, setTeamDrawerOpen] = useState(false);
	const [selectedTeam, setSelectedTeam] = useState<RankingRow | null>(null);
	const [matchDrawerOpen, setMatchDrawerOpen] = useState(false);
	const [selectedMatch, setSelectedMatch] = useState<ScheduleRow | null>(null);
	const [matchDrawerReturnRow, setMatchDrawerReturnRow] = useState<ScheduleRow | null>(null);

	const rankingRows = useMemo(
		() => mapRankings(rawRankings, teamLookup),
		[rawRankings, teamLookup]
	);
	const scheduleRows = useMemo(() => mapMatches(rawMatches), [rawMatches]);
	const skillsRows = useMemo(() => {
		if (selectedDivisionId === null || allSkills.length === 0) return [];
		const filtered = allSkills.filter((s) => s.division?.id === selectedDivisionId);
		return mapSkills(filtered.length > 0 ? filtered : allSkills, teamLookup);
	}, [allSkills, selectedDivisionId, teamLookup]);

	const divisionRatings = useMemo(() => {
		const quals = rawMatches.filter((m) => m.round === 2);
		if (quals.length === 0) return null;
		return calculateOprDprCcwm(robotEventsMatchesToScoredMatches(quals, { includeUnscored: true }));
	}, [rawMatches]);

	const insets = useSafeAreaInsets();
	const { team: myTeamNumber } = useStorage();

	const teamNumberToId = useMemo(
		() =>
			new Map<string, number>(
				[...teamLookup.entries()].map(([id, info]) => [info.number.toLowerCase(), id])
			),
		[teamLookup]
	);

	const isMyTeamRegistered = useMemo(
		() => !!myTeamNumber && teamLookup.size > 0 && teamNumberToId.has(myTeamNumber.toLowerCase()),
		[myTeamNumber, teamLookup, teamNumberToId]
	);

	const activeTabMeta = useMemo(
		() => (isMyTeamRegistered ? tabMeta : tabMeta.filter((t) => t.key !== 'myteam')),
		[isMyTeamRegistered]
	);

	const activeTabWidth = (SCREEN_WIDTH - spacing.md * 2) / activeTabMeta.length;

	const selectedTeamKey = useMemo(
		() => (selectedTeam ? selectedTeam.team.trim().toLowerCase() : null),
		[selectedTeam]
	);
	const selectedTeamId = useMemo(
		() => (selectedTeamKey ? teamNumberToId.get(selectedTeamKey) : undefined),
		[selectedTeamKey, teamNumberToId]
	);

	const selectedTeamRatings = useMemo(
		() =>
			divisionRatings && selectedTeamId !== undefined
				? {
						opr: divisionRatings.opr[selectedTeamId] ?? null,
						dpr: divisionRatings.dpr[selectedTeamId] ?? null,
						ccwm: divisionRatings.ccwm[selectedTeamId] ?? null
					}
				: { opr: null, dpr: null, ccwm: null },
		[divisionRatings, selectedTeamId]
	);

	const selectedTeamSkills = useMemo(
		() =>
			selectedTeamKey
				? (skillsRows.find((r) => r.team.trim().toLowerCase() === selectedTeamKey) ?? null)
				: null,
		[selectedTeamKey, skillsRows]
	);

	const selectedTeamMatches = useMemo(
		() =>
			selectedTeamKey
				? scheduleRows.filter(
						(r) =>
							r.red.some((t) => t.trim().toLowerCase() === selectedTeamKey) ||
							r.blue.some((t) => t.trim().toLowerCase() === selectedTeamKey)
					)
				: [],
		[selectedTeamKey, scheduleRows]
	);

	useEffect(() => {
		if (!Number.isFinite(eventId) || eventId <= 0) {
			setLoadError('Invalid event id.');
			return;
		}

		let cancelled = false;
		setLoadingEvent(true);
		setLoadingTeams(true);
		setLoadError(null);

		re.depaginate(
			re.events.eventGetTeams({ id: eventId }, re.custom.maxPages),
			re.models.PaginatedTeamFromJSON
		)
			.then((teams) => {
				if (!cancelled) setTeamLookup(buildTeamLookup(teams));
			})
			.catch(() => {})
			.finally(() => {
				if (!cancelled) setLoadingTeams(false);
			});

		re.depaginate(
			re.events.eventGetAwards({ id: eventId }, re.custom.maxPages),
			re.models.PaginatedAwardFromJSON
		)
			.then((eventAwards) => {
				if (!cancelled) setAwards(eventAwards);
			})
			.catch(() => {});

		re.depaginate(
			re.events.eventGetSkills({ id: eventId }, re.custom.maxPages),
			re.models.PaginatedSkillFromJSON
		)
			.then((skills) => {
				if (!cancelled) setAllSkills(skills);
			})
			.catch(() => {});

		re.events
			.eventGetEvent({ id: eventId })
			.then((event) => {
				if (cancelled) return;
				const sortedDivs = [...(event.divisions ?? [])].sort(
					(a, b) => (a.order ?? 0) - (b.order ?? 0)
				) as (Division & { id: number })[];
				setEventMeta(event);
				setEventSku((event as any).sku ?? '');
				setDivisions(sortedDivs);
				setInfoData(buildInfoData(event, sortedDivs[0]?.name ?? 'Division'));
				if (sortedDivs[0]) setSelectedDivisionId(sortedDivs[0].id);
			})
			.catch((e) => {
				if (!cancelled) setLoadError((e as Error).message || 'Unable to load event data.');
			})
			.finally(() => {
				if (!cancelled) setLoadingEvent(false);
			});

		return () => {
			cancelled = true;
		};
	}, [eventId, refreshKey]);

	useEffect(() => {
		if (selectedDivisionId === null) return;

		if (eventMeta) {
			const divName = divisions.find((d) => d.id === selectedDivisionId)?.name ?? 'Division';
			setInfoData(buildInfoData(eventMeta, divName));
		}

		let cancelled = false;
		setLoadingRankings(true);
		setLoadingMatches(true);

		re.depaginate(
			re.events.eventGetDivisionRankings(
				{ id: eventId, div: selectedDivisionId },
				re.custom.maxPages
			),
			re.models.PaginatedRankingFromJSON
		)
			.then((rankings) => {
				if (!cancelled) setRawRankings(rankings);
			})
			.catch((e) => {
				if (!cancelled) setLoadError((e as Error).message || 'Unable to load rankings.');
			})
			.finally(() => {
				if (!cancelled) setLoadingRankings(false);
			});

		re.depaginate(
			re.events.eventGetDivisionMatches(
				{ id: eventId, div: selectedDivisionId },
				re.custom.maxPages
			),
			re.models.PaginatedMatchFromJSON
		)
			.then((matches) => {
				if (!cancelled) setRawMatches(matches);
			})
			.catch((e) => {
				if (!cancelled) setLoadError((e as Error).message || 'Unable to load matches.');
			})
			.finally(() => {
				if (!cancelled) setLoadingMatches(false);
			});

		return () => {
			cancelled = true;
		};
	}, [eventId, selectedDivisionId, refreshKey]);

	const onRefresh = useCallback(() => {
		setRefreshing(true);
		setEventMeta(null);
		setRefreshKey((k) => k + 1);
	}, []);

	useEffect(() => {
		if (!loadingEvent && !loadingTeams && !loadingRankings && !loadingMatches && refreshing)
			setRefreshing(false);
	}, [loadingEvent, loadingTeams, loadingRankings, loadingMatches, refreshing]);

	const activeIndexRef = useRef(0);
	const scrollX = useRef(new Animated.Value(0)).current;
	const indicatorTranslateX = useMemo(
		() =>
			scrollX.interpolate({
				inputRange: [0, SCREEN_WIDTH * (activeTabMeta.length - 1)],
				outputRange: [0, activeTabWidth * (activeTabMeta.length - 1)],
				extrapolate: 'clamp'
			}),
		[activeTabMeta.length, activeTabWidth]
	);

	const tabOpacities = useMemo(
		() =>
			activeTabMeta.map((_, i) => ({
				active: scrollX.interpolate({
					inputRange: [(i - 0.5) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 0.5) * SCREEN_WIDTH],
					outputRange: [0, 1, 0],
					extrapolate: 'clamp'
				}),
				inactive: scrollX.interpolate({
					inputRange: [(i - 0.5) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 0.5) * SCREEN_WIDTH],
					outputRange: [1, 0, 1],
					extrapolate: 'clamp'
				})
			})),
		[activeTabMeta]
	);

	const scrollHandler = useRef(
		Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
			useNativeDriver: true
		})
	).current;

	const onScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
		const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
		activeIndexRef.current = index;
	}, []);

	const goToTab = (index: number) => {
		activeIndexRef.current = index;
		(tabScrollRef.current as any)?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
	};

	const openTeamDrawer = (row: RankingRow) => {
		setSelectedTeam(row);
		setTeamDrawerOpen(true);
	};

	const openTeamDrawerFromMatch = (teamNumber: string) => {
		const ranking = rankingRows.find(
			(r) => r.team.trim().toLowerCase() === teamNumber.trim().toLowerCase()
		);
		if (!ranking) return;
		setMatchDrawerReturnRow(selectedMatch);
		setMatchDrawerOpen(false);
		setSelectedTeam(ranking);
		setTeamDrawerOpen(true);
	};

	const closeTeamDrawer = () => {
		setTeamDrawerOpen(false);
		if (matchDrawerReturnRow) {
			setSelectedMatch(matchDrawerReturnRow);
			setMatchDrawerReturnRow(null);
			setMatchDrawerOpen(true);
		}
	};

	const openMatchDrawer = (row: ScheduleRow) => {
		setSelectedMatch(row);
		setMatchDrawerOpen(true);
	};

	const isLoading = loadingEvent || loadingTeams || loadingRankings || loadingMatches;

	const searchResults = useMemo(() => {
		if (!searchQuery.trim()) return [];
		const q = searchQuery.trim().toLowerCase();
		return [...teamLookup.entries()]
			.map(([id, t]) => ({ id, number: t.number, name: t.name }))
			.filter((t) => t.number.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
			.slice(0, 30);
	}, [searchQuery, teamLookup]);

	const openTeamFromSearch = (teamNumber: string, teamName: string) => {
		setSearchOpen(false);
		setSearchQuery('');
		const existing = rankingRows.find(
			(r) => r.team.trim().toLowerCase() === teamNumber.trim().toLowerCase()
		);
		const row: RankingRow = existing ?? {
			rank: 0,
			team: teamNumber,
			name: teamName,
			wins: 0,
			losses: 0,
			ties: 0,
			wp: 0,
			ap: 0,
			sp: 0
		};
		setSelectedTeam(row);
		setTeamDrawerOpen(true);
	};

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
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
					<TouchableOpacity style={styles.searchBtn} onPress={() => setSearchOpen(true)}>
						<Search size={18} color={colors.mutedForeground} />
					</TouchableOpacity>
					<View onLayout={(e) => setSelectorHeight(e.nativeEvent.layout.height)}>
						<TouchableOpacity
							style={styles.divisionSelector}
							onPress={() => divisions.length > 1 && setDivisionSelectorOpen((v) => !v)}
						>
							<Users size={16} color={colors.mutedForeground} />
							<Text style={styles.divisionText}>{selectedDivisionName}</Text>
						</TouchableOpacity>
						{divisions.length > 1 && divisionSelectorOpen && (
							<View style={[styles.divDropdown, { top: selectorHeight + 4 }]}>
								{divisions.map((div) => (
									<TouchableOpacity
										key={div.id}
										style={[
											styles.divOption,
											div.id === selectedDivisionId && styles.divOptionActive
										]}
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
					</View>
				</View>
			</View>

			{loadError && (
				<View style={styles.errorBox}>
					<Text style={styles.errorText}>{loadError}</Text>
				</View>
			)}

			<View style={styles.tabBar}>
				<Animated.View
					style={[
						styles.tabIndicator,
						{ width: activeTabWidth, transform: [{ translateX: indicatorTranslateX }] }
					]}
				/>
				{activeTabMeta.map((tab, i) => {
					const Icon = tab.icon;
					return (
						<Pressable key={tab.key} style={styles.tabBtn} onPress={() => goToTab(i)}>
							<View style={styles.tabIconContainer}>
								<Animated.View style={[styles.tabIconLayer, { opacity: tabOpacities[i].inactive }]}>
									<Icon size={22} color={colors.mutedForeground} strokeWidth={2.25} />
								</Animated.View>
								<Animated.View style={[styles.tabIconLayer, { opacity: tabOpacities[i].active }]}>
									<Icon size={22} color={colors.primary} strokeWidth={2.25} />
								</Animated.View>
							</View>
						</Pressable>
					);
				})}
			</View>

			{isLoading && (
				<View style={styles.loadingBar}>
					<ActivityIndicator size="small" color={colors.primary} />
				</View>
			)}

			<Animated.ScrollView
				ref={tabScrollRef}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				scrollEventThrottle={16}
				onScroll={scrollHandler}
				onMomentumScrollEnd={onScrollEnd}
				style={styles.tabPages}
				decelerationRate="fast"
			>
				{isMyTeamRegistered && (
					<ScrollView
						style={styles.tabPage}
						contentContainerStyle={styles.tabContent}
						refreshControl={
							<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="transparent" />
						}
					>
						<MyTeamTab
							rankingRows={rankingRows}
							scheduleRows={scheduleRows}
							skillsRows={skillsRows}
							divisionRatings={divisionRatings}
							teamNumberToId={teamNumberToId}
							loading={loadingEvent || loadingTeams || loadingRankings || loadingMatches}
							onMatchPress={openMatchDrawer}
						/>
					</ScrollView>
				)}
				<ScrollView
					style={styles.tabPage}
					contentContainerStyle={styles.tabContent}
					refreshControl={
						<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="transparent" />
					}
				>
					<ScheduleTab rows={scheduleRows} onMatchSelect={openMatchDrawer} />
				</ScrollView>
				<ScrollView
					style={styles.tabPage}
					contentContainerStyle={styles.tabContent}
					refreshControl={
						<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="transparent" />
					}
				>
					<RankingsTab rows={rankingRows} onTeamSelect={openTeamDrawer} />
				</ScrollView>
				<ScrollView
					style={styles.tabPage}
					contentContainerStyle={styles.tabContent}
					refreshControl={
						<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="transparent" />
					}
				>
					<SkillsTab
						rows={skillsRows}
						onTeamSelect={(teamNumber) => {
							const row = rankingRows.find(
								(r) => r.team.trim().toLowerCase() === teamNumber.trim().toLowerCase()
							);
							if (row) openTeamDrawer(row);
						}}
					/>
				</ScrollView>
				<ScrollView
					style={styles.tabPage}
					contentContainerStyle={styles.tabContent}
					refreshControl={
						<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor="transparent" />
					}
				>
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
			</Animated.ScrollView>

			<Modal
				visible={searchOpen}
				transparent
				statusBarTranslucent
				animationType="fade"
				onRequestClose={() => {
					setSearchOpen(false);
					setSearchQuery('');
				}}
			>
				<Pressable
					style={styles.searchBackdrop}
					onPress={() => {
						setSearchOpen(false);
						setSearchQuery('');
					}}
				/>
				<View style={[styles.searchSheet, { paddingTop: Math.max(insets.top, 16) }]}>
					<View style={styles.searchInputRow}>
						<Search size={16} color={colors.mutedForeground} />
						<TextInput
							style={styles.searchInput}
							value={searchQuery}
							onChangeText={setSearchQuery}
							placeholder="Search teams..."
							placeholderTextColor={colors.mutedForeground}
							autoFocus
							autoCapitalize="characters"
							autoCorrect={false}
						/>
					</View>
					<ScrollView style={styles.searchResultsList} keyboardShouldPersistTaps="handled">
						{searchQuery.trim().length > 0 && searchResults.length === 0 ? (
							<Text style={styles.searchNoResults}>No teams found</Text>
						) : (
							searchResults.map((t) => (
								<TouchableOpacity
									key={t.id}
									style={styles.searchResult}
									onPress={() => openTeamFromSearch(t.number, t.name)}
								>
									<Text style={styles.searchResultNum}>{t.number}</Text>
									<Text style={styles.searchResultName} numberOfLines={1}>
										{t.name || 'No name'}
									</Text>
								</TouchableOpacity>
							))
						)}
					</ScrollView>
				</View>
			</Modal>
			<TeamDrawer
				open={teamDrawerOpen}
				onClose={closeTeamDrawer}
				team={selectedTeam}
				skills={selectedTeamSkills}
				matches={selectedTeamMatches}
				opr={selectedTeamRatings.opr}
				dpr={selectedTeamRatings.dpr}
				ccwm={selectedTeamRatings.ccwm}
				onMatchPress={(match) => {
					const row = scheduleRows.find((r) => r.match === match.match);
					if (row) openMatchDrawer(row);
				}}
			/>
			<MatchDrawer
				open={matchDrawerOpen}
				onClose={() => setMatchDrawerOpen(false)}
				row={selectedMatch}
				rankingRows={rankingRows}
				onTeamSelect={openTeamDrawerFromMatch}
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
		paddingVertical: spacing.lg,
		alignItems: 'center'
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
	tabBtn: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', zIndex: 1 },
	tabIconContainer: { width: 22, height: 22 },
	tabIconLayer: { position: 'absolute', top: 0, left: 0 },
	tabIndicator: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		left: 0,
		width: TAB_WIDTH,
		backgroundColor: colors.primary + '25',
		borderRadius: radius.xl
	},
	tabPages: { flex: 1, marginTop: 8 },
	tabPage: { width: SCREEN_WIDTH },
	tabContent: {
		paddingHorizontal: spacing.md,
		paddingTop: spacing.md,
		paddingBottom: spacing['3xl']
	},
	divDropdown: {
		position: 'absolute',
		right: 0,
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
	divOptionTextActive: { color: colors.primary, fontWeight: '500' },
	searchBtn: {
		width: 36,
		height: 36,
		borderRadius: radius.lg,
		backgroundColor: colors.card,
		borderWidth: 1,
		borderColor: colors.border,
		alignItems: 'center',
		justifyContent: 'center'
	},
	searchBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
	searchSheet: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		backgroundColor: colors.card,
		borderBottomLeftRadius: 24,
		borderBottomRightRadius: 24,
		padding: spacing.lg,
		paddingTop: spacing.lg,
		maxHeight: '70%'
	},
	searchInputRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		backgroundColor: colors.background,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: colors.border,
		paddingHorizontal: 12,
		paddingVertical: 8,
		marginBottom: 12
	},
	searchInput: {
		flex: 1,
		fontSize: font.base,
		color: colors.foreground
	},
	searchResultsList: { maxHeight: 360 },
	searchResult: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		paddingHorizontal: 4,
		gap: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: colors.border
	},
	searchResultNum: {
		fontSize: font.base,
		fontWeight: '600',
		color: colors.foreground,
		width: 72
	},
	searchResultName: { flex: 1, fontSize: font.sm, color: colors.mutedForeground },
	searchNoResults: {
		textAlign: 'center',
		color: colors.mutedForeground,
		marginTop: 24,
		fontSize: font.sm
	}
});
