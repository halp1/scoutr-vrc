<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Drawer from '$lib/components/ui/drawer';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Gamepad2, Terminal, Trophy } from '@lucide/svelte';
	import MatchRow from './MatchRow.svelte';

	type TeamSummary = {
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

	type TeamSkills = {
		rank: number;
		points: number;
		driver: number;
		driverRuns: number;
		auton: number;
		autonRuns: number;
	};

	type TeamMatch = {
		match: string;
		time: string;
		score: string;
		red: string[];
		blue: string[];
	};

	interface Props {
		open?: boolean;
		team: TeamSummary | null;
		skills: TeamSkills | null;
		matches: TeamMatch[];
		opr?: number | null;
		dpr?: number | null;
		ccwm?: number | null;
	}

	let {
		open = $bindable(false),
		team,
		skills,
		matches,
		opr = null,
		dpr = null,
		ccwm = null
	}: Props = $props();

	let awps = $derived((team?.wp ?? 0) - ((team?.wins ?? 0) * 2 + (team?.ties ?? 0) * 2));
	let awpHitRate = $derived(awps / ((team?.wins ?? 0) + (team?.ties ?? 0) + (team?.losses ?? 0)));

	const fmtRating = (value: number | null | undefined) => (value == null ? '—' : value.toFixed(1));
</script>

<Drawer.Root bind:open>
	<Drawer.Content scrollable>
		{#if team}
			<div class="space-y-4">
				<Drawer.Header class="px-0 pb-0 text-left">
					<Drawer.Title class="text-3xl leading-none tracking-tight">{team.team}</Drawer.Title>
					<Drawer.Description class="mt-1 text-base text-muted-foreground">
						{team.name || 'No team name available'}
					</Drawer.Description>
				</Drawer.Header>

				<Card.Root class="p-4">
					<div class="grid grid-cols-[auto_1fr] items-center gap-4 border-b border-border pb-3">
						<div>
							<div class="text-3xl leading-none font-medium [font-variant-numeric:tabular-nums]">
								{team.rank}
							</div>
							<div class="mt-2 text-sm text-muted-foreground">Rank</div>
						</div>
						<div
							class="ml-5 grid grid-cols-4 gap-x-8 gap-y-1 text-right [font-variant-numeric:tabular-nums]"
						>
							<div class=""></div>
							<div>
								<div class="text-xl leading-none">{team.wp}</div>
								<div class="mt-1 text-xs text-muted-foreground">WP</div>
							</div>
							<div>
								<div class="text-xl leading-none">{team.ap}</div>
								<div class="mt-1 text-xs text-muted-foreground">AP</div>
							</div>
							<div>
								<div class="text-xl leading-none">{team.sp}</div>
								<div class="mt-1 text-xs text-muted-foreground">SP</div>
							</div>

							<div></div>
							<div class="col-span-3 flex items-center">
								<div class="relative mx-4 mt-1 h-1 flex-1 overflow-hidden rounded-full">
									<div
										class="absolute top-0 left-0 h-full bg-green-300"
										style="width: {(team.wins / (team.wins + team.losses + team.ties)) * 100}%"
									></div>
									<div
										class="absolute top-0 h-full bg-yellow-300"
										style="left: {(team.wins / (team.wins + team.losses + team.ties)) *
											100}%; width: {(team.ties / (team.wins + team.losses + team.ties)) * 100}%"
									></div>
									<div
										class="absolute top-0 right-0 h-full bg-red-300"
										style="width: {(team.losses / (team.wins + team.losses + team.ties)) * 100}%"
									></div>
								</div>
								<div>{team.wins}-{team.losses}-{team.ties}</div>
							</div>
						</div>
					</div>
					<div class="-mt-2 flex items-center">
						<div class="grid grid-cols-2">
							{#each [[awps.toFixed(0), 'AWP'], [(awpHitRate * 100).toFixed(1) + '%', 'AWP %']] as const as item}
								<div>
									<div class="text-base leading-none">{item[0]}</div>
									<div class="mt-1 text-xs text-muted-foreground">{item[1]}</div>
								</div>
							{/each}
						</div>

						<div class="ml-auto grid grid-cols-3">
							{#each [[fmtRating(opr), 'OPR'], [fmtRating(dpr), 'DPR'], [fmtRating(ccwm), 'CCWM']] as item}
								<div>
									<div class="text-base leading-none">{item[0]}</div>
									<div class="mt-1 text-xs text-muted-foreground">{item[1]}</div>
								</div>
							{/each}
						</div>
					</div>
				</Card.Root>

				<Card.Root class="relative mt-5 flex flex-row items-center gap-0 py-4">
					<div class="ml-4">
						<Card.Title class="text-3xl">
							{skills?.points ?? 0}
						</Card.Title>
						<Card.Description class="whitespace-nowrap">Skills score</Card.Description>
					</div>
					<Card.Content class="ml-auto flex gap-4 px-4">
						{#each [[Trophy, 'Rank', skills?.rank ?? 0], [Gamepad2, 'Driver', skills?.driver ?? 0], [Terminal, 'Auto', skills?.auton ?? 0]] as const as [Icon, label, value]}
							<div class="flex flex-col items-end">
								<div class="flex items-center gap-2">
									<Icon class="h-4 w-4 {Icon === Terminal ? '-mb-1' : ''}" />
									{value}
								</div>
								<div class="text-xs text-muted-foreground">{label}</div>
							</div>
						{/each}
					</Card.Content>
				</Card.Root>

				<div>
					<h3 class="mb-3 text-xl leading-none font-medium tracking-tight">Matches</h3>
					<div class="space-y-2">
						{#if matches.length === 0}
							<div
								class="rounded-2xl border border-border bg-card px-4 py-5 text-sm text-muted-foreground"
							>
								No matches found for this team in the selected division.
							</div>
						{:else}
							{#each matches as row}
								<MatchRow {row} highlightTeam={team.team} />
							{/each}
						{/if}
					</div>
				</div>
			</div>
		{/if}
	</Drawer.Content>
</Drawer.Root>
