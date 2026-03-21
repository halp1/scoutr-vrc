<script lang="ts">
	import { goto } from '$app/navigation';
	import { ready, storage } from '$lib/state';
	import { onMount } from 'svelte';

	import { supabase } from '$lib/supabase';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';

	let authState = $state({
		code: page.url.searchParams.get('code'),
		state: page.url.searchParams.get('state'),
		error: {
			code: page.url.searchParams.get('error_code'),
			description: page.url.searchParams.get('error_description')
		}
	});

	onMount(() => {
		ready.then(async () => {
			const {
				data: { session }
			} = await supabase.auth.getSession();

			// if (authState.error.code || !authState.code || !authState.state) return;

			// const { data, error } = await supabase.auth.exchangeCodeForSession(authState.code);

			// if (error || !data.session) {
			// 	authState.error.description = error?.message || 'Unknown error';
			// 	return;
			// }

			// storage.update((s) => {
			// 	s.auth = data.session;
			// 	return s;
			// });
		});
	});
</script>

{#if authState.error.code || !authState.code || !authState.state}
	<div class="flex h-screen w-screen items-center justify-center">
		<Card.Root class="mx-3 w-full max-w-80">
			<Card.Header>
				<Card.Title class="-mb-3 text-center text-2xl">
					Authentication Failed - {authState.error.code}
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<Card.Description>
					{authState.error.description ||
						'An unknown error occurred during authentication. Please try again.'}
				</Card.Description>
				<Button
					class="mt-3 flex w-full cursor-pointer items-center justify-center bg-destructive hover:bg-destructive/90"
					onclick={async () => {
						await goto('/');
						history.go(0);
					}}
				>
					Go Back
				</Button>
			</Card.Content>
		</Card.Root>
	</div>
{:else}{/if}
