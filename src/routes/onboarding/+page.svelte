<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { ready, storage } from '$lib/state';
	import { onMount } from 'svelte';

	import { ArrowRight } from '@lucide/svelte';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';

	import { re } from '$lib/robotevents';
	import { supabase } from '$lib/supabase';
	import { CONSTANTS } from '$lib/const';

	let programInput = $state('');
	let program = $derived(programInput.length === 0 ? null : parseInt(programInput));
	let teamNumber = $state('');

	let programs = $state(
		(
			await re.depaginate(
				re.program.programGetPrograms({}, re.custom.maxPages),
				re.models.PaginatedProgramFromJSON
			)
		).filter((p) => CONSTANTS.SUPPORTED_PROGRAMS.includes(p.abbr!))
	);

	let programTrigger = $derived(
		programs?.find((p) => p.id === program)?.name ?? 'Select a program'
	);

	const fetchTeam = async (teamNumber: string, programID: number) => {
		if (teamNumber === '') return null;
		const res = await re.team.teamGetTeams({
			number: [teamNumber],
			program: [programID]
		});

		if (res.data?.length !== 1) return null;

		return res.data[0];
	};

	onMount(() => {
		ready.then(async () => {
			if (
				Object.keys($storage.onboarding).every(
					(key) => $storage.onboarding[key as keyof typeof $storage.onboarding] === true
				)
			) {
				await goto('/');
				return;
			}
		});

		const unsubscribe = storage.subscribe((value) => {
			if (
				Object.keys(value.onboarding).every(
					(key) => value.onboarding[key as keyof typeof value.onboarding] === true
				)
			) {
				goto('/');
			}
		});

		return () => {
			unsubscribe();
		};
	});

	// keep at bottom
	let team = $derived(
		program && teamNumber.length > 0 ? await fetchTeam(teamNumber, program) : null
	);
</script>

<div
	class="flex h-screen w-screen flex-col items-center justify-center bg-background text-accent-foreground"
>
	{#if $storage.onboarding.intro === false}
		<h1 class="text-3xl">Welcome!</h1>
		<Button
			class="mx-3 mt-3 flex w-full max-w-70 items-center justify-center"
			onclick={() => {
				$storage.onboarding.intro = true;
			}}
		>
			Get Started <ArrowRight class="ml-1" />
		</Button>
	{:else if $storage.onboarding.team === false}
		<h1 class="text-3xl">Find your team</h1>
		<Select.Root type="single" bind:value={programInput}>
			<Select.Trigger class="mx-3 mt-3 w-full max-w-70">
				{programTrigger}
			</Select.Trigger>
			<Select.Content>
				<Select.Group>
					<Select.Label>Program</Select.Label>
					{#each programs as program}
						<Select.Item value={program.id!.toString()}>
							{program.name}
						</Select.Item>
					{/each}
				</Select.Group>
			</Select.Content>
		</Select.Root>
		<Input class="mx-3 mt-3 max-w-70" placeholder="Team Number" bind:value={teamNumber} />
		{#if team}
			<Card.Root class="mx-3 mt-3 w-full max-w-70">
				<Card.Header>
					<Card.Title class="text-lg font-bold">{team.number}</Card.Title>
					<Card.Description>{team.teamName}</Card.Description>
					<Card.Description>{team.organization}</Card.Description>
				</Card.Header>
			</Card.Root>
		{/if}
		<Button
			disabled={!team}
			class="mx-3 mt-3 flex w-full max-w-70 cursor-pointer items-center justify-center"
			onclick={() => {
				$storage.team = team?.number!;
				$storage.onboarding.team = true;
			}}
		>
			Next <ArrowRight class="ml-1" />
		</Button>
		<button
			class="mx-auto mt-2 w-full cursor-pointer text-sm text-gray-500 underline"
			onclick={() => {
				$storage.team = null;
				$storage.onboarding.team = true;
			}}
		>
			Skip this step
		</button>
	{:else}
		<h1 class="text-3xl">Create an account</h1>
		<h3 class="mx-3 mt-3 w-full max-w-70 text-center text-base">
			Save scouting information to the cloud and share it with your team
		</h3>
		<Button
			class="mx-3 mt-3 flex w-full max-w-70 cursor-pointer items-center justify-center bg-[#5d6af2] hover:bg-[#5d6af2]/90"
			onclick={() => {
				supabase.auth.signInWithOAuth({
					provider: 'discord',
					options: {
						redirectTo: `${window.location.origin}/callback/auth`
					}
				});
			}}
		>
			<span>Sign Up With Discord</span>
			<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="invert">
				<title>Discord</title>
				<path
					d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"
				/>
			</svg>
		</Button>
		<Button
			class="mx-3 mt-3 flex w-full max-w-70 cursor-pointer items-center justify-center bg-[#505b67] hover:bg-[#505b67]/90"
			onclick={() => {
				supabase.auth.signInWithOAuth({
					provider: 'github',
					options: {
						redirectTo: `${window.location.origin}/callback/auth`
					}
				});
			}}
		>
			<span>Sign Up With Github</span>
			<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" class="invert">
				<title>GitHub</title>
				<path
					d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
				/>
			</svg>
		</Button>

		<button
			class="mx-auto mt-2 w-full cursor-pointer text-sm text-gray-500 underline"
			onclick={async () => {
				storage.update((s) => {
					s.auth = null;
					s.onboarding.account = true;
					return s;
				});
				await goto('/');
			}}
		>
			Skip this step
		</button>
	{/if}
</div>
