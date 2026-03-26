import AsyncStorage from '@react-native-async-storage/async-storage';
import { parse, HTMLElement } from 'node-html-parser';

export interface ManualImage {
	src: string;
	alt: string;
	caption?: string;
}

export interface ManualEntry {
	code?: string;
	term?: string;
	summary?: string;
	body: string;
	images: ManualImage[];
}

export interface ManualSubsection {
	id: string;
	title: string;
	entries: ManualEntry[];
}

export interface ManualSection {
	id: string;
	title: string;
	subsections: ManualSubsection[];
}

export interface ManualData {
	version: string;
	sections: ManualSection[];
	ruleMap: Record<string, ManualEntry>;
}

const COOKIE_STORE_PREFIX = 'vexrobotics-cookies';
const CACHE_VERSION_KEY = 'gameManual:version';
const CACHE_DATA_KEY = 'gameManual:data';
const MANUAL_URL = 'https://www.vexrobotics.com/push-back-manual';

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

const createAsyncStorageStore = () => ({
	get: async <T>(key: string): Promise<T | null> => {
		const raw = await AsyncStorage.getItem(`${COOKIE_STORE_PREFIX}:${key}`);
		return raw !== null ? (JSON.parse(raw) as T) : null;
	},
	set: async (key: string, value: unknown): Promise<void> => {
		await AsyncStorage.setItem(`${COOKIE_STORE_PREFIX}:${key}`, JSON.stringify(value));
	},
	save: async (): Promise<void> => {}
});

const cookieStore = createAsyncStorageStore();

const fetchManualHTML = async (): Promise<string> => {
	const storedCookies = (await cookieStore.get<Cookie[]>('cookies')) ?? [];
	const now = Date.now();
	const validCookies = storedCookies.filter((c) => c.expires > now);
	const cookieHeader = validCookies.map((c) => `${c.name}=${c.value}`).join('; ');

	const response = await fetch(MANUAL_URL, {
		headers: {
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
			accept:
				'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
			'accept-language': 'en-US,en;q=0.9',
			'cache-control': 'no-cache',
			pragma: 'no-cache',
			priority: 'u=0, i',
			'sec-ch-ua': '"Chromium";v="124", "Not-A.Brand";v="24", "Google Chrome";v="124"',
			'sec-ch-ua-mobile': '?0',
			'sec-ch-ua-platform': '"Windows"',
			'sec-fetch-dest': 'document',
			'sec-fetch-mode': 'navigate',
			'sec-fetch-site': 'none',
			'sec-fetch-user': '?1',
			'upgrade-insecure-requests': '1',
			...(cookieHeader.length > 0 ? { Cookie: cookieHeader } : {})
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

	const html = await response.text();

	const doc = parse(html);
	if (doc.querySelector('title')?.text?.trim() === 'Just a moment...') {
		throw new Error('Cloudflare is blocking the game manual.\nPlease try again later.');
	}

	return html;
};

export const extractVersion = (html: string): string => {
	const match = html.match(/Version \d+\.\d+ - [A-Za-z]+ \d+, \d{4}/);
	return match ? match[0] : 'unknown';
};

const cleanText = (text: string): string => text.replace(/\s+/g, ' ').trim();

const convertBodyToText = (el: HTMLElement): string => {
	let r = el.innerHTML;
	r = r.replace(
		/<a[^>]*data-bs-toggle="offcanvas"[^>]*href="#([^"]+)"[^>]*>([\s\S]*?)<\/a>/g,
		(_m, _h, text) =>
			text
				.replace(/<[^>]+>/g, '')
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>')
				.trim()
	);
	r = r
		.replace(/<[^>]+>/g, ' ')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&')
		.replace(/&nbsp;/g, ' ')
		.replace(/&#\d+;/g, ' ');
	return cleanText(r);
};

const extractImages = (el: HTMLElement): ManualImage[] => {
	const results: ManualImage[] = [];
	for (const img of el.querySelectorAll('img')) {
		const src = img.getAttribute('src') ?? '';
		if (!src) continue;
		let caption = img.getAttribute('alt') ?? '';
		for (const p of el.querySelectorAll('p.text-center')) {
			const t = p.querySelector('span.d_Term');
			if (t && /Figure/.test(t.text)) {
				caption = cleanText(p.text);
				break;
			}
		}
		results.push({ src, alt: caption, caption });
	}
	return results;
};

const getContentDiv = (html: string, doc: ReturnType<typeof parse>, id: string): HTMLElement | null => {
	const el = doc.querySelector(`[id="${id}"]`);
	if (el) return el;

	const idIdx = html.indexOf(`id="${id}"`);
	if (idIdx === -1) return null;

	const divStart = html.lastIndexOf('<div', idIdx);
	if (divStart === -1) return null;

	let depth = 1;
	let i = divStart + 4;
	while (i < html.length && depth > 0) {
		const nextOpen = html.indexOf('<div', i);
		const nextClose = html.indexOf('</div>', i);
		if (nextClose === -1) break;
		if (nextOpen !== -1 && nextOpen < nextClose) {
			depth++;
			i = nextOpen + 4;
		} else {
			depth--;
			if (depth === 0) {
				const chunk = html.slice(divStart, nextClose + 6);
				return parse(chunk).querySelector('div') ?? null;
			}
			i = nextClose + 6;
		}
	}
	return null;
};

export const parseManual = (html: string): ManualData => {
	const doc = parse(html);
	const version = extractVersion(html);
	const sections: ManualSection[] = [];
	const ruleMap: Record<string, ManualEntry> = {};

	const outerNav = doc.querySelector('nav.nav.nav-pills.flex-column');
	if (!outerNav) return { version, sections, ruleMap };

	const sectionsMeta: { id: string; title: string; subsections: { id: string; title: string }[] }[] = [];
	let currentSection: (typeof sectionsMeta)[0] | null = null;

	for (const node of outerNav.childNodes) {
		if (!(node instanceof HTMLElement)) continue;
		const tag = node.tagName?.toLowerCase();
		if (tag === 'a') {
			const id = (node.getAttribute('href') ?? '').replace('#', '');
			const title = cleanText(node.text);
			if (['prefix', 'changelog', 'quickreference'].includes(id)) {
				currentSection = null;
				continue;
			}
			currentSection = { id, title, subsections: [] };
			sectionsMeta.push(currentSection);
		} else if (tag === 'nav' && currentSection) {
			for (const a of node.querySelectorAll('a')) {
				currentSection.subsections.push({
					id: (a.getAttribute('href') ?? '').replace('#', ''),
					title: cleanText(a.text)
				});
			}
		}
	}

	const parseSubsectionDiv = (id: string, title: string): ManualSubsection => {
		const div = getContentDiv(html, doc, id);
		const entries: ManualEntry[] = [];
		if (!div) return { id, title, entries };

		for (const p of div.querySelectorAll('p')) {
			const t = p.querySelector('span.d_Term');
			if (!t) continue;
			const raw = t.innerHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
			if (!raw) continue;
			const codeMatch = raw.match(/^<([A-Z]+\d+[A-Za-z]*)>$/);
			if (codeMatch) {
				const code = codeMatch[1];
				const summaryEl = p.querySelector('span.r_ruleSumm');
				const summary = summaryEl ? cleanText(summaryEl.text) : undefined;
				let body = convertBodyToText(p);
				body = body.replace(new RegExp(`^<${code}>\\s*`), '').trim();
				const entry: ManualEntry = { code, summary, body, images: extractImages(p) };
				entries.push(entry);
				ruleMap[code] = entry;
			} else if (!/^Figure/.test(raw)) {
				const term = cleanText(raw);
				let body = convertBodyToText(p);
				body = body
					.replace(new RegExp(`^${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-\u2013\u2014]\\s*`), '')
					.trim();
				entries.push({ term, body, images: extractImages(p) });
			}
		}

		const allImgs = extractImages(div);
		const usedSrcs = new Set(entries.flatMap((e) => e.images.map((i) => i.src)));
		const standaloneImgs = allImgs.filter((i) => !usedSrcs.has(i.src));
		if (standaloneImgs.length > 0) {
			if (entries.length > 0) {
				entries[entries.length - 1].images.push(...standaloneImgs);
			} else {
				entries.push({ body: convertBodyToText(div).slice(0, 500), images: standaloneImgs });
			}
		}

		if (entries.length === 0) {
			entries.push({ body: convertBodyToText(div).slice(0, 500), images: [] });
		}
		return { id, title, entries };
	};

	for (const s of sectionsMeta) {
		const subsections =
			s.subsections.length === 0
				? [parseSubsectionDiv(s.id, s.title)]
				: s.subsections.map((sub) => parseSubsectionDiv(sub.id, sub.title));
		sections.push({ id: s.id, title: s.title, subsections });
	}

	return { version, sections, ruleMap };
};

export const getManual = async (): Promise<ManualData> => {
	let cachedVersion: string | null = null;
	let cachedDataRaw: string | null = null;

	try {
		cachedVersion = await AsyncStorage.getItem(CACHE_VERSION_KEY);
		cachedDataRaw = await AsyncStorage.getItem(CACHE_DATA_KEY);
	} catch {
		// ignore read errors
	}

	let html: string | null = null;

	try {
		html = await fetchManualHTML();
	} catch (err) {
		if (cachedDataRaw) {
			return JSON.parse(cachedDataRaw) as ManualData;
		}
		throw err;
	}

	const liveVersion = extractVersion(html);

	if (liveVersion !== 'unknown' && liveVersion === cachedVersion && cachedDataRaw) {
		try {
			return JSON.parse(cachedDataRaw) as ManualData;
		} catch {
			// fall through to re-parse
		}
	}

	const data = parseManual(html);

	try {
		await AsyncStorage.setItem(CACHE_VERSION_KEY, data.version);
		await AsyncStorage.setItem(CACHE_DATA_KEY, JSON.stringify(data));
	} catch {
		// ignore write errors
	}

	return data;
};
