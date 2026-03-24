<script lang="ts">
	import { ready, storage } from '$lib/state';
	import { onMount } from 'svelte';
	import './layout.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { supabase } from '$lib/supabase';
	import { get } from 'svelte/store';
	import { Compass, House, Star, User2 } from '@lucide/svelte';

	const { children } = $props();

	let onboarding = page.url.pathname.startsWith('/onboarding');

	onMount(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (session) {
				storage.update((s) => {
					s.auth = session;
					s.onboarding.account = true;
					return s;
				});
			}
		});

		supabase.auth.onAuthStateChange(async (event, session) => {
			await ready;
			if (event === 'SIGNED_IN') {
				storage.update((s) => {
					s.auth = session;
					s.onboarding.account = true;
					return s;
				});
			}
		});

		ready.then(async () => {
			const currentAuth = get(storage).auth;
			if (currentAuth) {
				supabase.auth.setSession(currentAuth);
				storage.update((s) => {
					s.onboarding.account = true;
					return s;
				});
			}

			if (onboarding || page.url.pathname.startsWith('/callback')) {
				return;
			}
			if (
				Object.keys($storage.onboarding).some(
					(key) => $storage.onboarding[key as keyof typeof $storage.onboarding] === false
				)
			) {
				await goto('/onboarding');
				return;
			}
		});
	});

	let routes = $state([
		$storage.team
			? {
					path: '/',
					name: 'Home',
					icon: House
				}
			: null,

		{
			path: '/favorites',
			name: 'Favorites',
			icon: Star
		},
		{
			path: '/explore',
			name: 'explore',
			icon: Compass
		},
		{
			path: '/account',
			name: 'Account',
			icon: User2
		}
	]);

	let dyanmicRoutes = $derived(
		routes
			.filter((r) => r !== null)
			.map((r) => ({
				...r,
				active: r.path === '/' ? page.url.pathname === '/' : page.url.pathname.startsWith(r.path)
			}))
	);

	let navbarHidden = $derived(!dyanmicRoutes.some((r) => r.active));
</script>

{#if $storage === null}
	<div class="loading">
		<div class="spinner"></div>
	</div>
{:else}
	<div id="root">
		<div class="relative {navbarHidden ? 'h-(--space)' : 'h-[calc(var(--space)-48px)]'}">
			{@render children?.()}
		</div>
		<div
			class="grid items-center overflow-y-auto transition-all"
			class:h-12={!navbarHidden}
			class:h-0={navbarHidden}
			style="grid-template-columns: repeat({routes.length}, minmax(0, 1fr));"
		>
			{#each dyanmicRoutes as route}
				<a
					href={route.path}
					class="flex cursor-pointer flex-col items-center justify-center text-sm text-muted-foreground"
				>
					<route.icon
						class="h-5 w-5 {route.active ? 'text-primary' : ''}"
						stroke={route.active ? 'currentColor' : 'none'}
					/>
					<!-- <span class="overflow-hidden text-sm" class:h-5={route.active} class:h-0={!route.active}>
					{route.name}
				</span> -->
				</a>
			{/each}
		</div>
	</div>
{/if}

<style>
	#root {
		padding-top: env(safe-area-inset-top);
		padding-bottom: env(safe-area-inset-bottom);
		padding-left: env(safe-area-inset-left);
		padding-right: env(safe-area-inset-right);

		--space: calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom));
	}
</style>
