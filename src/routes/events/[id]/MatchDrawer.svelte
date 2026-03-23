<script lang="ts">
	import * as Drawer from '$lib/components/ui/drawer';

	type ScheduleRow = {
		group: 'practice' | 'qualifier' | 'elimination';
		match: string;
		time: string;
		score: string;
		red: string[];
		blue: string[];
		field?: string;
		played: boolean;
	};

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
		open?: boolean;
		row: ScheduleRow | null;
		rankingRows: RankingRow[];
	}

	let { open = $bindable(false), row, rankingRows }: Props = $props();

	const normalizeTeam = (value: string) => value.trim().toLowerCase();

	const parseScores = (score: string): [number, number] => {
		const [leftRaw = '0', rightRaw = '0'] = score.split('-');
		const left = Number.parseInt(leftRaw.trim(), 10);
		const right = Number.parseInt(rightRaw.trim(), 10);
		return [Number.isNaN(left) ? 0 : left, Number.isNaN(right) ? 0 : right];
	};

	let scores = $derived(row ? parseScores(row.score) : ([0, 0] as [number, number]));
	let redScore = $derived(scores[0]);
	let blueScore = $derived(scores[1]);

	const getTeamRanking = (teamNumber: string) =>
		rankingRows.find((r) => normalizeTeam(r.team) === normalizeTeam(teamNumber)) ?? null;
</script>

<Drawer.Root bind:open>
	<Drawer.Content scrollable>
		{#if row}
			<div class="space-y-5">
				<Drawer.Header class="px-0 pb-0 text-left">
					<Drawer.Title class="text-2xl leading-none font-semibold tracking-tight">
						Game Info
					</Drawer.Title>
				</Drawer.Header>

				<div class="rounded-2xl bg-red-950 p-5 text-foreground">
					<div class="text-6xl leading-none font-medium [font-variant-numeric:tabular-nums]">
						{row.match}
					</div>
					<div class="mt-1.5 text-sm text-foreground/60">
						{row.played ? 'Played' : 'Scheduled'}
					</div>

					<div class="mt-5 space-y-1.5 text-sm">
						<div class="flex justify-between gap-4">
							<span class="text-foreground/60">Start Time</span>
							<span class="font-medium">{row.time}</span>
						</div>
						{#if row.field}
							<div class="flex justify-between gap-4">
								<span class="shrink-0 text-foreground/60">Field</span>
								<span class="text-right font-medium">{row.field}</span>
							</div>
						{/if}
					</div>
				</div>

				<div>
					<div class="mb-2 flex items-baseline justify-between">
						<span class="text-xl font-medium">Red Alliance</span>
						<span class="text-5xl leading-none font-medium [font-variant-numeric:tabular-nums]">
							{redScore}
						</span>
					</div>
					{#each row.red as teamNumber}
						{@const ranking = getTeamRanking(teamNumber)}
						<div class="flex items-center gap-3 border-t border-border/60 py-3">
							<div
								class="w-7 shrink-0 text-right text-sm text-muted-foreground [font-variant-numeric:tabular-nums]"
							>
								{ranking?.rank ?? ''}
							</div>
							<div class="min-w-0 flex-1">
								<div
									class="text-3xl leading-none font-medium text-red-300 [font-variant-numeric:tabular-nums]"
								>
									{teamNumber}
								</div>
								{#if ranking?.name}
									<div class="mt-0.5 text-xs text-muted-foreground">{ranking.name}</div>
								{/if}
							</div>
							{#if ranking}
								<div class="flex text-xs [font-variant-numeric:tabular-nums]">
									<div class="pr-3 text-right">
										<div>{ranking.wins}-{ranking.losses}-{ranking.ties}</div>
										<div class="text-muted-foreground">{ranking.wp} WP</div>
									</div>
									<div class="border-l border-border/50 pl-3 text-right">
										<div>{ranking.ap} AP</div>
										<div class="text-muted-foreground">{ranking.sp} SP</div>
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>

				<div>
					<div class="mb-2 flex items-baseline justify-between">
						<span class="text-xl font-medium">Blue Alliance</span>
						<span class="text-5xl leading-none font-medium [font-variant-numeric:tabular-nums]">
							{blueScore}
						</span>
					</div>
					{#each row.blue as teamNumber}
						{@const ranking = getTeamRanking(teamNumber)}
						<div class="flex items-center gap-3 border-t border-border/60 py-3">
							<div
								class="w-7 shrink-0 text-right text-sm text-muted-foreground [font-variant-numeric:tabular-nums]"
							>
								{ranking?.rank ?? ''}
							</div>
							<div class="min-w-0 flex-1">
								<div
									class="text-3xl leading-none font-medium text-blue-300 [font-variant-numeric:tabular-nums]"
								>
									{teamNumber}
								</div>
								{#if ranking?.name}
									<div class="mt-0.5 text-xs text-muted-foreground">{ranking.name}</div>
								{/if}
							</div>
							{#if ranking}
								<div class="flex text-xs [font-variant-numeric:tabular-nums]">
									<div class="pr-3 text-right">
										<div>{ranking.wins}-{ranking.losses}-{ranking.ties}</div>
										<div class="text-muted-foreground">{ranking.wp} WP</div>
									</div>
									<div class="border-l border-border/50 pl-3 text-right">
										<div>{ranking.ap} AP</div>
										<div class="text-muted-foreground">{ranking.sp} SP</div>
									</div>
								</div>
							{/if}
						</div>
					{/each}
					<div class="border-t border-border/60"></div>
				</div>
			</div>
		{/if}
	</Drawer.Content>
</Drawer.Root>
