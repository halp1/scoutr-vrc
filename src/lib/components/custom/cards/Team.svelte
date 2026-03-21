<script lang="ts">
	import { match } from '$app/paths';
	import * as Card from '$lib/components/ui/card';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { re } from '$lib/robotevents';
	import { storage } from '$lib/state';
	import { Code, Gamepad2, Hash, Plus, SquareSigma, Star, Terminal, Trophy } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { writable, type Writable } from 'svelte/store';

	let { id, season }: { id: number; season: number } = $props();

	const [details, matches, skills, awards]: [
		Writable<null | re.models.Team>,
		Writable<null | re.models.MatchObj[]>,
		Writable<null | re.custom.cache.sources.SkillsLeaderboardEntry>,
		Writable<null | re.models.Award[]>
	] = [writable(null), writable(null), writable(null), writable(null)];

	onMount(() => {
		re.custom.teams.lazyTeamDetail(id, season, [details, matches, skills, awards]);
	});

	let skillsRank = $derived($skills?.rank ?? Infinity);

	let matchData = $derived(
		$matches
			? (() => {
					const res = { wins: 0, losses: 0, ties: 0 };

					for (const match of $matches) {
						const alliance = match.alliances.find((a) => a.teams.some((t) => t.team!.id === id))!;
						const opposite = match.alliances.find((a) => a.color !== alliance?.color)!;

						if (alliance?.score > opposite?.score) {
							res.wins++;
						} else if (alliance?.score < opposite?.score) {
							res.losses++;
						} else {
							res.ties++;
						}
					}

					return res;
				})()
			: null
	);
</script>

<!-- details -->
<Card.Root class="mx-4">
	<Card.Header class="relative">
		<Card.Title class="text-4xl">
			{#if $details}
				{$details.number}
			{:else}
				<Skeleton />
			{/if}
		</Card.Title>
		<Card.Description>
			{#if $details}
				{$details.teamName}
			{:else}
				<Skeleton class="h-5 w-10" />
			{/if}
		</Card.Description>
		<Card.Action>
			<Star
				onclick={() => {
					if ($storage.favorites.teams.includes(id)) {
						$storage.favorites.teams = $storage.favorites.teams.filter((t) => t !== id);
					} else {
						$storage.favorites.teams = [...$storage.favorites.teams, id];
					}
				}}
				class="mt-2 mr-2 cursor-pointer"
				stroke={$storage.favorites.teams.includes(id) ? 'currentColor' : undefined}
				fill={$storage.favorites.teams.includes(id) ? 'currentColor' : undefined}
			/>
		</Card.Action>
	</Card.Header>
	<Card.Content>
		<div class="flex items-center text-sm text-muted-foreground">
			<div class="">
				{#if $details}
					{$details.location?.city}, {$details.location?.region}
				{:else}
					<Skeleton class="h-3 w-20" />
				{/if}
			</div>

			<div class="ml-auto">
				{#if $details}
					{$details.organization}
				{:else}
					<Skeleton class="h-3 w-20" />
				{/if}
			</div>
		</div>
		<div class="flex items-center text-xs text-muted-foreground">
			<div>
				{#if $details}
					Location
				{:else}
					<Skeleton class="mt-1 h-2 w-15" />
				{/if}
			</div>

			<div class="ml-auto">
				{#if $details}
					Organization
				{:else}
					<Skeleton class="mt-1 h-2 w-15" />
				{/if}
			</div>
		</div>
	</Card.Content>
</Card.Root>

<!-- skills -->
<!-- <Card.Root class="mx-4 mt-5 flex flex-row items-center gap-0">
	<Card.Content class="-mt-5 -mb-1 flex-1">
		<div class="flex items-center">
			<div class="flex items-center gap-2">
				<SquareSigma />
				{#if $skills}
					<div class="relative flex flex-col items-start">
						<span class="mb-px">{$skills.scores.score}</span>
						<div class="absolute top-full text-xs text-muted-foreground">Total</div>
					</div>
				{:else}
					<Skeleton class="h-4 w-6" />
				{/if}
			</div>
			<div
				class="h-20 flex-1 bg-no-repeat"
				style={`background-size: 100% 100%;background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 100' preserveAspectRatio='none' xmlns='http://www.w3.org/2000/svg' class='scale-y-85' %3E%3Cpath d='M10 50 L70 50' stroke='white' stroke-width='2' fill='none' /%3E%3Cpath d='M70 50 C110 50, 140 20, 190 20' stroke='white' stroke-width='2' fill='none' /%3E%3Cpath d='M70 50 C110 50, 140 80, 190 80' stroke='white' stroke-width='2' fill='none' /%3E%3C/svg%3E");`}
			></div>
			<div class="flex flex-col items-end gap-6">
				<div class="flex items-center gap-2">
					<Gamepad2 />
					{#if $skills}
						<div class="relative flex flex-col items-end">
							<span class="w-6 text-right">
								{$skills.scores.driver}
							</span>
							<div class="absolute top-full text-xs text-muted-foreground">Driver</div>
						</div>
					{:else}
						<Skeleton class="h-4 w-6" />
					{/if}
				</div>
				<div class="flex items-center gap-2">
					<Terminal />
					{#if $skills}
						<div class="relative flex flex-col items-end">
							<span class="w-6 text-right"> {$skills.scores.programming}</span>
							<div class="absolute top-full text-xs text-muted-foreground">Auto</div>
						</div>
					{:else}
						<Skeleton class="h-4 w-6" />
					{/if}
				</div>
			</div>
		</div>
	</Card.Content>

	<div class="ml-6">
		<Card.Title class="text-3xl">
			{#if $skills}
				#{skillsRank}
			{:else}
				<Skeleton class="h-8 w-8" />
			{/if}
		</Card.Title>
		<Card.Description class="whitespace-nowrap">Skills rank</Card.Description>
	</div>
</Card.Root> -->
<!-- skills -->
<Card.Root class="relative mx-4 mt-5 flex flex-row items-end gap-0">
	<div class="ml-6">
		<Card.Title class="text-3xl">
			{#if $skills}
				{$skills.scores.score}
			{:else}
				<Skeleton class="h-8 w-8" />
			{/if}
		</Card.Title>
		<Card.Description class="whitespace-nowrap">Skills record</Card.Description>
	</div>
	<Card.Content class="ml-auto flex gap-4">
		{#each [[Gamepad2, 'Driver', $skills?.scores.driver], [Terminal, 'Auto', $skills?.scores.programming], [Trophy, 'Rank', $skills?.rank]] as const as [Icon, label, value]}
			<div class="flex flex-col">
				<div class="flex items-center gap-2">
					<Icon class="h-4 w-4 {Icon === Terminal ? '-mb-1' : ''}" />
					{#if value}
						{value}
					{:else}
						<Skeleton class="h-4 w-6" />
					{/if}
				</div>
				<div class="text-sm text-muted-foreground">{label}</div>
			</div>
		{/each}
	</Card.Content>
</Card.Root>

<!-- match stats -->
<Card.Root class="relative mx-4 mt-5 flex flex-row items-end gap-0">
	<div class="ml-6">
		<Card.Title class="text-3xl">
			{#if matchData}
				{((matchData.wins / (matchData.wins + matchData.losses + matchData.ties)) * 100).toFixed(
					1
				)}%
			{:else}
				<Skeleton class="h-8 w-8" />
			{/if}
		</Card.Title>
		<Card.Description class="whitespace-nowrap">Win rate</Card.Description>
	</div>
	<Card.Content class="ml-auto flex gap-4">
		{#each [['Wins', matchData?.wins], ['Losses', matchData?.losses], ['Ties', matchData?.ties]] as [label, value]}
			<div class="flex flex-col">
				<div>
					{#if value}
						{value}
					{:else}
						<Skeleton class="h-4 w-6" />
					{/if}
				</div>
				<div class="text-sm text-muted-foreground">{label}</div>
			</div>
		{/each}
	</Card.Content>
</Card.Root>
