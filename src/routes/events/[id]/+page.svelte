<script lang="ts">
	import {
		re,
		calculateOprDprCcwm,
		robotEventsMatchesToScoredMatches,
		type RatingsResult
	} from '$lib/robotevents';
	import { Button } from '$lib/components/ui/button';
	import * as ButtonGroup from '$lib/components/ui/button-group';
	import * as Select from '$lib/components/ui/select';
	import InfoTab from './InfoTab.svelte';
	import RankingsTab from './RankingsTab.svelte';
	import ScheduleTab from './ScheduleTab.svelte';
	import SkillsTab from './SkillsTab.svelte';
	import TeamDrawer from './TeamDrawer.svelte';
	import MatchDrawer from './MatchDrawer.svelte';
	import { ArrowLeft, Clock3, Gamepad2, Info, ListOrdered, Search, Users } from '@lucide/svelte';

	import { page } from '$app/state';

	const tabs = ['schedule', 'rankings', 'skills', 'info'] as const;
	type EventTab = (typeof tabs)[number];

	const tabLabels: Record<EventTab, string> = {
		schedule: 'Schedule',
		rankings: 'Rankings',
		skills: 'Skills',
		info: 'Info'
	};

	const tabMeta = [
		{ key: 'schedule' as const, label: 'Schedule', icon: Clock3 },
		{ key: 'rankings' as const, label: 'Rankings', icon: ListOrdered },
		{ key: 'skills' as const, label: 'Skills', icon: Gamepad2 },
		{ key: 'info' as const, label: 'Info', icon: Info }
	];

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
		division: string;
	};

	type TeamLookup = {
		number: string;
		name: string;
	};

	const fallbackInfoData: EventInfo = {
		name: 'Event',
		locationLine1: 'Location TBD',
		locationLine2: '',
		date: 'Date TBD',
		division: 'Division'
	};

	const parseDivisionId = (value: string): number | null => {
		const parsed = Number.parseInt(value, 10);
		return Number.isFinite(parsed) ? parsed : null;
	};

	let eventId = $derived(Number.parseInt(page.params.id ?? '', 10));
	let eventMeta = $state<re.models.Event | null>(null);
	let divisions = $state<re.models.Division[]>([]);
	let selectableDivisions = $derived(
		divisions.filter(
			(division): division is re.models.Division & { id: number } => typeof division.id === 'number'
		)
	);
	let selectedDivisionValue = $state('');
	let selectedDivisionId = $derived(parseDivisionId(selectedDivisionValue));
	let selectedDivisionName = $derived(
		selectableDivisions.find((division) => division.id.toString() === selectedDivisionValue)
			?.name ?? 'Division'
	);
	let teamLookup = $state<Map<number, TeamLookup>>(new Map());
	let allSkills = $state<re.models.Skill[]>([]);
	let awards = $state<re.models.Award[]>([]);
	let scheduleRows = $state<ScheduleRow[]>([]);
	let rankingRows = $state<RankingRow[]>([]);
	let skillsRows = $state<SkillsRow[]>([]);
	let divisionMatches = $state<re.models.MatchObj[]>([]);
	let divisionRatings = $derived.by(() => {
		const qualMatches = divisionMatches.filter((m) => m.round === 2);
		if (qualMatches.length === 0) return null;
		return calculateOprDprCcwm(
			robotEventsMatchesToScoredMatches(qualMatches, { includeUnscored: true })
		);
	});
	let teamNumberToId = $derived(
		new Map<string, number>(
			[...teamLookup.entries()].map(([id, info]) => [info.number.toLowerCase(), id])
		)
	);
	let infoData = $state<EventInfo>(fallbackInfoData);
	let isLoadingEvent = $state(false);
	let isLoadingDivision = $state(false);
	let isLoading = $derived(isLoadingEvent || isLoadingDivision);
	let loadError = $state<string | null>(null);
	let isTeamDrawerOpen = $state(false);
	let selectedRankingTeam = $state<RankingRow | null>(null);
	let isMatchDrawerOpen = $state(false);
	let selectedMatchRow = $state<ScheduleRow | null>(null);

	const normalizeTeam = (value: string) => value.trim().toLowerCase();
	let selectedTeamKey = $derived(
		selectedRankingTeam ? normalizeTeam(selectedRankingTeam.team) : null
	);

	let selectedTeamRatings = $derived.by(
		(): { opr: number | null; dpr: number | null; ccwm: number | null } => {
			if (!selectedTeamKey || !divisionRatings) return { opr: null, dpr: null, ccwm: null };
			const teamId = teamNumberToId.get(selectedTeamKey);
			if (teamId === undefined) return { opr: null, dpr: null, ccwm: null };
			const opr = divisionRatings.opr[teamId] ?? null;
			const dpr = divisionRatings.dpr[teamId] ?? null;
			const ccwm = divisionRatings.ccwm[teamId] ?? null;
			return { opr, dpr, ccwm };
		}
	);

	let selectedTeamSkills = $derived(
		selectedTeamKey
			? (skillsRows.find((row) => normalizeTeam(row.team) === selectedTeamKey) ?? null)
			: null
	);
	let selectedTeamMatches = $derived(
		selectedTeamKey
			? scheduleRows.filter(
					(row) =>
						row.red.some((team) => normalizeTeam(team) === selectedTeamKey) ||
						row.blue.some((team) => normalizeTeam(team) === selectedTeamKey)
				)
			: []
	);

	const formatDate = (value: Date) =>
		new Intl.DateTimeFormat('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(value);

	const formatDateRange = (start?: Date, end?: Date) => {
		if (!start && !end) return 'Date TBD';
		if (start && end) {
			if (start.toDateString() === end.toDateString()) return formatDate(start);
			return `${formatDate(start)} - ${formatDate(end)}`;
		}
		return formatDate(start ?? end!);
	};

	const formatTime = (value?: Date) => {
		if (!value) return 'TBD';
		return new Intl.DateTimeFormat('en-US', {
			hour: 'numeric',
			minute: '2-digit'
		}).format(value);
	};

	const toErrorMessage = (error: unknown) => {
		if (error instanceof Error && error.message.length > 0) return error.message;
		return 'Unable to load event data.';
	};

	const buildInfoData = (event: re.models.Event, division: string): EventInfo => {
		const locationLine1 = [
			event.location?.venue,
			event.location?.address1,
			event.location?.address2
		]
			.filter((value) => Boolean(value && value.trim().length > 0))
			.join(', ');
		const locationLine2 = [event.location?.city, event.location?.region, event.location?.country]
			.filter((value) => Boolean(value && value.trim().length > 0))
			.join(', ');

		return {
			name: event.name,
			locationLine1: locationLine1.length > 0 ? locationLine1 : 'Location TBD',
			locationLine2,
			date: formatDateRange(event.start, event.end),
			division
		};
	};

	const buildTeamLookup = (teams: re.models.Team[]) =>
		new Map<number, TeamLookup>(
			teams.map((team) => [
				team.id,
				{
					number: team.number,
					name: (team.teamName ?? '').trim()
				}
			])
		);

	const mapMatches = (matches: re.models.MatchObj[]): ScheduleRow[] => {
		const getSortTime = (match: re.models.MatchObj) =>
			match.scheduled?.getTime() ?? match.started?.getTime() ?? null;

		const getMatchGroup = (match: re.models.MatchObj): 'practice' | 'qualifier' | 'elimination' => {
			if (match.round === 1) return 'practice';
			if (match.round === 2) return 'qualifier';
			if (match.round >= 3) return 'elimination';

			const normalized = (match.name ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
			if (normalized.startsWith('practice')) return 'practice';
			if (normalized.startsWith('qualifier') || normalized.startsWith('qualification')) {
				return 'qualifier';
			}
			return 'elimination';
		};

		const formatMatchName = (match: re.models.MatchObj) => {
			const raw = match.name?.trim() ?? '';
			if (raw.length > 0) {
				const normalized = raw.replace(/\s+/g, ' ').trim();

				const practice = normalized.match(/^practice\s*#?\s*(\d+)$/i);
				if (practice) return `P${practice[1]}`;

				const qualifier = normalized.match(/^(?:qualifier|qualification)\s*#?\s*(\d+)$/i);
				if (qualifier) return `Q${qualifier[1]}`;

				const parseElim = (pattern: RegExp, prefix: string) => {
					const parsed = normalized.match(pattern);
					if (!parsed) return null;
					const instance = parsed[1] ?? `${match.instance || 1}`;
					const matchNum = parsed[2] ?? `${match.matchnum || 1}`;
					return `${prefix} ${instance}-${matchNum}`;
				};

				const r16 = parseElim(/^(?:round\s*of\s*16|r16)\s*#?\s*(\d+)(?:\s*-\s*(\d+))?$/i, 'R16');
				if (r16) return r16;

				const qf = parseElim(
					/^(?:quarter\s*final|quarterfinal|qf)\s*#?\s*(\d+)(?:\s*-\s*(\d+))?$/i,
					'QF'
				);
				if (qf) return qf;

				const sf = parseElim(
					/^(?:semi\s*final|semifinal|sf)\s*#?\s*(\d+)(?:\s*-\s*(\d+))?$/i,
					'SF'
				);
				if (sf) return sf;

				const finals = parseElim(/^(?:final|finals|f)\s*#?\s*(\d+)(?:\s*-\s*(\d+))?$/i, 'F');
				if (finals) return finals;

				return normalized;
			}

			const labelByRound: Record<number, string> = {
				1: 'P',
				2: 'Q',
				3: 'QF',
				4: 'SF',
				5: 'F',
				6: 'R16'
			};

			const label = labelByRound[match.round] ?? `Round ${match.round}`;
			if (match.round === 2) return `${label}${match.matchnum}`;
			if (match.round >= 3 && match.instance > 0)
				return `${label} ${match.instance}-${match.matchnum}`;
			return `${label} ${match.matchnum}`;
		};

		return [...matches]
			.sort((a, b) => {
				const leftTime = getSortTime(a);
				const rightTime = getSortTime(b);
				if (leftTime !== null && rightTime !== null && leftTime !== rightTime) {
					return leftTime - rightTime;
				}
				if (leftTime !== null && rightTime === null) return -1;
				if (leftTime === null && rightTime !== null) return 1;

				if (a.round !== b.round) return a.round - b.round;
				if (a.instance !== b.instance) return a.instance - b.instance;
				return a.matchnum - b.matchnum;
			})
			.map((match) => {
				const redAlliance = match.alliances.find(
					(alliance) => alliance.color?.toLowerCase() === 'red'
				);
				const blueAlliance = match.alliances.find(
					(alliance) => alliance.color?.toLowerCase() === 'blue'
				);

				const redScore = redAlliance?.score ?? 0;
				const blueScore = blueAlliance?.score ?? 0;

				return {
					group: getMatchGroup(match),
					match: formatMatchName(match),
					time: formatTime(match.scheduled ?? match.started),
					score: `${redScore} - ${blueScore}`,
					red: (redAlliance?.teams ?? []).map(
						(team) => team.team?.name ?? team.team?.code ?? '---'
					),
					blue: (blueAlliance?.teams ?? []).map(
						(team) => team.team?.name ?? team.team?.code ?? '---'
					),
					field: match.field,
					played: match.started != null
				};
			});
	};

	const mapRankings = (
		rankings: re.models.Ranking[],
		teams: Map<number, TeamLookup>
	): RankingRow[] =>
		[...rankings]
			.sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER))
			.map((ranking) => {
				const teamId = ranking.team?.id;
				const team = teamId ? teams.get(teamId) : undefined;
				const fallbackNumber = ranking.team?.name ?? ranking.team?.code ?? '---';
				const fallbackName = ranking.team?.code ?? '';

				return {
					rank: ranking.rank ?? 0,
					team: team?.number ?? fallbackNumber,
					name: team?.name || fallbackName,
					wins: ranking.wins ?? 0,
					losses: ranking.losses ?? 0,
					ties: ranking.ties ?? 0,
					wp: ranking.wp ?? 0,
					ap: ranking.ap ?? 0,
					sp: ranking.sp ?? 0
				};
			});

	const mapSkills = (skills: re.models.Skill[], teams: Map<number, TeamLookup>): SkillsRow[] => {
		const aggregates = new Map<
			number,
			{
				teamId: number;
				driver: number;
				auton: number;
				driverRuns: number;
				autonRuns: number;
			}
		>();

		for (const skill of skills) {
			const teamId = skill.team?.id;
			if (!teamId) continue;

			const current =
				aggregates.get(teamId) ??
				({ teamId, driver: 0, auton: 0, driverRuns: 0, autonRuns: 0 } as const);

			const score = skill.score ?? 0;
			const attempts = skill.attempts ?? 0;

			if (skill.type === re.models.SkillType.Driver) {
				aggregates.set(teamId, {
					...current,
					driver: Math.max(current.driver, score),
					driverRuns: Math.max(current.driverRuns, attempts)
				});
				continue;
			}

			if (skill.type === re.models.SkillType.Programming) {
				aggregates.set(teamId, {
					...current,
					auton: Math.max(current.auton, score),
					autonRuns: Math.max(current.autonRuns, attempts)
				});
			}
		}

		const sorted = [...aggregates.values()]
			.map((aggregate) => {
				const team = teams.get(aggregate.teamId);
				const points = aggregate.driver + aggregate.auton;

				return {
					team: team?.number ?? `${aggregate.teamId}`,
					name: team?.name ?? '',
					points,
					driver: aggregate.driver,
					driverRuns: aggregate.driverRuns,
					auton: aggregate.auton,
					autonRuns: aggregate.autonRuns
				};
			})
			.sort((a, b) => {
				if (b.points !== a.points) return b.points - a.points;
				if (b.driver !== a.driver) return b.driver - a.driver;
				return b.auton - a.auton;
			});

		return sorted.map((row, index) => ({ ...row, rank: index + 1 }));
	};

	$effect(() => {
		const id = eventId;

		if (!Number.isFinite(id) || id <= 0) {
			loadError = 'Invalid event id.';
			isLoadingEvent = false;
			isLoadingDivision = false;
			eventMeta = null;
			divisions = [];
			selectedDivisionValue = '';
			teamLookup = new Map();
			allSkills = [];
			scheduleRows = [];
			rankingRows = [];
			skillsRows = [];
			infoData = fallbackInfoData;
			isTeamDrawerOpen = false;
			selectedRankingTeam = null;
			return;
		}

		let cancelled = false;
		isLoadingEvent = true;
		loadError = null;

		const loadEvent = async () => {
			try {
				const [event, teams, skills, eventAwards] = await Promise.all([
					re.events.eventGetEvent({ id }),
					re.depaginate(
						re.events.eventGetTeams({ id }, re.custom.maxPages),
						re.models.PaginatedTeamFromJSON
					),
					re.depaginate(
						re.events.eventGetSkills({ id }, re.custom.maxPages),
						re.models.PaginatedSkillFromJSON
					),
					re
						.depaginate(
							re.events.eventGetAwards({ id }, re.custom.maxPages),
							re.models.PaginatedAwardFromJSON
						)
						.catch(() => [] as re.models.Award[])
				]);

				if (cancelled) return;

				eventMeta = event;
				const sortedDivisions = [...(event.divisions ?? [])].sort(
					(a, b) => (a.order ?? 0) - (b.order ?? 0)
				);
				divisions = sortedDivisions;

				const divisionExists = selectableDivisions.some(
					(division) => division.id.toString() === selectedDivisionValue
				);
				selectedDivisionValue = divisionExists
					? selectedDivisionValue
					: (selectableDivisions[0]?.id.toString() ?? '');

				teamLookup = buildTeamLookup(teams);
				allSkills = skills;
				awards = eventAwards;
				infoData = buildInfoData(event, sortedDivisions[0]?.name ?? 'Division');
			} catch (error) {
				if (cancelled) return;

				loadError = toErrorMessage(error);
				eventMeta = null;
				divisions = [];
				selectedDivisionValue = '';
				teamLookup = new Map();
				allSkills = [];
				awards = [];
				scheduleRows = [];
				rankingRows = [];
				skillsRows = [];
				infoData = fallbackInfoData;
				isTeamDrawerOpen = false;
				selectedRankingTeam = null;
			} finally {
				if (!cancelled) {
					isLoadingEvent = false;
				}
			}
		};

		void loadEvent();

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		const id = eventId;
		const event = eventMeta;
		const divisionId = selectedDivisionId;
		const teams = teamLookup;
		const skills = allSkills;

		if (!event || !Number.isFinite(id) || id <= 0) return;

		const divisionName =
			selectableDivisions.find((division) => division.id.toString() === selectedDivisionValue)
				?.name ?? 'Division';
		infoData = buildInfoData(event, divisionName);

		const filteredSkills =
			divisionId === null ? skills : skills.filter((skill) => skill.division?.id === divisionId);
		skillsRows = mapSkills(filteredSkills.length > 0 ? filteredSkills : skills, teams);

		if (divisionId === null) {
			scheduleRows = [];
			rankingRows = [];
			divisionMatches = [];
			isLoadingDivision = false;
			isTeamDrawerOpen = false;
			selectedRankingTeam = null;
			return;
		}

		let cancelled = false;
		isLoadingDivision = true;

		const loadDivision = async () => {
			try {
				const [rankings, matches] = await Promise.all([
					re.depaginate(
						re.events.eventGetDivisionRankings({ id, div: divisionId }, re.custom.maxPages),
						re.models.PaginatedRankingFromJSON
					),
					re.depaginate(
						re.events.eventGetDivisionMatches({ id, div: divisionId }, re.custom.maxPages),
						re.models.PaginatedMatchFromJSON
					)
				]);

				if (cancelled) return;

				rankingRows = mapRankings(rankings, teams);
				scheduleRows = mapMatches(matches);
				divisionMatches = matches;
			} catch (error) {
				if (cancelled) return;

				loadError = toErrorMessage(error);
				rankingRows = [];
				scheduleRows = [];
				divisionMatches = [];
				isTeamDrawerOpen = false;
				selectedRankingTeam = null;
			} finally {
				if (!cancelled) {
					isLoadingDivision = false;
				}
			}
		};

		void loadDivision();

		return () => {
			cancelled = true;
		};
	});

	let activeIndex = $state(0);
	let dragOffset = $state(0);
	let dragging = $state(false);
	let paneWidth = $state(1);
	const paneGap = 20;
	let panesRef = $state<HTMLElement | null>(null);
	let contentScrollRef = $state<HTMLElement | null>(null);
	let schedulePaneRef = $state<HTMLElement | null>(null);
	let rankingsPaneRef = $state<HTMLElement | null>(null);
	let skillsPaneRef = $state<HTMLElement | null>(null);
	let infoPaneRef = $state<HTMLElement | null>(null);
	let paneHeight = $state(1);

	const resetContentScroll = () => {
		if (!contentScrollRef) return;
		contentScrollRef.scrollTop = 0;
	};

	let activeTab = $derived(tabs[activeIndex]);
	let activeTitle = $derived(tabLabels[activeTab]);

	$effect(() => {
		const currentTeam = selectedRankingTeam;
		if (!currentTeam) return;
		const currentTeamKey = normalizeTeam(currentTeam.team);

		const next = rankingRows.find((row) => normalizeTeam(row.team) === currentTeamKey) ?? null;

		if (!next) {
			isTeamDrawerOpen = false;
			selectedRankingTeam = null;
			return;
		}

		if (
			next.rank !== currentTeam.rank ||
			next.wins !== currentTeam.wins ||
			next.losses !== currentTeam.losses ||
			next.ties !== currentTeam.ties ||
			next.wp !== currentTeam.wp ||
			next.ap !== currentTeam.ap ||
			next.sp !== currentTeam.sp ||
			next.name !== currentTeam.name
		) {
			selectedRankingTeam = next;
		}
	});

	$effect(() => {
		if (!panesRef) return;

		paneWidth = panesRef.clientWidth || 1;
		const observer = new ResizeObserver(() => {
			paneWidth = panesRef?.clientWidth || 1;
		});

		observer.observe(panesRef);

		return () => {
			observer.disconnect();
		};
	});

	$effect(() => {
		const activePane = [schedulePaneRef, rankingsPaneRef, skillsPaneRef, infoPaneRef][activeIndex];
		if (!activePane) return;

		const sync = () => {
			const h = Math.max(1, activePane.scrollHeight || 1);
			if (h !== paneHeight) paneHeight = h;
		};

		const frame = requestAnimationFrame(sync);
		const observer = new ResizeObserver(sync);
		observer.observe(activePane);

		return () => {
			cancelAnimationFrame(frame);
			observer.disconnect();
		};
	});

	const goToTab = (tab: EventTab) => {
		const index = tabs.indexOf(tab);
		if (index === activeIndex) return;
		activeIndex = index;
		dragOffset = 0;
		dragging = false;
		resetContentScroll();
	};

	const applyEdgeResistance = (offset: number) => {
		if (activeIndex === 0 && offset > 0) return offset * 0.35;
		if (activeIndex === tabs.length - 1 && offset < 0) return offset * 0.35;
		return offset;
	};

	const settleSwipe = () => {
		const threshold = paneWidth * 0.2;
		const initialIndex = activeIndex;
		let targetIndex = activeIndex;

		if (dragOffset <= -threshold) targetIndex = activeIndex + 1;
		else if (dragOffset >= threshold) targetIndex = activeIndex - 1;

		if (targetIndex < 0 || targetIndex >= tabs.length) {
			targetIndex = activeIndex;
		}

		activeIndex = targetIndex;
		dragOffset = 0;
		dragging = false;

		if (targetIndex !== initialIndex) {
			resetContentScroll();
		}
	};

	const swipeNavigation = (node: HTMLElement) => {
		let startX = 0;
		let startY = 0;
		let tracking = false;
		let horizontal = false;

		const onStart = (event: TouchEvent) => {
			const touch = event.changedTouches[0];
			if (!touch) return;

			startX = touch.clientX;
			startY = touch.clientY;
			tracking = true;
			horizontal = false;
			dragging = true;
			dragOffset = 0;
		};

		const onMove = (event: TouchEvent) => {
			if (!tracking) return;

			const touch = event.changedTouches[0];
			if (!touch) return;

			const deltaX = touch.clientX - startX;
			const deltaY = touch.clientY - startY;

			if (!horizontal) {
				if (Math.abs(deltaX) < 8 && Math.abs(deltaY) < 8) return;
				if (Math.abs(deltaX) <= Math.abs(deltaY)) {
					tracking = false;
					dragging = false;
					dragOffset = 0;
					return;
				}
				horizontal = true;
			}

			event.preventDefault();
			dragOffset = applyEdgeResistance(deltaX);
		};

		const onEnd = () => {
			if (!tracking && !dragging) return;
			tracking = false;

			if (!horizontal) {
				dragging = false;
				dragOffset = 0;
				return;
			}

			settleSwipe();
		};

		node.addEventListener('touchstart', onStart, { passive: true });
		node.addEventListener('touchmove', onMove, { passive: false });
		node.addEventListener('touchend', onEnd, { passive: true });
		node.addEventListener('touchcancel', onEnd, { passive: true });

		return {
			destroy: () => {
				node.removeEventListener('touchstart', onStart);
				node.removeEventListener('touchmove', onMove);
				node.removeEventListener('touchend', onEnd);
				node.removeEventListener('touchcancel', onEnd);
			}
		};
	};

	const openTeamDrawer = (row: RankingRow) => {
		selectedRankingTeam = row;
		isTeamDrawerOpen = true;
	};

	const openMatchDrawer = (row: ScheduleRow) => {
		selectedMatchRow = row;
		isMatchDrawerOpen = true;
	};
</script>

<div class="flex h-full flex-col overflow-hidden bg-background">
	<div class="px-4 pt-5 pb-2">
		<div class="mb-2 flex items-center justify-between">
			<Button
				variant="ghost"
				size="icon"
				onclick={() => window.history.back()}
				class="h-10 w-10 rounded-full text-foreground/90"
			>
				<ArrowLeft class="h-9 w-9" />
			</Button>
			<div class="flex items-center gap-2 text-muted-foreground">
				<Users class="h-5 w-5" />
				<Select.Root type="single" bind:value={selectedDivisionValue}>
					<Select.Trigger class="h-9 min-w-44 border-border bg-card text-sm text-foreground">
						{selectedDivisionName}
					</Select.Trigger>
					<Select.Content>
						{#each selectableDivisions as division}
							<Select.Item value={division.id.toString()}>{division.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>
	</div>

	<div bind:this={contentScrollRef} class="min-h-0 flex-1 overflow-y-auto">
		<div class="px-4 pb-2">
			<div class="flex items-center justify-between">
				<h1 class="text-2xl leading-none font-semibold tracking-tight">{activeTitle}</h1>
				<Button variant="ghost" size="icon" class="h-10 w-10 text-muted-foreground">
					<Search class="h-7 w-7" />
				</Button>
			</div>
		</div>

		<div class="sticky top-0 z-10 bg-black">
			<div class="rounded-t-4xl border-t border-border/70 bg-card px-4 pt-4">
				<div class=" -mx-4 bg-card px-4 pt-1 pb-4">
					<ButtonGroup.Root class="w-full *:data-[slot=button]:h-12 *:data-[slot=button]:flex-1">
						{#each tabMeta as tab}
							<Button
								variant="outline"
								size="icon"
								onclick={() => goToTab(tab.key)}
								class={activeTab === tab.key
									? 'border-primary/60 bg-primary/20 text-primary'
									: 'border-border bg-card text-muted-foreground'}
							>
								<tab.icon class="h-6 w-6" stroke-width={2.25} />
							</Button>
						{/each}
					</ButtonGroup.Root>
				</div>
			</div>
		</div>
		<div class="bg-card px-4 pb-6">
			{#if isLoading}
				<div class="mb-3 px-1 text-sm text-muted-foreground">Loading event data...</div>
			{/if}

			{#if loadError}
				<div
					class="mb-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
				>
					{loadError}
				</div>
			{/if}

			<div
				bind:this={panesRef}
				class="overflow-hidden"
				style={`touch-action: pan-y; height: ${paneHeight}px;`}
				use:swipeNavigation
			>
				<div
					class="flex w-full items-start"
					style={`gap: ${paneGap}px; transform: translate3d(calc(${activeIndex * -100}% - ${activeIndex * paneGap}px + ${dragOffset}px), 0, 0); transition: ${dragging ? 'none' : 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)'};`}
				>
					<div bind:this={schedulePaneRef} class="w-full shrink-0">
						<ScheduleTab rows={scheduleRows} onMatchSelect={openMatchDrawer} />
					</div>
					<div bind:this={rankingsPaneRef} class="w-full shrink-0">
						<RankingsTab rows={rankingRows} onTeamSelect={openTeamDrawer} />
					</div>
					<div bind:this={skillsPaneRef} class="w-full shrink-0">
						<SkillsTab rows={skillsRows} />
					</div>
					<div bind:this={infoPaneRef} class="w-full shrink-0">
						<InfoTab
							info={infoData}
							teams={[...teamLookup.entries()].map(([id, t]) => ({
								id,
								number: t.number,
								name: t.name
							}))}
							{awards}
							{rankingRows}
							hasSchedule={scheduleRows.length > 0}
							season={eventMeta?.season?.id ?? 0}
							onTeamSelect={openTeamDrawer}
						/>
					</div>
				</div>
			</div>
		</div>
	</div>

	<TeamDrawer
		bind:open={isTeamDrawerOpen}
		team={selectedRankingTeam}
		skills={selectedTeamSkills}
		matches={selectedTeamMatches}
		opr={selectedTeamRatings.opr}
		dpr={selectedTeamRatings.dpr}
		ccwm={selectedTeamRatings.ccwm}
	/>
	<MatchDrawer bind:open={isMatchDrawerOpen} row={selectedMatchRow} {rankingRows} />
</div>
