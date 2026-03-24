<script lang="ts">
	import * as Drawer from '$lib/components/ui/drawer';
	import { re } from '$lib/robotevents';
	import TeamCard from '$lib/components/custom/cards/Team.svelte';
	import { Button } from '$lib/components/ui/button';

	type EventInfo = {
		name: string;
		locationLine1: string;
		locationLine2: string;
		date: string;
	};

	type TeamEntry = { id: number; number: string; name: string };

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

	interface Props {
		info: EventInfo;
		teams?: TeamEntry[];
		awards?: re.models.Award[];
		rankingRows?: RankingRow[];
		hasSchedule?: boolean;
		season?: number;
		onTeamSelect?: (row: RankingRow) => void;
	}

	let {
		info,
		teams = [],
		awards = [],
		rankingRows = [],
		hasSchedule = false,
		season = 0,
		onTeamSelect
	}: Props = $props();

	let isTeamsDrawerOpen = $state(false);
	let selectedTeamId = $state<number | null>(null);
	let isTeamCardDrawerOpen = $state(false);

	const handleTeamClick = (team: TeamEntry) => {
		const rankRow = rankingRows.find((r) => r.team.toLowerCase() === team.number.toLowerCase());
		if (hasSchedule && rankRow) {
			isTeamsDrawerOpen = false;
			onTeamSelect?.(rankRow);
		} else {
			selectedTeamId = team.id;
			isTeamCardDrawerOpen = true;
		}
	};
</script>

<div class="space-y-3 pb-4">
	<div class="rounded-3xl border border-primary p-4">
		<div class="mb-0.5 text-xs text-muted-foreground">Tournament Name</div>
		<div class="mb-2.5 text-xl leading-tight font-semibold">{info.name}</div>
		<div class="mb-4 text-sm text-primary">View on RobotEvents</div>

		<div class="mb-0.5 text-xs text-muted-foreground">Location</div>
		<div class="text-lg leading-tight">{info.locationLine1}</div>
		<div class="mb-4 text-base text-muted-foreground">{info.locationLine2}</div>

		<div class="mb-0.5 text-xs text-muted-foreground">Date</div>
		<div class="text-lg leading-tight">{info.date}</div>
	</div>

	<Button class="w-full" onclick={() => (isTeamsDrawerOpen = true)} variant="outline">
		Teams ({teams.length})
	</Button>

	{#if awards.length > 0}
		<div class="rounded-3xl border border-border bg-secondary/30 px-5 py-4">
			<div class="mb-3 text-base font-medium">Awards</div>
			<div class="">
				{#each awards as award}
					<div class="flex items-center gap-4 border-border py-1.5 not-last:border-b">
						<div class="flex flex-col items-start">
							<div class="text-base leading-tight font-semibold whitespace-nowrap">
								{award.title?.slice(0, award.title?.indexOf('(')).trim()}
							</div>
							{#if award.teamWinners && award.teamWinners.length > 0}
								<div class="mt-0.5 text-sm text-foreground">
									{award.teamWinners
										.map((w) => w.team?.name ?? '')
										.filter(Boolean)
										.join(', ')}
								</div>
							{:else if award.individualWinners && award.individualWinners.length > 0}
								<div class="mt-0.5 text-sm text-foreground">
									{award.individualWinners.join(', ')}
								</div>
							{/if}
						</div>
						{#if award.qualifications && award.qualifications.length > 0}
							<div class="ml-auto text-right text-sm text-muted-foreground">
								{#each award.qualifications as qual}
									<div>
										{qual
											.replaceAll('Event Region Championship', 'ERC')
											.replaceAll('World Championship', 'WC')}
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<div class="rounded-3xl border border-border bg-secondary/30 px-5 py-4 text-base font-medium">
			Awards
		</div>
	{/if}
</div>

<Drawer.Root bind:open={isTeamsDrawerOpen}>
	<Drawer.Content scrollable>
		<Drawer.Header class="px-0 pb-0 text-left">
			<Drawer.Title>Teams</Drawer.Title>
		</Drawer.Header>
		<div class="mt-3 space-y-1">
			{#each teams.sort( (a, b) => a.number.localeCompare( b.number, undefined, { numeric: true } ) ) as team}
				<button
					class="flex w-full items-center rounded-xl px-3 py-2.5 text-left hover:bg-muted/40"
					onclick={() => handleTeamClick(team)}
				>
					<span class="text-base font-medium">{team.number}</span>
					<span class="ml-3 text-sm text-muted-foreground">{team.name}</span>
				</button>
			{/each}
		</div>
	</Drawer.Content>
</Drawer.Root>

{#if selectedTeamId !== null}
	<Drawer.Root bind:open={isTeamCardDrawerOpen}>
		<Drawer.Content scrollable>
			<TeamCard id={selectedTeamId} {season} />
		</Drawer.Content>
	</Drawer.Root>
{/if}
