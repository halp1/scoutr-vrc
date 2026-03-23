import { CONSTANTS } from '$lib/const';
import { load } from '@tauri-apps/plugin-store';
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

export const cookies = load('robotevents-cookies.json');

interface Cookie {
	name: string;
	value: string;
	expires: number;
}

const parseSetCookieHeader = (header: string): Cookie | null => {
	const parts = header.split(';').map((p) => p.trim());
	const nameValue = parts[0];
	const eqIdx = nameValue.indexOf('=');
	if (eqIdx === -1) return null;

	const name = nameValue.slice(0, eqIdx).trim();
	const value = nameValue.slice(eqIdx + 1).trim();
	let expires = Date.now() + 24 * 60 * 60 * 1000;

	for (const attr of parts.slice(1)) {
		const lower = attr.toLowerCase();
		if (lower.startsWith('max-age=')) {
			const maxAge = parseInt(attr.slice(8));
			if (!isNaN(maxAge)) {
				expires = Date.now() + maxAge * 1000;
				break;
			}
		} else if (lower.startsWith('expires=')) {
			const date = new Date(attr.slice(8));
			if (!isNaN(date.getTime())) {
				expires = date.getTime();
			}
		}
	}

	return { name, value, expires };
};

export const getEvents = async (
	query: Omit<Partial<EventsQuery>, 'season'> & { season: number },
	cancelled: () => boolean
) => {
	const q = { ...defaultQuery, ...query };

	const params = new URLSearchParams();
	if (q.country) params.append('country_id', q.country.toString());
	if (q.region) params.append('country_region_id', q.region.toString());
	if (q.season) params.append('seasonId', q.season.toString());
	if (q.type) params.append('eventType', q.type.toString());
	if (q.formats.length > 0) q.formats.forEach((f) => params.append('event_tags[]', f.toString()));
	if (q.name) params.append('name', q.name);
	if (q.grade) params.append('grade_level_id', q.grade.id.toString());
	if (q.level) params.append('level_class_id', q.level.id.toString());
	if (q.from) params.append('from_date', q.from);
	if (q.to) params.append('to_date', q.to);
	if (q.eventRegion) params.append('event_region', q.eventRegion.toString());

	const regionsPromise = loadEventRegions(q.season).catch(() => []);
	const cookieStore = await cookies;

	const loadPage = async (page: number) => {
		const storedCookies = (await cookieStore.get<Cookie[]>('cookies')) ?? [];
		const now = Date.now();
		const validCookies = storedCookies.filter((c) => c.expires > now);

		params.set('page', page.toString());

		const target = `https://www.robotevents.com/robot-competitions/${'vex-robotics-competition'}${params.toString().length > 0 ? `?${params.toString()}` : ''}`;

		const cookieHeader = validCookies.map((c) => `${c.name}=${c.value}`).join('; ');

		const response = await window.fetchCORS(target, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
				Authorization: `Bearer ${CONSTANTS.ROBOTEVENTS_API_KEY}`,
				...(cookieHeader.length > 0 ? { Cookie: cookieHeader } : {}),
				accept:
					'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
				'accept-language': 'en-US,en;q=0.9,es-US;q=0.8,es;q=0.7',
				'cache-control': 'no-cache',
				pragma: 'no-cache',
				priority: 'u=0, i',
				'sec-ch-ua': '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
				'sec-ch-ua-mobile': '?0',
				'sec-ch-ua-platform': '"Windows"',
				'sec-fetch-dest': 'document',
				'sec-fetch-mode': 'navigate',
				'sec-fetch-site': 'none',
				'sec-fetch-user': '?1',
				'upgrade-insecure-requests': '1',
			}
		});

		const responseHeaders = response.headers as unknown as Headers;
		const setCookieValues: string[] =
			typeof responseHeaders.getSetCookie === 'function'
				? responseHeaders.getSetCookie()
				: ([responseHeaders.get('set-cookie')].filter(Boolean) as string[]);

		if (setCookieValues.length > 0) {
			const newCookies = setCookieValues
				.map(parseSetCookieHeader)
				.filter((c): c is Cookie => c !== null);

			const merged = [...validCookies];
			for (const nc of newCookies) {
				const idx = merged.findIndex((c) => c.name === nc.name);
				if (idx !== -1) {
					merged[idx] = nc;
				} else {
					merged.push(nc);
				}
			}

			await cookieStore.set('cookies', merged);
			await cookieStore.save();
		}

		const raw = await response.text();

		const regions = await regionsPromise;

		const document = new DOMParser().parseFromString(raw, 'text/html');

		const parseRobotEventsDate = (s: string): [Date] | [Date, Date] => {
			const isDualDate = /^\d{1,2}-[A-Za-z]{3}-\d{4} - \d{1,2}-[A-Za-z]{3}-\d{4}$/.test(s);

			if (isDualDate) {
				const [start, end] = s.split(' - ');
				return [parseRobotEventsDate(start)[0], parseRobotEventsDate(end)[0]];
			}

			const [day, mon, year] = s.split('-');

			const months: Record<string, number> = {
				Jan: 0,
				Feb: 1,
				Mar: 2,
				Apr: 3,
				May: 4,
				Jun: 5,
				Jul: 6,
				Aug: 7,
				Sep: 8,
				Oct: 9,
				Nov: 10,
				Dec: 11
			};

			return [new Date(Number(year), months[mon], Number(day))];
		};

		const items = Array.from(document.querySelectorAll('.card-body')).slice(1);

		if (document.title === 'Just a moment...') {
			throw new Error('Cloudflare is blocking event search.\nPlease try again later.');
		}

		const events = document.body.textContent?.includes('No matching events found')
			? []
			: items.map((item) => ({
					name: item.querySelector('a')?.childNodes?.[0]?.textContent?.trim?.() ?? '',
					status:
						item
							.querySelector('.col-sm-6')
							?.children[0].textContent?.replace('Status: ', '')
							.trim() ?? '',
					spots: parseInt(
						item
							.querySelector('.col-sm-6')
							?.children[1].textContent?.replace('Spots: ', '')
							.trim() ?? '0'
					),
					date: parseRobotEventsDate(
						item
							.querySelector('.col-sm-6')
							?.children[2].textContent?.replace('Date: ', '')
							.trim() ?? '0'
					),
					region: regions.find(
						(r) =>
							r.name ===
							item
								.querySelector('.col-sm-6')
								?.children[3].textContent?.replace('Region: ', '')
								.trim()
					),
					sku:
						item
							.querySelectorAll('.col-sm-6')[1]
							.children[0].textContent?.replace('Event Code: ', '')
							.trim() ?? '',
					type:
						item
							.querySelectorAll('.col-sm-6')[1]
							.children[1].textContent?.replace('Type: ', '')
							.trim() ?? '',
					location: (() => {
						const rawLocation =
							item
								.querySelectorAll('.col-sm-6')[1]
								.children[2].textContent?.replace('Location: ', '')
								.trim() ?? '';
						if (rawLocation.length === 0) return null;

						const split = rawLocation.split(',').map((s) => s.trim());

						return {
							address: split[0],
							city: split[1],
							state: split[2],
							zip: split[3],
							country: split[4]
						};
					})()
				}));

		return {
			events,
			pages: parseInt(
				Array.from(document.querySelectorAll('.page-item .page-link')).at(-2)?.textContent ?? '1'
			)
		};
	};

	await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait a second to avoid hitting Cloudflare immediately
	if (cancelled()) {
		throw new Error('Event search cancelled');
	}

	const res = await loadPage(1);

	return {
		events: res.events,
		pages: res.pages,
		loadPage: async (page: number) => {
			if (page < 1 || page > res.pages) throw new Error('Invalid page number');
			return (await loadPage(page)).events;
		}
	};
};
