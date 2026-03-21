import { load as loadStore, type Store } from '@tauri-apps/plugin-store';
import { skillsLeaderboard } from './sources/skills';

export interface Source<T extends (...args: any[]) => Promise<any>> {
	loader: T;
	/** Expiry time in seconds */
	expiryTime: number;
}

export class Cache<T extends Record<string, Source<any>>> {
	#store: Promise<Store>;
	#source: T;

	constructor(source: T) {
		this.#store = loadStore('cache.json');
		this.#source = source;
	}

	async load<K extends keyof T>(
		key: K,
		...args: Parameters<T[K]['loader']>
	): Promise<Awaited<ReturnType<T[K]['loader']>>> {
		const source = this.#source[key];
		if (!source) {
			throw new Error(`Source for key '${key.toString()}' not found`);
		}

		const store = await this.#store;

		const hash = [
			...new Uint8Array(
				await crypto.subtle.digest(
					'SHA-256',
					new TextEncoder().encode(JSON.stringify({ key: key.toString(), args }))
				)
			)
		]
			.map((b) => b.toString(16).padStart(2, '0'))
			.join('');

		const cached = (await store.get(hash)) as {
			data: Awaited<ReturnType<T[K]['loader']>>;
			expires: number;
		} | null;
		const now = Date.now();

		if (cached && cached.expires > now) {
			return cached.data;
		}

		const data = await source.loader(...args);
		await store.set(hash, { data, expires: now + source.expiryTime * 1000 });
		await store.save();

		return data;
	}
}

type Time = 'second' | 'minute' | 'hour' | 'day';
export const time = (count: number, unit: Time | `${Time}s`) => {
	const multiplier =
		{
			second: 1,
			minute: 60,
			hour: 60 * 60,
			day: 24 * 60 * 60
		}[unit.endsWith('s') ? (unit.slice(0, -1) as Time) : (unit as Time)] ?? 0;

	return count * multiplier;
};

const sources = {
	'skills.leaderboard': {
		loader: skillsLeaderboard,
		expiryTime: time(5, 'minutes')
	}
} as const;

export const cache = new Cache(sources);
export const load = cache.load.bind(cache);

export * as sources from './sources';
