<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { CONSTANTS } from '$lib/const';
	import { re } from '$lib/robotevents';
	import { storage } from '$lib/state';
	import { ArrowRight, CalendarDays, Gamepad2, Trophy } from '@lucide/svelte';

	type TeamStats = {
		team: re.models.Team;
		winRate: number;
		wins: number;
		losses: number;
		ties: number;
		skillsRank: number | null;
		skillsScore: number | null;
		driver: number | null;
		programming: number | null;
	};

	let loading = $state(true);
	let error = $state<string | null>(null);

	let programs = $state(
		(
			await re.depaginate(
				re.program.programGetPrograms({}, re.custom.maxPages),
				re.models.PaginatedProgramFromJSON
			)
		).filter((p) => CONSTANTS.SUPPORTED_PROGRAMS.includes(p.abbr!))
	);

	let program = $state($storage.program ?? programs.find((p) => p.abbr === 'V5RC')?.id ?? 1);

	let seasons = $derived(
		await re.depaginate(
			re.season.seasonGetSeasons({ program: [program] }, re.custom.maxPages),
			re.models.PaginatedSeasonFromJSON
		)
	);

	let season = $state<number | null>(null);

	let teamStats = $state<TeamStats | null>(null);
	let upcomingEvents = $state<re.models.Event[]>([]);

	const formatEventDate = (event: re.models.Event) => {
		if (!event.start && !event.end) return 'Date TBD';
		if (event.start && !event.end) return event.start.toLocaleDateString();
		if (!event.start && event.end) return event.end.toLocaleDateString();

		if (event.start!.toDateString() === event.end!.toDateString()) {
			return event.start!.toLocaleDateString();
		}

		return `${event.start!.toLocaleDateString()} - ${event.end!.toLocaleDateString()}`;
	};

	$effect(() => {
		if (seasons.length === 0) {
			season = null;
			return;
		}

		season = seasons.reduce((a, b) => (a.end! > b.end! ? a : b)).id!;
	});

	$effect(() => {
		if (!$storage.team || !season) {
			teamStats = null;
			upcomingEvents = [];
			loading = false;
			return;
		}

		let cancelled = false;
		loading = true;
		error = null;

		(async () => {
			try {
				const candidates = await re.depaginate(
					re.team.teamGetTeams({
						number: [$storage.team!],
						program: [program]
					}),
					re.models.PaginatedTeamFromJSON
				);

				const targetTeam =
					candidates.find((t) => t.number.toLowerCase() === $storage.team!.toLowerCase()) ??
					candidates[0] ??
					null;

				if (!targetTeam) {
					if (!cancelled) {
						teamStats = null;
						upcomingEvents = [];
					}
					return;
				}

				const [details, matches, skills, events] = await Promise.all([
					re.team.teamGetTeam({ id: targetTeam.id }),
					re.depaginate(
						re.team.teamGetMatches({ id: targetTeam.id, season: [season] }, re.custom.maxPages),
						re.models.PaginatedMatchFromJSON
					),
					re.custom.cache
						.load('skills.leaderboard', season)
						.then(
							(leaderboard) => leaderboard.find((entry) => entry.team.id === targetTeam.id) ?? null
						),
					re.depaginate(
						re.team.teamGetEvents({ id: targetTeam.id, season: [season], start: new Date() }),
						re.models.PaginatedEventFromJSON
					)
				]);

				const matchTotals = matches.reduce(
					(acc, match) => {
						const alliance = match.alliances.find((a) =>
							a.teams.some((team) => team.team?.id === targetTeam.id)
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

				const totalMatches = matchTotals.wins + matchTotals.losses + matchTotals.ties;
				const winRate = totalMatches > 0 ? (matchTotals.wins / totalMatches) * 100 : 0;

				const now = new Date();
				now.setHours(0, 0, 0, 0);

				const futureEvents = events
					.filter((event) => {
						const compare = event.start ?? event.end;
						return compare ? compare >= now : false;
					})
					.sort((a, b) => {
						const aDate = (a.start ?? a.end)?.getTime() ?? Number.MAX_SAFE_INTEGER;
						const bDate = (b.start ?? b.end)?.getTime() ?? Number.MAX_SAFE_INTEGER;
						return aDate - bDate;
					});

				if (!cancelled) {
					teamStats = {
						team: details,
						winRate,
						wins: matchTotals.wins,
						losses: matchTotals.losses,
						ties: matchTotals.ties,
						skillsRank: skills?.rank ?? null,
						skillsScore: skills?.scores.score ?? null,
						driver: skills?.scores.driver ?? null,
						programming: skills?.scores.programming ?? null
					};

					upcomingEvents = futureEvents;
				}
			} catch (e) {
				if (!cancelled) {
					error = (e as Error).message;
				}
			} finally {
				if (!cancelled) {
					loading = false;
				}
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	let featuredEvent = $derived(upcomingEvents[0] ?? null);
	let futureEvents = $derived(upcomingEvents.slice(1));
</script>

<div class="h-[calc(100vh-48px)] overflow-y-auto px-3 pt-3 pb-6">
	<div class="space-y-5">
		<section class="space-y-2">
			<div class="text-sm font-medium tracking-wide text-muted-foreground">
				Upcoming Competition
			</div>
			{#if loading}
				<Card.Root class="gap-4 border-primary bg-card px-4 py-5">
					<Skeleton class="h-8 w-4/5" />
					<Skeleton class="h-5 w-2/3" />
					<Skeleton class="h-5 w-3/4" />
				</Card.Root>
			{:else if featuredEvent}
				<Card.Root
					class="cursor-pointer gap-3 border-primary bg-card px-4 py-5"
					onclick={() => goto(`/events/${featuredEvent.id}`)}
				>
					<div class="flex items-start gap-3">
						<div
							class="[display:-webkit-box] min-w-0 flex-1 overflow-hidden text-xl leading-7 font-semibold text-foreground [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
						>
							{featuredEvent.name}
						</div>
						<div class="rounded-full p-1 text-primary">
							<ArrowRight class="h-5 w-5" />
						</div>
					</div>
					<div class="space-y-1 text-muted-foreground">
						<div class="text-base text-foreground">
							{featuredEvent.location.city}, {featuredEvent.location.region}
						</div>
						<div class="text-base">
							{formatEventDate(featuredEvent)}
						</div>
					</div>
				</Card.Root>
			{:else}
				<Card.Root class="bg-card/70 px-4 py-4">
					<div class="text-muted-foreground">No upcoming competitions found.</div>
				</Card.Root>
			{/if}
		</section>

		<section class="space-y-2">
			<div class="text-sm font-medium tracking-wide text-muted-foreground">Team Snapshot</div>
			{#if loading}
				<Card.Root class="gap-4 px-4 py-5">
					<Skeleton class="h-8 w-28" />
					<Skeleton class="h-4 w-52" />
					<Skeleton class="h-12 w-full" />
				</Card.Root>
			{:else if teamStats}
				<Card.Root class="gap-4 px-4 py-5">
					<div>
						<div class="text-2xl font-semibold">{teamStats.team.number}</div>
						<div class="text-sm text-muted-foreground">
							{teamStats.team.teamName ?? teamStats.team.organization ?? 'Team profile'}
						</div>
					</div>

					<div class="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
						<div class="rounded-lg border p-3">
							<div class="mb-1 flex items-center gap-1 text-muted-foreground">
								<Trophy class="h-4 w-4" />
								Win Rate
							</div>
							<div class="text-xl font-semibold">{teamStats.winRate.toFixed(1)}%</div>
							<div class="text-xs text-muted-foreground">
								{teamStats.wins}-{teamStats.losses}-{teamStats.ties}
							</div>
						</div>

						<div class="rounded-lg border p-3">
							<div class="mb-1 flex items-center gap-1 text-muted-foreground">
								<Gamepad2 class="h-4 w-4" />
								Skills
							</div>
							<div class="text-xl font-semibold">
								{teamStats.skillsScore !== null ? teamStats.skillsScore : 'N/A'}
							</div>
							<div class="text-xs text-muted-foreground">
								Rank {teamStats.skillsRank !== null ? `#${teamStats.skillsRank}` : 'N/A'}
							</div>
						</div>
					</div>
				</Card.Root>
			{:else}
				<Card.Root class="bg-card/70 px-4 py-4">
					<div class="text-muted-foreground">
						Set a team during onboarding to see team stats and personalized upcoming events.
					</div>
				</Card.Root>
			{/if}
		</section>

		<section class="space-y-2">
			<div class="text-sm font-medium tracking-wide text-muted-foreground">Future Events</div>
			{#if loading}
				<div class="space-y-2">
					<Card.Root class="gap-2 px-4 py-4">
						<Skeleton class="h-5 w-4/5" />
						<Skeleton class="h-4 w-2/3" />
					</Card.Root>
					<Card.Root class="gap-2 px-4 py-4">
						<Skeleton class="h-5 w-3/4" />
						<Skeleton class="h-4 w-1/2" />
					</Card.Root>
				</div>
			{:else if futureEvents.length > 0}
				<div class="space-y-2">
					{#each futureEvents as event}
						<Card.Root
							class="cursor-pointer gap-3 px-4 py-4"
							onclick={() => goto(`/events/${event.id}`)}
						>
							<div class="flex items-center gap-3">
								<div class="min-w-0 flex-1">
									<div class="truncate text-base font-medium">{event.name}</div>
									<div class="text-sm text-muted-foreground">
										{event.location.city}, {event.location.region}
									</div>
									<div class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
										<CalendarDays class="h-3.5 w-3.5" />
										{formatEventDate(event)}
									</div>
								</div>
								<ArrowRight class="h-5 w-5 shrink-0 text-muted-foreground" />
							</div>
						</Card.Root>
					{/each}
				</div>
			{:else}
				<Card.Root class="bg-card/70 px-4 py-4">
					<div class="text-muted-foreground">No additional future events found.</div>
				</Card.Root>
			{/if}
		</section>

		{#if error}
			<Card.Root class="border-destructive px-4 py-4">
				<div class="text-destructive">{error}</div>
			</Card.Root>
		{/if}
	</div>
</div>
