<script lang="ts">
	import { Drawer as DrawerPrimitive } from 'vaul-svelte';
	import DrawerPortal from './drawer-portal.svelte';
	import DrawerOverlay from './drawer-overlay.svelte';
	import { cn } from '$lib/utils.js';
	import type { ComponentProps } from 'svelte';
	import type { WithoutChildrenOrChild } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		portalProps,
		children,
		scrollable = false,
		...restProps
	}: DrawerPrimitive.ContentProps & {
		portalProps?: WithoutChildrenOrChild<ComponentProps<typeof DrawerPortal>>;
		scrollable?: boolean;
	} = $props();
</script>

<DrawerPortal {...portalProps}>
	<DrawerOverlay />
	<DrawerPrimitive.Content
		bind:ref
		data-slot="drawer-content"
		class={cn(
			'group/drawer-content fixed z-50 flex h-auto flex-col bg-background',
			'data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-lg data-[vaul-drawer-direction=top]:border-b',
			'data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-lg data-[vaul-drawer-direction=bottom]:border-t',
			'data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:inset-e-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:border-s data-[vaul-drawer-direction=right]:sm:max-w-sm',
			'data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:inset-s-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:border-e data-[vaul-drawer-direction=left]:sm:max-w-sm',
			className
		)}
		{...restProps}
	>
		<div class="sticky top-0 z-10 w-full bg-background">
			<div
				class="mx-auto my-4 hidden h-2 w-25 shrink-0 rounded-full bg-muted group-data-[vaul-drawer-direction=bottom]/drawer-content:block"
			></div>
		</div>
		<div class={cn('px-4', scrollable && 'overflow-y-auto overscroll-contain')}>
			{@render children?.()}
		</div>
	</DrawerPrimitive.Content>
</DrawerPortal>

<style>
	@reference "../../../../routes/layout.css";

	:global([data-slot='drawer-content'][data-vaul-drawer-direction='bottom']) {
		@apply px-0;
	}
	:global([data-slot='drawer-content'][data-vaul-drawer-direction='bottom']::after) {
		display: none !important;
		content: none !important;
	}
</style>
