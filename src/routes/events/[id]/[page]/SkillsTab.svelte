<script lang="ts">
	type SkillsRow = {
		rank: number;
		team: string;
		name: string;
		points: number;
		driver: number;
		auton: number;
	};

	let { rows }: { rows: SkillsRow[] } = $props();
</script>

<div class="space-y-3">
	<div class="flex gap-2 overflow-x-auto pb-1">
		<div
			class="rounded-2xl border border-primary/50 bg-primary/20 px-4 py-1.5 text-lg text-foreground"
		>
			Rank
		</div>
		<div class="rounded-2xl border border-primary/50 px-4 py-1.5 text-lg text-foreground">
			Driver
		</div>
		<div class="rounded-2xl border border-primary/50 px-4 py-1.5 text-lg text-foreground">
			Auton
		</div>
	</div>
	{#each rows as row}
		<div class="grid grid-cols-[1fr,8rem,7rem] items-center border-b border-border py-3">
			<div>
				<div class="text-5xl font-semibold">{row.team}</div>
				<div class="text-lg text-muted-foreground">{row.name}</div>
			</div>
			<div class="text-2xl">
				<div>Rank {row.rank}</div>
				<div class="text-muted-foreground">{row.points} pts</div>
			</div>
			<div class="text-right text-2xl">
				<div>{row.driver}</div>
				<div>{row.auton}</div>
			</div>
		</div>
	{/each}
</div>
