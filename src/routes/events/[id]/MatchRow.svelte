<script lang="ts">
	type MatchRowData = {
		match: string;
		time: string;
		score: string;
		red: string[];
		blue: string[];
	};

	interface Props {
		row: MatchRowData;
		highlightTeam?: string | null;
	}

	let { row, highlightTeam = null }: Props = $props();

	const parseScore = (score: string): [number, number] => {
		const [leftRaw = '0', rightRaw = '0'] = score.split('-');
		const left = Number.parseInt(leftRaw.trim(), 10);
		const right = Number.parseInt(rightRaw.trim(), 10);
		return [Number.isNaN(left) ? 0 : left, Number.isNaN(right) ? 0 : right];
	};

	const winner = (score: string): 'red' | 'blue' | 'tie' => {
		const [left, right] = parseScore(score);
		if (left > right) return 'red';
		if (left < right) return 'blue';
		return 'tie';
	};

	const normalizeTeam = (value: string) => value.trim().toLowerCase();
	const isHighlighted = (team: string) =>
		highlightTeam !== null && normalizeTeam(team) === normalizeTeam(highlightTeam);

	let highlightedAlliance = $derived(
		row.red.some(isHighlighted) ? 'red' : row.blue.some(isHighlighted) ? 'blue' : null
	);
</script>

<div class="border-b border-border/80 pb-2">
	<div class="grid grid-cols-[2fr_3fr_3fr] items-center">
		<div
			class="text-left text-2xl leading-none font-medium {highlightedAlliance
				? winner(row.score) === highlightedAlliance
					? 'text-green-300'
					: winner(row.score) ===
						  (highlightedAlliance === 'red'
								? 'blue'
								: highlightedAlliance === 'blue'
									? 'red'
									: null)
						? 'text-red-300'
						: 'text-foreground'
				: winner(row.score) === 'red'
					? 'text-red-300'
					: winner(row.score) === 'blue'
						? 'text-blue-300'
						: 'text-foreground'}"
		>
			{row.match}
		</div>
		<div class="pr-1">
			<div
				class="ml-auto grid w-24 grid-cols-[2.45rem_0.7rem_2.45rem] gap-y-1 [font-variant-numeric:tabular-nums]"
			>
				<div class="text-left text-xs whitespace-nowrap text-muted-foreground">{row.time}</div>
				<div class="text-center text-xs text-muted-foreground opacity-0">-</div>
				<div class="text-right text-xs text-muted-foreground opacity-0">0</div>
				<div class="text-left text-xs leading-none text-red-300">
					{parseScore(row.score)[0]}
				</div>
				<div class="text-center text-base leading-none text-muted-foreground">-</div>
				<div class="text-right text-xs leading-none text-blue-300">
					{parseScore(row.score)[1]}
				</div>
			</div>
		</div>
		<div
			class="grid grid-cols-2 gap-3 border-l border-border/70 pl-3 text-xs leading-tight [font-variant-numeric:tabular-nums]"
		>
			<div class="space-y-1 text-left text-red-300">
				{#each row.red as team}
					<div
						class={isHighlighted(team)
							? 'font-semibold underline decoration-accent-foreground/60 underline-offset-2'
							: ''}
					>
						{team}
					</div>
				{/each}
			</div>
			<div class="space-y-1 text-right text-blue-300">
				{#each row.blue as team}
					<div
						class={isHighlighted(team)
							? 'font-semibold underline decoration-accent-foreground/60 underline-offset-2'
							: ''}
					>
						{team}
					</div>
				{/each}
			</div>
		</div>
	</div>
</div>
