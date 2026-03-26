import AsyncStorage from '@react-native-async-storage/async-storage';
import { parse, HTMLElement, TextNode } from 'node-html-parser';

export type InlineSegment =
	| { t: 'text'; s: string }
	| { t: 'ref'; id: string; s: string }
	| { t: 'bold'; s: string }
	| { t: 'italic'; s: string };

const LIST_CLASSES = [
	'bullet',
	'subbullet',
	'subsubbullet',
	'numbers',
	'alphabullet',
	'romanbullet'
] as const;
export type ListItemClass = (typeof LIST_CLASSES)[number];

export interface ListItem {
	cls: ListItemClass;
	violations: boolean;
	spans: InlineSegment[];
	children: ListItem[];
}

export type Block =
	| { type: 'paragraph'; spans: InlineSegment[] }
	| { type: 'note'; spans: InlineSegment[] }
	| { type: 'list'; ordered: boolean; items: ListItem[] }
	| { type: 'figure'; src: string; alt: string; caption: string }
	| { type: 'redbox'; blocks: Block[] }
	| { type: 'greybox'; blocks: Block[] }
	| { type: 'vexubox'; blocks: Block[] }
	| { type: 'table'; headers: string[]; rows: string[][] };

export interface ManualEntry {
	code?: string;
	term?: string;
	summary?: string;
	sourceId?: string;
	leadSpans: InlineSegment[];
	blocks: Block[];
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

export const spansText = (spans: InlineSegment[]): string => spans.map((s) => s.s).join('');

const blocksText = (blocks: Block[]): string => {
	const parts: string[] = [];
	for (const b of blocks) {
		if (b.type === 'paragraph' || b.type === 'note') {
			parts.push(spansText(b.spans));
		} else if (b.type === 'list') {
			const walk = (items: ListItem[]) => {
				for (const item of items) {
					parts.push(spansText(item.spans));
					walk(item.children);
				}
			};
			walk(b.items);
		} else if (b.type === 'redbox' || b.type === 'greybox' || b.type === 'vexubox') {
			parts.push(blocksText(b.blocks));
		} else if (b.type === 'table') {
			parts.push(...b.headers, ...b.rows.flat());
		}
	}
	return parts.join(' ');
};

export const entrySearchText = (entry: ManualEntry): string =>
	[spansText(entry.leadSpans), blocksText(entry.blocks)].join(' ');

const COOKIE_STORE_PREFIX = 'vexrobotics-cookies';
const CACHE_VERSION_KEY = 'gameManual:version';
const CACHE_DATA_KEY = 'gameManual:data';
export const MANUAL_URL = 'https://www.vexrobotics.com/push-back-manual';

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

const norm = (s: string) => s.replace(/\s+/g, ' ');

const parseInline = (el: HTMLElement): InlineSegment[] => {
	const result: InlineSegment[] = [];
	for (const node of el.childNodes) {
		if (node instanceof TextNode) {
			const s = norm(node.text);
			if (s) result.push({ t: 'text', s });
			continue;
		}
		if (!(node instanceof HTMLElement)) continue;
		const tag = node.tagName.toLowerCase();
		if (tag === 'a' && node.getAttribute('data-bs-toggle') === 'offcanvas') {
			const id = (node.getAttribute('href') ?? '').replace('#', '');
			const s = node.text.trim();
			if (s) result.push({ t: 'ref', id, s });
			continue;
		}
		if (tag === 'b' || tag === 'strong') {
			const s = node.text.trim();
			if (s) result.push({ t: 'bold', s });
			continue;
		}
		if (tag === 'i' || tag === 'em') {
			const s = node.text.trim();
			if (s) result.push({ t: 'italic', s });
			continue;
		}
		if (tag === 'span') {
			const cls = node.getAttribute('class') ?? '';
			if (cls.includes('d_Term') || cls.includes('r_ruleSumm')) continue;
			result.push(...parseInline(node));
			continue;
		}
		if (['ul', 'ol', 'div', 'table', 'hr', 'br', 'img'].includes(tag)) continue;
		result.push(...parseInline(node));
	}
	return result;
};

const parseLeadSpans = (el: HTMLElement): InlineSegment[] => {
	const result: InlineSegment[] = [];
	let past = false;
	let stripDash = false;
	for (const node of el.childNodes) {
		if (node instanceof HTMLElement) {
			const cls = node.getAttribute('class') ?? '';
			if (cls.includes('d_Term')) {
				past = true;
				stripDash = true;
				continue;
			}
			if (cls.includes('r_ruleSumm')) {
				stripDash = false;
				continue;
			}
			const tag = node.tagName.toLowerCase();
			if (['ul', 'ol', 'div', 'table'].includes(tag)) continue;
		}
		if (!past) continue;
		if (node instanceof TextNode) {
			let s = norm(node.text);
			if (stripDash) {
				s = s.replace(/^\s*[-\u2013\u2014]\s*/, '');
				stripDash = false;
			}
			if (s.trim()) result.push({ t: 'text', s });
			continue;
		}
		if (!(node instanceof HTMLElement)) continue;
		const tag = node.tagName.toLowerCase();
		if (tag === 'a' && node.getAttribute('data-bs-toggle') === 'offcanvas') {
			const id = (node.getAttribute('href') ?? '').replace('#', '');
			const s = node.text.trim();
			if (s) result.push({ t: 'ref', id, s });
			continue;
		}
		if (tag === 'b' || tag === 'strong') {
			const s = node.text.trim();
			if (s) result.push({ t: 'bold', s });
			continue;
		}
		if (tag === 'i' || tag === 'em') {
			const s = node.text.trim();
			if (s) result.push({ t: 'italic', s });
			continue;
		}
		result.push(...parseInline(node));
	}
	return result;
};

const parseListItemClass = (cls: string): { itemCls: ListItemClass; violations: boolean } => {
	const tokens = cls.split(/\s+/);
	const violations = tokens.includes('violations');
	const itemCls = LIST_CLASSES.find((c) => tokens.includes(c)) ?? 'bullet';
	return { itemCls, violations };
};

const parseListItems = (el: HTMLElement): ListItem[] => {
	const items: ListItem[] = [];
	for (const li of el.childNodes) {
		if (!(li instanceof HTMLElement) || li.tagName.toLowerCase() !== 'li') continue;
		const { itemCls, violations } = parseListItemClass(li.getAttribute('class') ?? '');
		const spans: InlineSegment[] = [];
		const children: ListItem[] = [];
		for (const child of li.childNodes) {
			if (child instanceof HTMLElement) {
				const tag = child.tagName.toLowerCase();
				if (tag === 'ul' || tag === 'ol') {
					children.push(...parseListItems(child));
					continue;
				}
				if (tag === 'div') continue;
				if (tag === 'a' && child.getAttribute('data-bs-toggle') === 'offcanvas') {
					const id = (child.getAttribute('href') ?? '').replace('#', '');
					const s = child.text.trim();
					if (s) spans.push({ t: 'ref', id, s });
					continue;
				}
				if (tag === 'b' || tag === 'strong') {
					const s = child.text.trim();
					if (s) spans.push({ t: 'bold', s });
					continue;
				}
				if (tag === 'i' || tag === 'em') {
					const s = child.text.trim();
					if (s) spans.push({ t: 'italic', s });
					continue;
				}
				spans.push(...parseInline(child));
			} else if (child instanceof TextNode) {
				const s = norm(child.text);
				if (s) spans.push({ t: 'text', s });
			}
		}
		items.push({ cls: itemCls, violations, spans, children });
	}
	return items;
};

const parseBlock = (el: HTMLElement): Block | Block[] | null => {
	const tag = el.tagName.toLowerCase();
	const cls = el.getAttribute('class') ?? '';
	if (tag === 'p') {
		if (cls.includes('VRC_Section-Sub-head') || cls.includes('VRC_Section-Header')) return null;
		if (cls.includes('text-center')) return null;
		if (cls.includes('notes')) return { type: 'note', spans: parseInline(el) };
		const spans = parseInline(el);
		if (
			!spans
				.map((s) => s.s)
				.join('')
				.trim()
		)
			return null;
		return { type: 'paragraph', spans };
	}
	if (tag === 'ul' || tag === 'ol') {
		const items = parseListItems(el);
		return items.length > 0 ? { type: 'list', ordered: tag === 'ol', items } : null;
	}
	if (tag === 'div') {
		if (cls.includes('redbox')) return { type: 'redbox', blocks: parseChildBlocks(el) };
		if (cls.includes('greybox')) return { type: 'greybox', blocks: parseChildBlocks(el) };
		if (cls.includes('vexubox')) return { type: 'vexubox', blocks: parseChildBlocks(el) };
		if (cls.includes('row')) {
			const figs: Block[] = [];
			for (const col of el.querySelectorAll('.col')) {
				const img = col.querySelector('img');
				if (!img) continue;
				const src = img.getAttribute('src') ?? '';
				if (!src) continue;
				const captionEl = col.querySelector('p.text-center');
				const caption = (captionEl?.text ?? img.getAttribute('alt') ?? '').trim();
				figs.push({ type: 'figure', src, alt: img.getAttribute('alt') ?? '', caption });
			}
			if (figs.length > 0) return figs;
			const inner = parseChildBlocks(el);
			return inner.length > 0 ? inner : null;
		}
		const inner = parseChildBlocks(el);
		return inner.length > 0 ? inner : null;
	}
	if (tag === 'table') {
		const headers = el.querySelectorAll('thead th').map((th) => th.text.trim());
		const rows = el
			.querySelectorAll('tbody tr')
			.map((tr) => tr.querySelectorAll('td').map((td) => td.text.trim()));
		if (headers.length === 0 && rows.length === 0) return null;
		return { type: 'table', headers, rows };
	}
	return null;
};

const parseChildBlocks = (el: HTMLElement): Block[] => {
	const blocks: Block[] = [];
	let pending: InlineSegment[] = [];
	const flush = () => {
		if (
			pending.length > 0 &&
			pending
				.map((s) => s.s)
				.join('')
				.trim()
		) {
			blocks.push({ type: 'paragraph', spans: pending });
		}
		pending = [];
	};
	for (const child of el.childNodes) {
		if (child instanceof TextNode) {
			const s = norm(child.text);
			if (s && (s.trim() || pending.length > 0)) pending.push({ t: 'text', s });
			continue;
		}
		if (!(child instanceof HTMLElement)) continue;
		const tag = child.tagName.toLowerCase();
		if (['p', 'ul', 'ol', 'div', 'table', 'hr'].includes(tag)) {
			flush();
			const r = parseBlock(child);
			if (r !== null) {
				if (Array.isArray(r)) blocks.push(...r);
				else blocks.push(r);
			}
			continue;
		}
		if (tag === 'a' && child.getAttribute('data-bs-toggle') === 'offcanvas') {
			const id = (child.getAttribute('href') ?? '').replace('#', '');
			const s = child.text.trim();
			if (s) pending.push({ t: 'ref', id, s });
		} else if (tag === 'b' || tag === 'strong') {
			const s = child.text.trim();
			if (s) pending.push({ t: 'bold', s });
		} else if (tag === 'i' || tag === 'em') {
			const s = child.text.trim();
			if (s) pending.push({ t: 'italic', s });
		} else {
			pending.push(...parseInline(child));
		}
	}
	flush();
	return blocks;
};

const addBlock = (entry: ManualEntry, r: Block | Block[] | null) => {
	if (r === null) return;
	if (Array.isArray(r)) entry.blocks.push(...r);
	else entry.blocks.push(r);
};

const getContentDiv = (
	html: string,
	doc: ReturnType<typeof parse>,
	id: string
): HTMLElement | null => {
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

const parseOffcanvases = (doc: ReturnType<typeof parse>, ruleMap: Record<string, ManualEntry>) => {
	for (const oc of doc.querySelectorAll('.offcanvas[id]')) {
		const id = oc.getAttribute('id') ?? '';
		if (!id || ruleMap[id]) continue;
		const titleEl = oc.querySelector('.offcanvas-title');
		const body = oc.querySelector('.offcanvas-body');
		if (!body) continue;
		const rawTitle = (titleEl?.text ?? '').replace(/\s+/g, ' ').trim();
		const term = rawTitle.replace(/^<[A-Z]+\d+[A-Za-z]*>\s*/, '').trim() || id;
		const blocks = parseChildBlocks(body);
		ruleMap[id.toLowerCase()] = { term, leadSpans: [], blocks, sourceId: id.toLowerCase() };
	}
};

export const parseManual = (html: string): ManualData => {
	const doc = parse(html);
	const version = extractVersion(html);
	const sections: ManualSection[] = [];
	const ruleMap: Record<string, ManualEntry> = {};

	const outerNav = doc.querySelector('nav.nav.nav-pills.flex-column');
	if (!outerNav) return { version, sections, ruleMap };

	const sectionsMeta: {
		id: string;
		title: string;
		subsections: { id: string; title: string }[];
	}[] = [];
	let currentSection: (typeof sectionsMeta)[0] | null = null;

	for (const node of outerNav.childNodes) {
		if (!(node instanceof HTMLElement)) continue;
		const tag = node.tagName?.toLowerCase();
		if (tag === 'a') {
			const id = (node.getAttribute('href') ?? '').replace('#', '');
			const title = node.text.replace(/\s+/g, ' ').trim();
			if (id === 'prefix') {
				currentSection = null;
				sectionsMeta.push({
					id: 'prefix',
					title,
					subsections: [
						{ id: 'changelog', title: 'Changelog' },
						{ id: 'quickreference', title: 'Quick Reference Guide' }
					]
				});
				continue;
			}
			if (['changelog', 'quickreference'].includes(id)) {
				currentSection = null;
				continue;
			}
			currentSection = { id, title, subsections: [] };
			sectionsMeta.push(currentSection);
		} else if (tag === 'nav' && currentSection) {
			for (const a of node.querySelectorAll('a')) {
				currentSection.subsections.push({
					id: (a.getAttribute('href') ?? '').replace('#', ''),
					title: a.text.replace(/\s+/g, ' ').trim()
				});
			}
		}
	}

	const parseSubsectionDiv = (id: string, title: string): ManualSubsection => {
		const div = getContentDiv(html, doc, id);
		const entries: ManualEntry[] = [];
		if (!div) return { id, title, entries };

		let current: ManualEntry | null = null;

		for (const node of div.childNodes) {
			if (!(node instanceof HTMLElement)) continue;
			const tag = node.tagName.toLowerCase();
			const cls = node.getAttribute('class') ?? '';

			if (
				tag === 'hr' ||
				cls.includes('VRC_Section-Sub-head') ||
				cls.includes('VRC_Section-Header')
			)
				continue;

			if (tag === 'p') {
				const termSpan =
					node.childNodes.find(
						(n): n is HTMLElement =>
							n instanceof HTMLElement &&
							n.tagName.toLowerCase() === 'span' &&
							(n.getAttribute('class') ?? '').includes('d_Term')
					) ?? null;

				if (termSpan) {
					const rawTerm = termSpan.text.trim();
					if (!rawTerm || /^Figure\s/i.test(rawTerm)) {
						if (current) addBlock(current, parseBlock(node));
						continue;
					}
					const codeMatch = rawTerm.match(/^<([A-Z]+\d+[A-Za-z]*)>$/);
					if (codeMatch) {
						const code = codeMatch[1];
						const summaryEl = node.querySelector('span.r_ruleSumm');
						const summary = summaryEl?.text.trim() ?? '';
						current = {
							code,
							summary: summary || undefined,
							sourceId: code.toLowerCase(),
							leadSpans: parseLeadSpans(node),
							blocks: []
						};
						ruleMap[code.toLowerCase()] = current;
					} else {
						current = { term: rawTerm, leadSpans: parseLeadSpans(node), blocks: [] };
					}
					entries.push(current);
					for (const child of node.childNodes) {
						if (!(child instanceof HTMLElement)) continue;
						const ct = child.tagName.toLowerCase();
						if (['ul', 'ol', 'div', 'table'].includes(ct)) addBlock(current!, parseBlock(child));
					}
					continue;
				}
			}

			if (!current) {
				current = { leadSpans: [], blocks: [] };
				entries.push(current);
			}
			addBlock(current, parseBlock(node));
		}

		return { id, title, entries };
	};

	const seenSectionIds = new Set<string>();
	for (const s of sectionsMeta) {
		if (seenSectionIds.has(s.id)) continue;
		seenSectionIds.add(s.id);
		const seenSubIds = new Set<string>();
		const uniqueSubs = s.subsections.filter((sub) => {
			if (seenSubIds.has(sub.id)) return false;
			seenSubIds.add(sub.id);
			return true;
		});
		const subsections =
			uniqueSubs.length === 0
				? [parseSubsectionDiv(s.id, s.title)]
				: uniqueSubs.map((sub) => parseSubsectionDiv(sub.id, sub.title));
		sections.push({ id: s.id, title: s.title, subsections });
	}

	parseOffcanvases(doc, ruleMap);

	return { version, sections, ruleMap };
};

export const getManual = async (
	onProgress?: (progress: number, label: string) => void
): Promise<ManualData> => {
	onProgress?.(0.05, 'Connecting...');

	let html: string;
	try {
		html = await fetchManualHTML();
	} catch (err) {
		throw err;
	}

	onProgress?.(0.65, 'Processing manual...');
	const data = parseManual(html);
	onProgress?.(1, 'Done');
	return data;
};
