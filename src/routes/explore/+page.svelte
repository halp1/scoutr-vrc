<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as InputGroup from '$lib/components/ui/input-group';
	import * as Drawer from '$lib/components/ui/drawer';
	import { Calendar } from '$lib/components/ui/calendar';
	import { CalendarDate, getLocalTimeZone, today, type DateValue } from '@internationalized/date';
	import { ArrowRight, ChevronLeft, ChevronRight, Funnel, Search } from '@lucide/svelte';
	import { CONSTANTS } from '$lib/const';
	import { re } from '$lib/robotevents';
	import { storage } from '$lib/state';
	import { Team, Error as ErrorCard } from '$lib/components/custom/cards';

	type SearchType = 'all' | 'teams' | 'events';
	type EventDate = `${number}${number}${number}${number}-${number}${number}-${number}${number}`;

	const tz = getLocalTimeZone();
	const now = today(tz);

	const urlParams = new URLSearchParams(location.search);

	const parseUrlDate = (key: string, fallback: DateValue): DateValue => {
		const s = urlParams.get(key);
		if (!s) return fallback;
		const [y, m, d] = s.split('-').map(Number);
		return new CalendarDate(y, m, d);
	};

	const toEventDate = (v: DateValue): EventDate =>
		`${v.year}-${String(v.month).padStart(2, '0')}-${String(v.day).padStart(2, '0')}` as EventDate;

	let query = $state(urlParams.get('q') ?? '');
	let type = $state<SearchType>((urlParams.get('type') as SearchType) ?? 'all');
	let region = $state(urlParams.get('region') ?? '');
	let fromDate = $state<DateValue>(parseUrlDate('from', now.subtract({ years: 1 })));
	let toDate = $state<DateValue>(parseUrlDate('to', now.add({ years: 1 })));

	let fromPickerOpen = $state(false);
	let toPickerOpen = $state(false);

	let season = $state<number | null>(null);
	let regions = $state<re.custom.events.EventRegion[]>([]);

	$effect(() => {
		const storedProgramId = $storage.program;
		let cancelled = false;

		(async () => {
			const progs = (
				await re.depaginate(
					re.program.programGetPrograms({}, re.custom.maxPages),
					re.models.PaginatedProgramFromJSON
				)
			).filter((p) => CONSTANTS.SUPPORTED_PROGRAMS.includes(p.abbr!));

			if (cancelled) return;

			const prog =
				progs.find((p) => p.id === storedProgramId) ??
				progs.find((p) => p.abbr === 'V5RC') ??
				progs[0];

			if (!prog || cancelled) return;

			const seasons = await re.depaginate(
				re.season.seasonGetSeasons({ program: [prog.id!] }, re.custom.maxPages),
				re.models.PaginatedSeasonFromJSON
			);

			if (cancelled || seasons.length === 0) return;

			const latest = seasons.reduce((a, b) => (a.end! > b.end! ? a : b));
			if (cancelled) return;
			season = latest.id!;

			const regs = await re.custom.events.loadEventRegions(latest.id!);
			if (!cancelled) regions = regs;
		})();

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		const params = new URLSearchParams();
		if (query) params.set('q', query);
		if (type !== 'all') params.set('type', type);
		if (region) params.set('region', region);
		params.set('from', toEventDate(fromDate));
		params.set('to', toEventDate(toDate));
		history.replaceState(history.state, '', `?${params}`);
	});

	let error = $state<string | null>(null);
	let teams = $state<re.models.Team[] | null>(null);
	let eventResults = $state<Awaited<ReturnType<typeof re.custom.events.getEvents>> | null>(null);
	let eventsPage = $state(1);
	let teamsLoading = $state(false);
	let eventsLoading = $state(false);

	let isLoading = $derived(teamsLoading || eventsLoading);
	let hasResults = $derived((teams?.length ?? 0) + (eventResults?.events?.length ?? 0) > 0);

	$effect(() => {
		const q = query;
		const t = type;
		const r = region;
		const from = toEventDate(fromDate);
		const to = toEventDate(toDate);
		const s = season;

		error = null;

		if (q.length < 3 || s === null) {
			teams = null;
			eventResults = null;
			teamsLoading = false;
			eventsLoading = false;
			return;
		}

		let cancelled = false;
		const debounceId = setTimeout(() => {
			if (cancelled) return;

			if (t === 'all' || t === 'teams') {
				teamsLoading = true;
				re.depaginate(
					re.team.teamGetTeams({ number: [q], program: [] }),
					re.models.PaginatedTeamFromJSON
				)
					.then((res) => {
						if (cancelled) return;
						teams = res;
						teamsLoading = false;
					})
					.catch((e) => {
						if (cancelled) return;
						error = (e as Error).message;
						teams = null;
						teamsLoading = false;
					});
			} else {
				teams = null;
			}

			if (t === 'all' || t === 'events') {
				eventsLoading = true;
				eventsPage = 1;
				re.custom.events
					.getEvents(
						{
							name: q,
							season: s,
							eventRegion: r ? parseInt(r) : undefined,
							from: from,
							to: to
						},
						() => cancelled
					)
					.then((res) => {
						if (cancelled) return;
						eventResults = res;
						eventsLoading = false;
					})
					.catch((e) => {
						if (cancelled) return;
						if ((teams?.length ?? 0) === 0) error = (e as Error).message;
						eventResults = null;
						eventsLoading = false;
					});
			} else {
				eventResults = null;
			}
		}, 500);

		return () => {
			cancelled = true;
			clearTimeout(debounceId);
		};
	});

	const loadPage = async (page: number) => {
		if (!eventResults || page < 1 || page > eventResults.pages) return;
		eventsLoading = true;
		try {
			const newEvents = await eventResults.loadPage(page);
			eventsPage = page;
			eventResults = { ...eventResults, events: newEvents };
		} catch {
		} finally {
			eventsLoading = false;
		}
	};
</script>

<div class="flex h-12 items-center gap-2 px-1.5">
	<InputGroup.Root>
		<InputGroup.Input placeholder="Search teams or events..." bind:value={query} />
		<InputGroup.Addon><Search /></InputGroup.Addon>
	</InputGroup.Root>

	<Drawer.Root>
		<Drawer.Trigger>
			<Button
				variant="outline"
				size="icon"
				class="cursor-pointer {region ? 'border-primary text-primary' : ''}"
			>
				<Funnel />
			</Button>
		</Drawer.Trigger>
		<Drawer.Content scrollable>
			<Drawer.Header>
				<Drawer.Title class="text-center text-xl">Search Filters</Drawer.Title>
			</Drawer.Header>

			<div class="px-4 pb-6">
				<div class="mb-1 text-sm text-muted-foreground">Region</div>
				<div class="flex gap-2 overflow-x-auto pb-2">
					<button
						class="shrink-0 rounded-full border px-3 py-1 text-sm {!region
							? 'border-primary bg-primary/20 text-primary'
							: 'border-border text-muted-foreground'}"
						onclick={() => (region = '')}
					>
						All
					</button>
					{#each regions as r}
						<button
							class="shrink-0 rounded-full border px-3 py-1 text-sm {region === String(r.id)
								? 'border-primary bg-primary/20 text-primary'
								: 'border-border text-muted-foreground'}"
							onclick={() => (region = String(r.id))}
						>
							{r.name}
						</button>
					{/each}
				</div>

				<div class="mt-4">
					<div class="mb-2 text-sm text-muted-foreground">Date Range</div>
					<div class="flex items-center gap-2">
						<div class="flex-1">
							<button
								class="flex w-full items-center justify-between rounded-md border border-input px-3 py-2 text-left text-sm"
								onclick={() => {
									fromPickerOpen = !fromPickerOpen;
									toPickerOpen = false;
								}}
							>
								{fromDate.toDate(tz).toLocaleDateString()}
								<span class="text-xs text-muted-foreground">From</span>
							</button>
							{#if fromPickerOpen}
								<div class="mt-1">
									<Calendar
										type="single"
										bind:value={fromDate}
										captionLayout="dropdown"
										onValueChange={() => {
											fromPickerOpen = false;
										}}
									/>
								</div>
							{/if}
						</div>
						<span class="text-muted-foreground">–</span>
						<div class="flex-1">
							<button
								class="flex w-full items-center justify-between rounded-md border border-input px-3 py-2 text-left text-sm"
								onclick={() => {
									toPickerOpen = !toPickerOpen;
									fromPickerOpen = false;
								}}
							>
								{toDate.toDate(tz).toLocaleDateString()}
								<span class="text-xs text-muted-foreground">To</span>
							</button>
							{#if toPickerOpen}
								<div class="mt-1">
									<Calendar
										type="single"
										bind:value={toDate}
										captionLayout="dropdown"
										onValueChange={() => {
											toPickerOpen = false;
										}}
									/>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</Drawer.Content>
	</Drawer.Root>
</div>

<div class="flex gap-2 px-1.5 pt-2 pb-1">
	{#each ['all', 'teams', 'events'] as const as t}
		<button
			class="rounded-full border px-3 py-1 text-sm {type === t
				? 'border-primary bg-primary/20 text-primary'
				: 'border-border text-muted-foreground'}"
			onclick={() => (type = t)}
		>
			{t.charAt(0).toUpperCase() + t.slice(1)}
		</button>
	{/each}
</div>

<div class="h-[calc(100%-88px)] w-full overflow-y-auto pt-1">
	{#if season === null}
		<div class="px-3 text-sm text-muted-foreground">Loading...</div>
	{:else if isLoading && !hasResults}
		<div class="px-3 text-sm text-muted-foreground">Searching...</div>
	{:else if query.length >= 3 && !isLoading && !hasResults && !error}
		<div class="px-3 text-sm text-muted-foreground">No results for "{query}"</div>
	{/if}

	{#if teams !== null && teams.length > 0 && (type === 'all' || type === 'teams')}
		<div class="mt-1 flex items-center gap-2 px-2 pb-1">
			<div class="text-sm text-muted-foreground">Teams</div>
			<div class="h-px flex-1 rounded-full bg-muted-foreground/30"></div>
		</div>
		{#each teams as team}
			<Team id={team.id!} season={season!} />
		{/each}
	{/if}

	{#if eventResults?.events && eventResults.events.length > 0 && (type === 'all' || type === 'events')}
		<div class="mt-2 flex items-center gap-2 px-2">
			<div class="text-sm text-muted-foreground">Events</div>
			<div class="h-px flex-1 rounded-full bg-muted-foreground/30"></div>
			{#if eventResults.pages > 1}
				<button
					class="cursor-pointer disabled:opacity-40"
					disabled={eventsPage === 1 || eventsLoading}
					onclick={() => loadPage(eventsPage - 1)}
				>
					<ChevronLeft class="h-4 w-4" />
				</button>
				<div class="text-sm text-muted-foreground">{eventsPage}/{eventResults.pages}</div>
				<button
					class="cursor-pointer disabled:opacity-40"
					disabled={eventsPage === eventResults.pages || eventsLoading}
					onclick={() => loadPage(eventsPage + 1)}
				>
					<ChevronRight class="h-4 w-4" />
				</button>
			{/if}
		</div>
		<div>
			{#each eventResults.events as event}
				<button
					class="mx-2 flex w-[calc(100%-1rem)] min-w-0 items-center border-muted-foreground/20 pb-2 text-left not-first:border-t"
					onclick={async () => {
						const results = await re.depaginate(
							re.events.eventGetEvents({ sku: [event.sku] }),
							re.models.PaginatedEventFromJSON
						);
						const id = results[0]?.id;
						if (id) goto(`/events/${id}`);
					}}
				>
					<div class="min-w-0 flex-1 py-2">
						<div class="overflow-hidden text-ellipsis whitespace-nowrap">{event.name}</div>
						<div class="text-xs text-muted-foreground">
							{event.location?.city}, {event.location?.state}
							{#if event.date.length >= 1}
								| {event.date[0].toLocaleDateString()}
							{/if}
						</div>
					</div>
					<ArrowRight class="ml-3 size-5 shrink-0 text-muted-foreground" />
				</button>
			{/each}
		</div>
	{/if}

	{#if error}
		<ErrorCard message={error} class="mx-3 mt-2" />
	{/if}
</div>
