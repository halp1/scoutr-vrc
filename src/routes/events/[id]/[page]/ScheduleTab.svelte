<script lang="ts">
	type ScheduleRow = {
		match: string;
		time: string;
		score: string;
		red: string[];
		blue: string[];
	};

	let { rows }: { rows: ScheduleRow[] } = $props();
</script>

<div class="space-y-1">
	<div class="mb-2 text-2xl font-medium">Qualifications</div>
	{#each rows as row}
		<div class="border-b border-border py-3">
			<div class="grid grid-cols-[5rem,1fr,1fr] items-center gap-3">
				<div class="text-7xl leading-none font-medium text-primary/45">{row.match}</div>
				<div class="space-y-2 text-muted-foreground">
					<div class="text-2xl">{row.time}</div>
					<div class="text-3xl text-foreground">{row.score}</div>
				</div>
				<div class="grid grid-cols-2 gap-4 text-right text-2xl">
					<div class="space-y-1 text-primary/70">
						{#each row.red as team}
							<div>{team}</div>
						{/each}
					</div>
					<div class="space-y-1 text-foreground/90">
						{#each row.blue as team}
							<div>{team}</div>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/each}
</div>
