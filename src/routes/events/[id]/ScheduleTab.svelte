<script lang="ts">
	import { ChevronDown } from '@lucide/svelte';
	import MatchRow from './MatchRow.svelte';

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

	type ScheduleGroup = ScheduleRow['group'];

	let { rows, onMatchSelect }: { rows: ScheduleRow[]; onMatchSelect?: (row: ScheduleRow) => void } =
		$props();

	let expandedGroups = $state<Record<ScheduleGroup, boolean>>({
		practice: true,
		qualifier: true,
		elimination: true
	});

	const groupedRows = $derived([
		{
			key: 'practice' as const,
			title: 'Practice',
			rows: rows.filter((row) => row.group === 'practice')
		},
		{
			key: 'qualifier' as const,
			title: 'Qualifications',
			rows: rows.filter((row) => row.group === 'qualifier')
		},
		{
			key: 'elimination' as const,
			title: 'Eliminations',
			rows: rows.filter((row) => row.group === 'elimination')
		}
	]);
</script>

<div class="space-y-4">
	{#each groupedRows as section}
		{#if section.rows.length > 0}
			<div class="space-y-1">
				<button
					type="button"
					onclick={() => (expandedGroups[section.key] = !expandedGroups[section.key])}
					class="mb-2 flex w-full items-center gap-2 text-left text-lg leading-none font-semibold"
				>
					<span>{section.title}</span>
					<ChevronDown
						class="h-5 w-5 text-muted-foreground transition-transform {expandedGroups[section.key]
							? 'rotate-0'
							: '-rotate-90'}"
					/>
				</button>

				{#if expandedGroups[section.key]}
					{#each section.rows as row}
						<button type="button" onclick={() => onMatchSelect?.(row)} class="w-full text-left">
							<MatchRow {row} />
						</button>
					{/each}
				{/if}
			</div>
		{/if}
	{/each}
</div>
