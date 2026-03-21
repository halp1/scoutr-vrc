<script lang="ts">
	type RankingRow = {
		rank: number;
		team: string;
		name: string;
		record: string;
		wp: number;
		ap: number;
		sp: number;
	};

	let { rows }: { rows: RankingRow[] } = $props();
</script>

<div class="space-y-3">
	<div class="flex gap-2 overflow-x-auto pb-1">
		<div
			class="rounded-2xl border border-primary/50 bg-primary/20 px-4 py-1.5 text-lg text-foreground"
		>
			Rank
		</div>
		<div class="rounded-2xl border border-primary/50 px-4 py-1.5 text-lg text-foreground">AP</div>
		<div class="rounded-2xl border border-primary/50 px-4 py-1.5 text-lg text-foreground">SP</div>
		<div class="rounded-2xl border border-primary/50 px-4 py-1.5 text-lg text-foreground">OPR</div>
	</div>
	{#each rows as row}
		<div class="grid grid-cols-[3rem,1fr,8rem,6rem] items-center border-b border-border py-3">
			<div class="text-5xl font-medium">{row.rank}</div>
			<div>
				<div class="text-5xl font-semibold">{row.team}</div>
				<div class="text-lg text-muted-foreground">{row.name}</div>
			</div>
			<div class="text-right text-2xl">
				<div>{row.record}</div>
				<div class="text-muted-foreground">{row.wp} WP</div>
			</div>
			<div class="text-right text-2xl">
				<div>{row.ap} AP</div>
				<div>{row.sp} SP</div>
			</div>
		</div>
	{/each}
</div>
