<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { storage } from '$lib/state';
	import { supabase } from '$lib/supabase';
	import { LogOut, User } from '@lucide/svelte';
</script>

<div class="h-[calc(100vh-48px)] overflow-y-auto px-3 pt-3 pb-6">
	<div class="mb-4 text-2xl font-semibold">Account</div>

	{#if $storage.auth}
		<Card.Root class="mb-3 flex flex-row items-center gap-3 px-4 py-3">
			<div class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
				<User class="h-7 w-7" />
			</div>
			<div class="min-w-0 flex-1">
				<div class="truncate font-semibold">
					{$storage.auth.user.user_metadata?.full_name ?? $storage.auth.user.email ?? 'User'}
				</div>
				<div class="truncate text-sm text-muted-foreground">{$storage.auth.user.email}</div>
			</div>
		</Card.Root>

		<Button
			variant="outline"
			class="w-full justify-start gap-2 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
			onclick={async () => {
				await supabase.auth.signOut();
				storage.update((s) => {
					s.auth = null;
					s.onboarding.account = false;
					return s;
				});
				await goto('/onboarding');
			}}
		>
			<LogOut class="h-4 w-4" />
			Sign out
		</Button>
	{:else}
		<Card.Root class="px-4 py-3">
			<div class="text-muted-foreground">Not signed in</div>
		</Card.Root>
	{/if}
</div>
