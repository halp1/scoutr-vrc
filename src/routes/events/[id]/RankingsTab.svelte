<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as ButtonGroup from '$lib/components/ui/button-group';

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
		rows: RankingRow[];
		onTeamSelect?: (row: RankingRow) => void;
	}

	let { rows, onTeamSelect = () => {} }: Props = $props();

	const metricTabs = [
		{ key: 'rank', label: 'Rank' },
		{ key: 'ap', label: 'AP' },
		{ key: 'sp', label: 'SP' },
		{ key: 'opr', label: 'OPR' }
	] as const;

	type MetricTab = (typeof metricTabs)[number]['key'];

	let metric = $state<MetricTab>('rank');

	const sortedRows = $derived(
		[...rows].sort((a, b) => {
			if (metric === 'rank') return a.rank - b.rank;
			if (metric === 'ap') return b.ap - a.ap;
			if (metric === 'sp') return b.sp - a.sp;
			return b.ap + b.sp - (a.ap + a.sp);
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
		<button
			type="button"
			onclick={() => onTeamSelect(row)}
			class="grid w-full grid-cols-[1fr_4fr_2fr] items-center gap-3 border-border/80 pb-3 text-left not-last:border-b"
		>
			<div class="text-2xl font-medium [font-variant-numeric:tabular-nums]">{row.rank}</div>

			<div class="min-w-0 text-left">
				<div class="truncate text-lg leading-none font-semibold">{row.team}</div>
				<div class="text-basee mt-1 truncate text-muted-foreground">{row.name}</div>
			</div>

			<div
				class="ml-auto grid w-36 grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm [font-variant-numeric:tabular-nums]"
			>
				<div class="flex flex-col items-center gap-2 text-left leading-tight">
					<div class="whitespace-nowrap">{row.wins}-{row.losses}-{row.ties}</div>
					<div class="whitespace-nowrap">{row.wp} WP</div>
				</div>

				<div class="h-14 w-px justify-self-center bg-border/80"></div>

				<div class="flex flex-col items-center gap-2 text-right leading-tight">
					<div class="whitespace-nowrap">{row.ap} AP</div>
					<div class="whitespace-nowrap">{row.sp} SP</div>
				</div>
			</div>
		</button>
	{/each}
</div>
