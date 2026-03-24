import type { InitOverrideFunction } from './robotevents';

export const maxPages: InitOverrideFunction = async ({ init }) => {
	const url = new URL((init as any).url);
	url.searchParams.set('per_page', '250');
	return { ...init, url: url.toString() };
};

export * as events from './events';
export * as cache from './cache';
