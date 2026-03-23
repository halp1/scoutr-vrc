<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as ButtonGroup from '$lib/components/ui/button-group';
	import { Check, Gamepad2, SlidersHorizontal, Terminal } from '@lucide/svelte';

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

	let { rows }: { rows: SkillsRow[] } = $props();

	const metricTabs = [
		{ key: 'rank', label: 'Rank' },
		{ key: 'driver', label: 'Driver' },
		{ key: 'auton', label: 'Auton' }
	] as const;

	type MetricTab = (typeof metricTabs)[number]['key'];

	let metric = $state<MetricTab>('rank');

	const sortedRows = $derived(
		[...rows].sort((a, b) => {
			if (metric === 'rank') return a.rank - b.rank;
			if (metric === 'driver') return b.driver - a.driver;
			return b.auton - a.auton;
		})
	);
</script>

<div class="space-y-3">
	<div class="flex items-center gap-2 overflow-x-auto pb-1">
		<ButtonGroup.Root class="mx-auto w-auto">
			{#each metricTabs as tab}
				<Button
					variant="outline"
					onclick={() => (metric = tab.key)}
					class={metric === tab.key ? ' text-primary' : 'text-foreground'}
				>
					{tab.label}
				</Button>
			{/each}
		</ButtonGroup.Root>
	</div>

	{#each sortedRows as row}
		<div
			class="grid grid-cols-[1fr_4fr_2fr] items-center gap-3 border-border/80 pb-3 not-last:border-b"
		>
			<div class="text-2xl font-medium [font-variant-numeric:tabular-nums]">{row.rank}</div>

			<div class="min-w-0 text-left">
				<div class="truncate text-lg leading-none font-semibold">{row.team}</div>
				<div class="mt-1 truncate text-base text-muted-foreground">{row.name}</div>
			</div>

			<div
				class="ml-auto grid w-36 grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm [font-variant-numeric:tabular-nums]"
			>
				<div class="flex flex-col items-center gap-2 text-left leading-tight">
					<div class="whitespace-nowrap">Rank {row.rank}</div>
					<div class="whitespace-nowrap">{row.points} pts</div>
				</div>

				<div class="h-14 w-px justify-self-center bg-border/80"></div>

				<div class="flex flex-col items-end gap-2 text-right leading-tight">
					<div class="flex items-center justify-end gap-1 whitespace-nowrap">
						<span>{row.driver}</span>
						<Gamepad2 class="ml-0.5 h-3.5 w-3.5" />
						<span class="ml-2">{row.driverRuns}</span>
					</div>
					<div class="flex items-center justify-end gap-1 whitespace-nowrap">
						<span>{row.auton}</span>
						<Terminal class="-mb-0.5 ml-0.5 h-3.5 w-3.5" />
						<span class="ml-2">{row.autonRuns}</span>
					</div>
				</div>
			</div>
		</div>
	{/each}
</div>
