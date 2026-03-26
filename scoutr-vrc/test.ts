import { parse, HTMLElement } from 'node-html-parser';

const content = await Bun.file('./push-back-manual.html').text();
const doc = parse(content);

const cleanText = (t: string) => t.replace(/\s+/g, ' ').replace(/&amp;/g, '&').trim();

// ── Version ───────────────────────────────────────────────────────────────────
const versionMatch = content.match(/Version \d+\.\d+ - [A-Za-z]+ \d+, \d{4}/);
console.log('VERSION:', versionMatch?.[0] ?? 'unknown');

// ── Sidebar nav → section/subsection hierarchy ────────────────────────────────
const outerNav = doc.querySelector('nav.nav.nav-pills.flex-column');
if (!outerNav) throw new Error('Sidebar nav not found');

const sectionsMeta: { id: string; title: string; subsections: { id: string; title: string }[] }[] =
	[];
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

console.log('\n=== SECTIONS ===');
for (const s of sectionsMeta) {
	console.log(`[${s.id}] ${s.title}`);
	for (const sub of s.subsections) console.log(`  [${sub.id}] ${sub.title}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function convertBodyToText(el: HTMLElement): string {
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
}

function extractImages(el: HTMLElement): { src: string; caption: string }[] {
	const results: { src: string; caption: string }[] = [];
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
		results.push({ src, caption });
	}
	return results;
}

// ── Regex fallback: extract div by id when node-html-parser querySelector fails ──
function getContentDiv(id: string): HTMLElement | null {
	const el = doc.querySelector(`[id="${id}"]`);
	if (el) return el;

	const idIdx = content.indexOf(`id="${id}"`);
	if (idIdx === -1) return null;

	const divStart = content.lastIndexOf('<div', idIdx);
	if (divStart === -1) return null;

	let depth = 1;
	let i = divStart + 4;
	while (i < content.length && depth > 0) {
		const nextOpen = content.indexOf('<div', i);
		const nextClose = content.indexOf('</div>', i);
		if (nextClose === -1) break;
		if (nextOpen !== -1 && nextOpen < nextClose) {
			depth++;
			i = nextOpen + 4;
		} else {
			depth--;
			if (depth === 0) {
				const chunk = content.slice(divStart, nextClose + 6);
				return parse(chunk).querySelector('div') ?? null;
			}
			i = nextClose + 6;
		}
	}
	return null;
}

// ── Parse subsection: ALL rules/defs are inline via span.d_Term ──────────────
// Rule:       <p><span class="d_Term">&lt;SC1&gt;</span> rule text</p>
// Definition: <p><span class="d_Term">TermName</span> - definition text</p>

interface ParsedEntry {
	type: 'rule' | 'definition' | 'content';
	code?: string;
	summary?: string;
	term?: string;
	body: string;
	images: { src: string; caption: string }[];
}

function parseSubsectionDiv(
	id: string,
	title: string
): { id: string; title: string; entries: ParsedEntry[] } {
	const div = getContentDiv(id);
	const entries: ParsedEntry[] = [];
	if (!div) {
		console.warn(`[WARN] No div id="${id}"`);
		return { id, title, entries };
	}

	for (const p of div.querySelectorAll('p')) {
		const t = p.querySelector('span.d_Term');
		if (!t) continue;
		const raw = t.innerHTML.replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
		if (!raw) continue;
		const codeMatch = raw.match(/^<([A-Z]+\d+[A-Za-z]*)>$/);
		if (codeMatch) {
			const code = codeMatch[1];
			const summary = cleanText(p.querySelector('span.r_ruleSumm')?.text ?? '');
			let body = convertBodyToText(p);
			// Strip leading "<CODE>" from body
			body = body.replace(new RegExp(`^<${code}>\\s*`), '').trim();
			entries.push({
				type: 'rule',
				code,
				summary: summary || undefined,
				body,
				images: extractImages(p)
			});
		} else if (!/^Figure/.test(raw)) {
			const term = cleanText(raw);
			let body = convertBodyToText(p);
			// Strip leading "Term - " from body
			body = body
				.replace(new RegExp(`^${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[-–—]\\s*`), '')
				.trim();
			entries.push({ type: 'definition', term, body, images: extractImages(p) });
		}
	}

	// Collect images not already in entries (standalone images in the subsection)
	const allImgs = extractImages(div);
	const usedSrcs = new Set(entries.flatMap((e) => e.images.map((i) => i.src)));
	const standaloneImgs = allImgs.filter((i) => !usedSrcs.has(i.src));
	if (standaloneImgs.length > 0) {
		if (entries.length > 0) {
			entries[entries.length - 1].images.push(...standaloneImgs);
		} else {
			entries.push({
				type: 'content',
				body: convertBodyToText(div).slice(0, 500),
				images: standaloneImgs
			});
		}
	}

	if (entries.length === 0) {
		entries.push({ type: 'content', body: convertBodyToText(div).slice(0, 500), images: [] });
	}
	return { id, title, entries };
}

const parsedSections = sectionsMeta.map((s) => ({
	id: s.id,
	title: s.title,
	subsections:
		s.subsections.length === 0
			? [parseSubsectionDiv(s.id, s.title)]
			: s.subsections.map((sub) => parseSubsectionDiv(sub.id, sub.title))
}));

// ── Build ruleMap from parsed entries (for cross-ref lookups in the app) ──────
const ruleMap: Record<
	string,
	{ code: string; body: string; images: { src: string; caption: string }[] }
> = {};
for (const section of parsedSections) {
	for (const sub of section.subsections) {
		for (const e of sub.entries) {
			if (e.type === 'rule' && e.code)
				ruleMap[e.code] = { code: e.code, body: e.body, images: e.images };
		}
	}
}

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('\n=== SUMMARY ===');
let totalRules = 0,
	totalDefs = 0,
	totalImgs = 0;
for (const section of parsedSections) {
	console.log(`\n${section.title}`);
	for (const sub of section.subsections) {
		const rules = sub.entries.filter((e) => e.type === 'rule').length;
		const defs = sub.entries.filter((e) => e.type === 'definition').length;
		const imgs = sub.entries.reduce((n, e) => n + e.images.length, 0);
		totalRules += rules;
		totalDefs += defs;
		totalImgs += imgs;
		console.log(`  ${sub.title}: ${rules} rules, ${defs} defs, ${imgs} images`);
	}
}
console.log(`\nTOTAL: ${totalRules} rules, ${totalDefs} defs, ${totalImgs} images`);
console.log(`Unique rule codes in ruleMap: ${Object.keys(ruleMap).length}`);

// ── Sample rule ───────────────────────────────────────────────────────────────
const rSec = parsedSections.find((s) =>
	s.subsections.some((sub) => sub.entries.some((e) => e.type === 'rule'))
);
if (rSec) {
	const rSub = rSec.subsections.find((sub) => sub.entries.some((e) => e.type === 'rule'))!;
	const rEntry = rSub.entries.find((e) => e.type === 'rule')!;
	console.log('\n=== SAMPLE RULE ===');
	console.log('Code:', rEntry.code);
	console.log('Summary:', (rEntry as any).summary ?? '(none)');
	console.log('Body (300 chars):', rEntry.body.slice(0, 300));
	console.log('Images:', rEntry.images.length, rEntry.images[0]?.src ?? '');
}

// ── Sample definition ─────────────────────────────────────────────────────────
const dSec = parsedSections.find((s) =>
	s.subsections.some((sub) => sub.entries.some((e) => e.type === 'definition'))
);
if (dSec) {
	const dSub = dSec.subsections.find((sub) => sub.entries.some((e) => e.type === 'definition'))!;
	const dEntry = dSub.entries.find((e) => e.type === 'definition')!;
	console.log('\n=== SAMPLE DEFINITION ===');
	console.log('Term:', dEntry.term);
	console.log('Body (200 chars):', dEntry.body.slice(0, 200));
}

// ── Empty / warnings ──────────────────────────────────────────────────────────
console.log('\n=== EMPTY / WARN ===');
let issues = 0;
for (const section of parsedSections) {
	for (const sub of section.subsections) {
		if (sub.entries.length === 0) {
			console.log(`  EMPTY: [${sub.id}] ${sub.title} in ${section.title}`);
			issues++;
		}
	}
}
if (issues === 0) console.log('  none ✓');
