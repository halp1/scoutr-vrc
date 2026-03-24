import { CONSTANTS } from '../const';
import {
	Configuration,
	EventApi,
	PaginatedRankingFromJSON,
	ProgramApi,
	SeasonApi,
	TeamApi,
	type PageMeta
} from './robotevents';

export const events = new EventApi(
	new Configuration({
		accessToken: CONSTANTS.ROBOTEVENTS_API_KEY
	})
);

export const program = new ProgramApi(
	new Configuration({
		accessToken: CONSTANTS.ROBOTEVENTS_API_KEY
	})
);

export const season = new SeasonApi(
	new Configuration({
		accessToken: CONSTANTS.ROBOTEVENTS_API_KEY
	})
);

export const team = new TeamApi(
	new Configuration({
		accessToken: CONSTANTS.ROBOTEVENTS_API_KEY
	})
);

export const depaginate = async <T extends { meta?: PageMeta; data?: any[] }>(
	initial: PromiseLike<T>,
	processor: (data: any) => T
): Promise<NonNullable<T['data']>> => {
	let data = await initial;
	const res = [...(data.data ?? [])];
	while (data.meta?.nextPageUrl) {
		const response = await fetch(data.meta.nextPageUrl, {
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${CONSTANTS.ROBOTEVENTS_API_KEY}`
			}
		});

		if (!response.ok) {
			throw new Error(`Failed to fetch rankings page: ${response.status}`);
		}

		data = processor(await response.json());

		res.push(...(data.data ?? []));
	}

	return res;
};

export class Paginator<T> {
	#initial: PromiseLike<{ meta?: PageMeta; data?: T[] }>;
	#processor: (data: any) => { meta?: PageMeta; data?: T[] };
	#pages: number = 0;
	#root: string = '';

	constructor(
		initial: PromiseLike<{ meta?: PageMeta; data?: T[] }>,
		processor: (data: any) => { meta?: PageMeta; data?: T[] }
	) {
		this.#initial = initial;
		this.#processor = processor;
	}

	async initial(): Promise<T[]> {
		const data = await this.#initial;
		this.#pages = data.meta?.total ?? 0;
		this.#root = data.meta?.firstPageUrl!.replace(/page=\d+/, 'page={{}}') ?? '';
		return data.data ?? [];
	}

	async page(page: number): Promise<T[]> {
		if (page < 1 || page >= this.#pages) {
			throw new Error(`Page ${page} is out of bounds (1-${this.#pages})`);
		}
		return await fetch(this.#root.replace('{{}}', page.toString()), {
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${CONSTANTS.ROBOTEVENTS_API_KEY}`
			}
		})
			.then((res) => {
				if (!res.ok) {
					throw new Error(`Failed to fetch page ${page}: ${res.status}`);
				}
				return res.json();
			})
			.then((data) => this.#processor(data).data ?? []);
	}
}

export * as models from './robotevents/models';

export * as custom from './custom-wrapper';
