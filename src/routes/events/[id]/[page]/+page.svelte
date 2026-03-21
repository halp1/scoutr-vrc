<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import InfoTab from './InfoTab.svelte';
	import RankingsTab from './RankingsTab.svelte';
	import ScheduleTab from './ScheduleTab.svelte';
	import SkillsTab from './SkillsTab.svelte';
	import { ArrowLeft, Clock3, Gamepad2, Info, ListOrdered, Search, Users } from '@lucide/svelte';

	const tabs = ['schedule', 'rankings', 'skills', 'info'] as const;
	type EventTab = (typeof tabs)[number];

	const tabLabels: Record<EventTab, string> = {
		schedule: 'Schedule',
		rankings: 'Rankings',
		skills: 'Skills',
		info: 'Info'
	};

	const tabMeta = [
		{ key: 'schedule' as const, label: 'Schedule', icon: Clock3 },
		{ key: 'rankings' as const, label: 'Rankings', icon: ListOrdered },
		{ key: 'skills' as const, label: 'Skills', icon: Gamepad2 },
		{ key: 'info' as const, label: 'Info', icon: Info }
	];

	const scheduleRows = [
		{
			match: 'Q1',
			time: '9:43 AM',
			score: '5 - 49',
			red: ['99928A', '75575A'],
			blue: ['9421M', '1784Y']
		},
		{
			match: 'Q2',
			time: '9:51 AM',
			score: '3 - 136',
			red: ['8568S', '9228B'],
			blue: ['1898A', '9421W']
		},
		{
			match: 'Q3',
			time: '9:54 AM',
			score: '133 - 8',
			red: ['20203Z', '15797H'],
			blue: ['785B', '8568T']
		},
		{
			match: 'Q4',
			time: '9:57 AM',
			score: '86 - 9',
			red: ['35075A', '81580T'],
			blue: ['92973B', '9228A']
		},
		{
			match: 'Q5',
			time: '10:00 AM',
			score: '6 - 122',
			red: ['1898Z', '33711B'],
			blue: ['2982X', '2602K']
		}
	];

	const rankingRows = [
		{ rank: 1, team: '2982X', name: 'ALL ON RED', record: '6-0-0', wp: 17, ap: 60, sp: 80 },
		{ rank: 2, team: '1898A', name: 'Olympus', record: '6-0-0', wp: 16, ap: 55, sp: 116 },
		{ rank: 3, team: '8889A', name: '99%', record: '5-1-0', wp: 13, ap: 50, sp: 98 },
		{
			rank: 4,
			team: '2602K',
			name: 'Hopkinetics KryptoKnights',
			record: '6-0-0',
			wp: 13,
			ap: 40,
			sp: 136
		},
		{ rank: 5, team: '9421W', name: 'Wicked SMAHT', record: '6-0-0', wp: 13, ap: 35, sp: 154 }
	];

	const skillsRows = [
		{ rank: 1, team: '2982X', name: 'ALL ON RED', points: 172, driver: 100, auton: 72 },
		{
			rank: 2,
			team: '2602K',
			name: 'Hopkinetics KryptoKnights',
			points: 127,
			driver: 69,
			auton: 58
		},
		{ rank: 3, team: '1898A', name: 'Olympus', points: 123, driver: 74, auton: 49 },
		{ rank: 4, team: '8889A', name: '99%', points: 122, driver: 69, auton: 53 },
		{
			rank: 5,
			team: '25600Y',
			name: 'Roxbury Latin - Blackbird',
			points: 118,
			driver: 64,
			auton: 54
		}
	];

	const infoData = {
		name: 'North Andover High School VEX V5 Push Back - HS Qualifier',
		locationLine1: '430 Osgood Street',
		locationLine2: 'North Andover, Massachusetts',
		date: 'Sat, Nov 22, 2025',
		division: 'Division 1'
	};

	let activeTab = $derived(
		tabs.includes(page.params.page as EventTab) ? (page.params.page as EventTab) : 'schedule'
	);
	let activeTitle = $derived(tabLabels[activeTab]);

	$effect(() => {
		const current = page.params.page;
		if (!tabs.includes(current as EventTab)) {
			void goto(`/events/${page.params.id}/schedule`, { replaceState: true });
		}
	});

	const goToTab = (tab: EventTab) => {
		if (tab === activeTab) return;
		void goto(`/events/${page.params.id}/${tab}`);
	};

	const swipeTo = (direction: 'left' | 'right') => {
		const currentIndex = tabs.indexOf(activeTab);
		const nextIndex = direction === 'left' ? currentIndex + 1 : currentIndex - 1;
		if (nextIndex < 0 || nextIndex >= tabs.length) return;
		void goto(`/events/${page.params.id}/${tabs[nextIndex]}`);
	};

	const swipeNavigation = (node: HTMLElement) => {
		let startX: number | null = null;
		let startY: number | null = null;

		const onTouchStart = (event: TouchEvent) => {
			const touch = event.changedTouches[0];
			startX = touch?.clientX ?? null;
			startY = touch?.clientY ?? null;
		};

		const onTouchEnd = (event: TouchEvent) => {
			if (startX === null || startY === null) return;

			const touch = event.changedTouches[0];
			const endX = touch?.clientX ?? startX;
			const endY = touch?.clientY ?? startY;
			const deltaX = endX - startX;
			const deltaY = endY - startY;

			startX = null;
			startY = null;

			if (Math.abs(deltaX) < 55) return;
			if (Math.abs(deltaX) <= Math.abs(deltaY)) return;
			if (deltaX < 0) swipeTo('left');
			else swipeTo('right');
		};

		node.addEventListener('touchstart', onTouchStart, { passive: true });
		node.addEventListener('touchend', onTouchEnd, { passive: true });

		return {
			destroy: () => {
				node.removeEventListener('touchstart', onTouchStart);
				node.removeEventListener('touchend', onTouchEnd);
			}
		};
	};
</script>

<div class="h-[calc(100vh-48px)] overflow-y-auto bg-background" use:swipeNavigation>
	<div class="px-4 pt-6 pb-5">
		<div class="mb-7 flex items-center justify-between">
			<button
				onclick={() => window.history.back()}
				class="flex h-9 w-9 items-center justify-center rounded-full text-foreground/90"
			>
				<ArrowLeft class="h-7 w-7" />
			</button>
			<div class="flex items-center gap-2 border-b border-border pb-2 text-muted-foreground">
				<Users class="h-5 w-5" />
				<div class="text-xl">{infoData.division}</div>
			</div>
		</div>

		<div class="mb-5 flex items-end justify-between">
			<h1 class="text-5xl leading-tight font-semibold">{activeTitle}</h1>
			<button class="text-muted-foreground">
				<Search class="h-8 w-8" />
			</button>
		</div>
	</div>

	<div class="min-h-[calc(100%-150px)] rounded-t-4xl border-t border-border bg-card px-4 pt-4 pb-6">
		<div class="mb-4 grid grid-cols-4 gap-3">
			{#each tabMeta as tab}
				<button
					onclick={() => goToTab(tab.key)}
					class="flex h-12 w-full items-center justify-center rounded-full border transition-colors {activeTab ===
					tab.key
						? 'border-primary/60 bg-primary/25 text-primary'
						: 'border-border text-muted-foreground'}"
				>
					<tab.icon class="h-6 w-6" />
				</button>
			{/each}
		</div>

		{#if activeTab === 'schedule'}
			<ScheduleTab rows={scheduleRows} />
		{:else if activeTab === 'rankings'}
			<RankingsTab rows={rankingRows} />
		{:else if activeTab === 'skills'}
			<SkillsTab rows={skillsRows} />
		{:else}
			<InfoTab info={infoData} />
		{/if}
	</div>
</div>
