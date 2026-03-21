<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';

	import * as InputGroup from '$lib/components/ui/input-group';
	import * as Select from '$lib/components/ui/select';
	import { CONSTANTS } from '$lib/const';
	import { re } from '$lib/robotevents';
	import { storage } from '$lib/state';
	import {
		ArrowRight,
		ChevronDown,
		ChevronLeft,
		ChevronRight,
		Funnel,
		Search
	} from '@lucide/svelte';

	import * as Drawer from '$lib/components/ui/drawer';

	import * as Command from '$lib/components/ui/command';
	import * as Popover from '$lib/components/ui/popover';
	import { untrack } from 'svelte';
	import { Team, Error as ErrorCard } from '$lib/components/custom/cards';

	let error = $state<string | null>(null);

	let query = $state({
		value: '',
		type: 'all' as 'all' | 'teams' | 'events',
		filters: {
			region: ''
		}
	});

	let regionSelector = $state({
		open: false,
		triggerRef: null as HTMLElement | null
	});

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

	// svelte-ignore state_referenced_locally
	let season = $state(seasons.reduce((a, b) => (a.end! > b.end! ? a : b)).id!);

	// svelte-ignore state_referenced_locally
	let regions = $derived(await re.custom.events.loadEventRegions(season));

	$effect(() => {
		season = seasons.reduce((a, b) => (a.end! > b.end! ? a : b)).id!;
	});

	let rawResults = $state<{
		teams: re.models.Team[] | null;
		events: Awaited<ReturnType<typeof re.custom.events.getEvents>> | null;
	} | null>(null);

	let eventsPage = $state(1);

	$effect(() => {
		error = null;
		if (query.value.length < 3) {
			rawResults = null;
			return;
		}

		let cancelled = false;

		(async () => {
			const tmp = {
				teams:
					query.type === 'all' || query.type === 'teams'
						? re.depaginate(
								re.team.teamGetTeams({
									number: [query.value],
									program: [program]
								}),
								re.models.PaginatedTeamFromJSON
							)
						: null,
				events:
					query.type === 'all' || query.type === 'events'
						? re.custom.events.getEvents(
								{
									name: query.value,
									season,
									eventRegion: query.filters.region ? parseInt(query.filters.region) : undefined
								},
								() => cancelled
							)
						: null
			};

			eventsPage = 1;

			try {
				const teamRes = await tmp.teams;
				if (!cancelled) {
					if (!rawResults) rawResults = { teams: null, events: null };
					rawResults.teams = teamRes;
				}
			} catch (e) {
				if (!cancelled) {
					error = (e as Error).message;
				}
				return;
			}

			try {
				const eventRes = await tmp.events;

				if (!cancelled) {
					if (!rawResults) rawResults = { teams: null, events: null };
					rawResults.events = eventRes;
				}
			} catch (e) {
				if (!cancelled && (rawResults?.teams?.length ?? 0) === 0) {
					error = (e as Error).message;
				}
				return;
			}
		})();

		return () => {
			cancelled = true;
		};
	});

	$effect(() => {
		let cancelled = false;

		if (rawResults?.events?.pages) {
			(async () => {
				const raw = untrack(() => rawResults);

				const newEvents = await raw?.events?.loadPage(eventsPage);

				if (!cancelled) return;

				rawResults = {
					...raw!,
					events: {
						...raw!.events!,
						events: newEvents!
					}
				};
			})();
		}

		return () => {
			cancelled = true;
		};
	});
</script>

<div class="flex h-12 items-center gap-2 px-1.5">
	<InputGroup.Root>
		<InputGroup.Input placeholder="Search..." bind:value={query.value} />
		<InputGroup.Addon><Search /></InputGroup.Addon>
	</InputGroup.Root>
	<Select.Root type="single" bind:value={query.type}>
		<Select.Trigger>{query.type.charAt(0).toUpperCase() + query.type.slice(1)}</Select.Trigger>
		<Select.Content class="mr-3">
			<Select.Item value="all">All</Select.Item>
			<Select.Item value="events">Events</Select.Item>
			<Select.Item value="teams">Teams</Select.Item>
		</Select.Content>
	</Select.Root>

	<Drawer.Root>
		<Drawer.Trigger>
			<Button variant="outline" size="icon" class="cursor-pointer">
				<Funnel />
			</Button>
		</Drawer.Trigger>
		<Drawer.Content class="px-3">
			<Drawer.Header>
				<Drawer.Title class="text-center text-xl">Search Filters</Drawer.Title>
			</Drawer.Header>
			<Popover.Root bind:open={regionSelector.open}>
				<Popover.Trigger ref={regionSelector.triggerRef} class="w-full">
					{#snippet child({ props })}
						<Button
							{...props}
							variant="outline"
							class="w-50 justify-between"
							role="combobox"
							aria-expanded={regionSelector.open}
						>
							{query.filters.region
								? regions.find((r) => r.id === parseInt(query.filters.region))?.name
								: 'All Regions'}
							<ChevronDown class="opacity-50" />
						</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="ml-3 w-auto p-0">
					<Command.Root class="rounded-md border bg-popover text-popover-foreground shadow-md">
						<Command.Input placeholder="Search regions..." />

						<Command.List>
							<Command.Item
								value="All Regions"
								onSelect={() => {
									query.filters.region = '';
									regionSelector.open = false;
								}}
							>
								All Regions
							</Command.Item>
							{#each regions as region}
								<Command.Item
									value={region.name}
									onSelect={() => {
										query.filters.region = region.id!.toString();
										regionSelector.open = false;
									}}
								>
									{region.name}
								</Command.Item>
							{/each}
						</Command.List>
					</Command.Root>
				</Popover.Content>
			</Popover.Root>
			<Drawer.Footer class="h-2" />
		</Drawer.Content>
	</Drawer.Root>
</div>

<div class="h-[calc(100%-48px)] w-full overflow-y-auto pt-2">
	{#if rawResults}
		{#if rawResults.teams && rawResults.teams.length > 0}
			{#each rawResults.teams as team}
				<Team id={team.id!} {season} />
			{/each}
		{:else if rawResults.events?.events && rawResults.events.events.length > 0}
			<div class="mt-1 flex items-center gap-2 px-2">
				<div class="mb-0.5 text-sm text-muted-foreground">Events</div>
				<div class="h-0.5 flex-1 rounded-full bg-muted-foreground"></div>
				<button>
					<ChevronLeft class="h-4 w-4 cursor-pointer" />
				</button>
				<div class="text-sm text-muted-foreground">
					{eventsPage}/{rawResults.events.pages}
				</div>
				<button>
					<ChevronRight class="h-4 w-4 cursor-pointer" />
				</button>
			</div>
			<div>
				{#each rawResults.events.events as event}
					<div class="mx-2 flex items-center border-muted-foreground pb-2 not-first:border-t-2">
						<div class="flex-1">
							<div class="text-ellipsis whitespace-nowrap">{event.name}</div>
							<div class="text-xs">
								{event.location?.city}, {event.location?.state} |
								{#if event.date.length === 1}
									{event.date[0].toLocaleDateString()}
								{:else if event.date.length === 2}
									{event.date[0].toLocaleDateString()} - {event.date[1].toLocaleDateString()}
								{/if}
							</div>
						</div>
						<button>
							<ArrowRight class="ml-3 h-7 w-7 cursor-pointer" size="sm" />
						</button>
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-gray-500">
				No {query.type === 'all' ? 'teams or events' : query.type} found
			</div>
		{/if}
	{/if}

	{#if error}
		<ErrorCard message={error} class="mx-3" />
	{/if}
</div>
