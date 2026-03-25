<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { re } from '$lib/robotevents';
	import { storage } from '$lib/state';
	import { ArrowRight, Star } from '@lucide/svelte';

	let loading = $state(false);
	let teams = $state<re.models.Team[]>([]);
	let events = $state<re.models.Event[]>([]);

	$effect(() => {
		const favoriteTeams = $storage.favorites.teams;
		const favoriteEvents = $storage.favorites.events;

		if (favoriteTeams.length === 0 && favoriteEvents.length === 0) {
			teams = [];
			events = [];
			return;
		}

		let cancelled = false;
		loading = true;

		(async () => {
			const [teamResults, eventResults] = await Promise.allSettled([
				Promise.all(favoriteTeams.map((id) => re.team.teamGetTeam({ id }))),
				Promise.all(favoriteEvents.map((id) => re.events.eventGetEvent({ id })))
			]);

			if (cancelled) return;

			if (teamResults.status === 'fulfilled') teams = teamResults.value;
			if (eventResults.status === 'fulfilled') events = eventResults.value;
			loading = false;
		})();

		return () => {
			cancelled = true;
		};
	});

	const formatEventDate = (event: re.models.Event) => {
		if (!event.start && !event.end) return 'Date TBD';
		if (event.start && event.end) {
			if (event.start.toDateString() === event.end.toDateString())
				return event.start.toLocaleDateString();
			return `${event.start.toLocaleDateString()} - ${event.end.toLocaleDateString()}`;
		}
		return (event.start ?? event.end!).toLocaleDateString();
	};

	let isEmpty = $derived(
		$storage.favorites.teams.length === 0 && $storage.favorites.events.length === 0
	);
</script>

<div class="h-[calc(100vh-48px)] overflow-y-auto px-3 pt-3 pb-6">
	<div class="mb-4 text-2xl font-semibold">Favorites</div>

	{#if loading}
		<div class="space-y-2">
			<Skeleton class="h-16 w-full rounded-xl" />
			<Skeleton class="h-16 w-full rounded-xl" />
		</div>
	{:else if isEmpty}
		<div class="flex flex-col items-center gap-2 pt-16">
			<Star class="h-8 w-8 text-muted-foreground" />
			<div class="text-lg font-medium">No favorites yet</div>
			<div class="text-center text-sm text-muted-foreground">
				Save teams and events to find them here.
			</div>
		</div>
	{:else}
		{#if events.length > 0}
			<div class="mb-4">
				<div class="mb-2 text-sm font-medium tracking-wide text-muted-foreground uppercase">
					Events
				</div>
				<div class="space-y-2">
					{#each events as event}
						<Card.Root
							class="cursor-pointer gap-2 px-4 py-3"
							onclick={() => goto(`/events/${event.id}`)}
						>
							<div class="flex items-center gap-3">
								<div class="min-w-0 flex-1">
									<div class="truncate font-medium">{event.name}</div>
									<div class="text-sm text-muted-foreground">
										{event.location?.city}, {event.location?.region}
									</div>
									<div class="text-xs text-muted-foreground">{formatEventDate(event)}</div>
								</div>
								<ArrowRight class="h-5 w-5 shrink-0 text-muted-foreground" />
							</div>
						</Card.Root>
					{/each}
				</div>
			</div>
		{/if}

		{#if teams.length > 0}
			<div class="mb-4">
				<div class="mb-2 text-sm font-medium tracking-wide text-muted-foreground uppercase">
					Teams
				</div>
				<div class="space-y-2">
					{#each teams as team}
						<Card.Root class="gap-1 px-4 py-3">
							<div class="text-xl font-semibold">{team.number}</div>
							<div class="text-sm text-muted-foreground">
								{team.teamName ?? team.organization ?? ''}
							</div>
						</Card.Root>
					{/each}
				</div>
			</div>
		{/if}
	{/if}
</div>
