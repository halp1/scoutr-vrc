import { CONSTANTS } from '../const';
import { cache } from './cache';

export interface Country {
	id: number;
	name: string;
}

export interface Region {
	id: number;
	name: string;
	country: number;
}

export interface Type {
	id: number;
	name: string;
}

export interface Format {
	id: number;
	name: string;
}

export const formats: Format[] = [
	{ id: 1, name: 'In-Person' },
	{ id: 7, name: 'Invitational' },
	{ id: 4, name: 'Remote' },
	{ id: 5, name: 'Skills Only' }
];

export interface GradeLevel {
	id: number;
	name: string;
}

export const gradeLevels: GradeLevel[] = [
	{ id: 1, name: 'Elementary' },
	{ id: 2, name: 'Middle School' },
	{ id: 3, name: 'High School' },
	{ id: 4, name: 'College' }
];

export interface Level {
	id: number;
	name: string;
}

export const levels: Level[] = [
	{ id: 1, name: 'Event Region Championship' },
	{ id: 2, name: 'National Championship' },
	{ id: 3, name: 'World Championship' },
	{ id: 4, name: 'Signature Event' },
	{ id: 5, name: 'JROTC Brigade Championship' },
	{ id: 6, name: 'JROTC National Championship' },
	{ id: 7, name: 'Showcase Event' }
];

export type EventDate =
	`${number}${number}${number}${number}-${number}${number}-${number}${number}`;

export interface EventRegion {
	id: number;
	name: string;
}

let regionsCache: EventRegion[] | null = null;

export const loadEventRegions = async (season: number): Promise<EventRegion[]> => {
	if (regionsCache) return regionsCache;

	const skillsLeaderboard = await cache.load('skills.leaderboard', season);

	const eventRegions = [
		...new Set(skillsLeaderboard.map((r) => `${r.team.eventRegionId}:${r.team.eventRegion}`))
	].map((er) => {
		const [id, name] = er.split(':');
		return { id: parseInt(id), name };
	});

	regionsCache = eventRegions;

	return eventRegions;
};

export interface EventsQuery {
	country: number | null;
	region: number | null;
	season: number | null;
	type: number | null;
	formats: number[];
	name: string;
	grade: GradeLevel | null;
	level: Level | null;
	from: EventDate | null;
	to: EventDate | null;
	eventRegion: number | null;
}

export interface SearchEvent {
	name: string;
	sku: string;
	date: Date[];
	location: {
		address?: string;
		city?: string;
		state?: string;
		zip?: string;
		country?: string;
	} | null;
	status?: string;
	spots?: number;
	type?: string;
	region?: EventRegion;
}

const defaultQuery: EventsQuery = {
	country: null,
	region: null,
	season: null,
	type: null,
	formats: [],
	name: '',
	grade: null,
	level: null,
	from: null,
	to: null,
	eventRegion: null
};

export const getEvents = async (
	query: Omit<Partial<EventsQuery>, 'season'> & { season: number; name: string },
	cancelled: () => boolean
): Promise<{
	events: SearchEvent[];
	pages: number;
	loadPage: (page: number) => Promise<SearchEvent[]>;
}> => {
	const q = { ...defaultQuery, ...query };

	const urlBase = 'https://www.robotevents.com/api/v2/events';
	const loadPage = async (page: number): Promise<SearchEvent[]> => {
		const params = new URLSearchParams();
		params.set('per_page', '25');
		params.set('page', page.toString());
		if (q.season) params.append('season[]', q.season.toString());
		if (q.name) params.set('name', q.name);
		if (q.from) params.set('start', q.from);
		if (q.to) params.set('end', q.to);

		if (cancelled()) throw new Error('Event search cancelled');

		const res = await fetch(`${urlBase}?${params.toString()}`, {
			headers: {
				Accept: 'application/json',
				Authorization: `Bearer ${CONSTANTS.ROBOTEVENTS_API_KEY}`
			}
		});

		if (!res.ok) throw new Error(`RobotEvents API error ${res.status}`);

		const raw = await res.json();
		const events: SearchEvent[] = (raw.data ?? []).map((e: any) => ({
			name: e.name ?? '',
			sku: e.sku ?? '',
			date: [e.start ? new Date(e.start) : null, e.end ? new Date(e.end) : null].filter(
				Boolean
			) as Date[],
			location: e.location
				? {
						address: e.location.address1 ?? e.location.venue,
						city: e.location.city,
						state: e.location.region,
						zip: e.location.postcode,
						country: e.location.country
					}
				: null,
			type: e.event_type ?? e.type
		}));

		return events;
	};

	const firstPage = await loadPage(1);

	const params = new URLSearchParams();
	params.set('per_page', '25');
	params.set('page', '1');
	if (q.season) params.append('season[]', q.season.toString());
	if (q.name) params.set('name', q.name);
	if (q.from) params.set('start', q.from);
	if (q.to) params.set('end', q.to);

	const metaRes = await fetch(`${urlBase}?${params.toString()}`, {
		headers: {
			Accept: 'application/json',
			Authorization: `Bearer ${CONSTANTS.ROBOTEVENTS_API_KEY}`
		}
	});
	const metaRaw = await metaRes.json();
	const pages: number = metaRaw.meta?.last_page ?? 1;

	return {
		events: firstPage,
		pages,
		loadPage
	};
};
