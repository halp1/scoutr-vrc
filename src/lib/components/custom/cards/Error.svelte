<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import type { ComponentProps } from 'svelte';
	import { twMerge } from 'tailwind-merge';

	let { message, ...rest }: { message: string } & ComponentProps<typeof Card.Card> = $props();
</script>

<Card.Root {...rest} class={twMerge('border-destructive', rest.class ?? ('' as any))}>
	<Card.Header class="text-2xl">
		<Card.Title>Error</Card.Title>
	</Card.Header>
	<Card.Content class="whitespace-pre-wrap">
		<p>{message}</p>
	</Card.Content>
</Card.Root>
