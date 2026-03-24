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
		let navigated = false;

		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange(async (event, session) => {
			if (navigated || event !== 'SIGNED_IN' || !session) return;
			navigated = true;
			await ready;
			storage.update((s) => {
				s.auth = session;
				s.onboarding.account = true;
				return s;
			});
			await goto('/');
		});

		supabase.auth.getSession().then(async ({ data: { session } }) => {
			if (navigated || !session) return;
			navigated = true;
			await ready;
			storage.update((s) => {
				s.auth = session;
				s.onboarding.account = true;
				return s;
			});
			await goto('/');
		});

		return () => subscription.unsubscribe();
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
