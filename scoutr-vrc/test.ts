import { parse, HTMLElement, TextNode } from 'node-html-parser';

const content = await Bun.file('./push-back-manual.html').text();
const doc = parse(content);

// ── Types ─────────────────────────────────────────────────────────────────────

type InlineSegment =
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
type ListItemClass = (typeof LIST_CLASSES)[number];

interface ListItem {
	cls: ListItemClass;
	violations: boolean;
	spans: InlineSegment[];
	children: ListItem[];
}

type Block =
	| { type: 'paragraph'; spans: InlineSegment[] }
	| { type: 'note'; spans: InlineSegment[] }
	| { type: 'list'; ordered: boolean; items: ListItem[] }
	| { type: 'figure'; src: string; alt: string; caption: string }
	| { type: 'redbox'; blocks: Block[] }
	| { type: 'greybox'; blocks: Block[] }
	| { type: 'vexubox'; blocks: Block[] }
	| { type: 'table'; headers: string[]; rows: string[][] };

interface ManualEntry {
	type: 'rule' | 'definition' | 'content';
	code?: string;
	term?: string;
	summary?: string;
	leadSpans: InlineSegment[];
	blocks: Block[];
}

interface ParsedSubsection {
	id: string;
	title: string;
	entries: ManualEntry[];
}

// ── Inline text helpers ────────────────────────────────────────────────────────

const norm = (s: string) => s.replace(/\s+/g, ' ');

function parseInline(el: HTMLElement): InlineSegment[] {
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
}

const spansText = (spans: InlineSegment[]) =>
	spans
		.map((s) => s.s)
		.join('')
		.trim();

// Parse inline content that follows the d_Term (and optional r_ruleSumm) span
function parseLeadSpans(el: HTMLElement): InlineSegment[] {
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
				s = s.replace(/^\s*[-–—]\s*/, '');
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
}

// ── List parser ───────────────────────────────────────────────────────────────

function parseListItemClass(cls: string): { itemCls: ListItemClass; violations: boolean } {
	const tokens = cls.split(/\s+/);
	const violations = tokens.includes('violations');
	const itemCls = LIST_CLASSES.find((c) => tokens.includes(c)) ?? 'bullet';
	return { itemCls, violations };
}

function parseListItems(el: HTMLElement): ListItem[] {
	const items: ListItem[] = [];
	for (const li of el.childNodes) {
		if (!(li instanceof HTMLElement) || li.tagName.toLowerCase() !== 'li') continue;
		const cls = li.getAttribute('class') ?? '';
		const { itemCls, violations } = parseListItemClass(cls);

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
}

// ── Block parser ──────────────────────────────────────────────────────────────

function parseBlock(el: HTMLElement): Block | Block[] | null {
	const tag = el.tagName.toLowerCase();
	const cls = el.getAttribute('class') ?? '';

	if (tag === 'p') {
		if (cls.includes('VRC_Section-Sub-head') || cls.includes('VRC_Section-Header')) return null;
		if (cls.includes('text-center')) return null;
		if (cls.includes('notes')) return { type: 'note', spans: parseInline(el) };
		const spans = parseInline(el);
		if (!spansText(spans)) return null;
		return { type: 'paragraph', spans };
	}

	if (tag === 'ul' || tag === 'ol') {
		const items = parseListItems(el);
		if (items.length === 0) return null;
		return { type: 'list', ordered: tag === 'ol', items };
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
			return figs.length > 0 ? figs : null;
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
}

function parseChildBlocks(el: HTMLElement): Block[] {
	const blocks: Block[] = [];
	let pending: InlineSegment[] = [];

	const flush = () => {
		if (pending.length > 0 && spansText(pending)) {
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
		// Inline element — accumulate into pending paragraph
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
}

function addBlock(entry: ManualEntry, r: Block | Block[] | null) {
	if (r === null) return;
	if (Array.isArray(r)) entry.blocks.push(...r);
	else entry.blocks.push(r);
}

// ── Div-by-id (regex fallback) ────────────────────────────────────────────────

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
				return parse(content.slice(divStart, nextClose + 6)).querySelector('div') ?? null;
			}
			i = nextClose + 6;
		}
	}
	return null;
}

// ── Subsection parser ─────────────────────────────────────────────────────────

function parseSubsectionDiv(id: string, title: string): ParsedSubsection {
	const div = getContentDiv(id);
	const entries: ManualEntry[] = [];
	if (!div) {
		console.warn(`[WARN] No div id="${id}"`);
		return { id, title, entries };
	}

	let current: ManualEntry | null = null;

	for (const node of div.childNodes) {
		if (!(node instanceof HTMLElement)) continue;
		const tag = node.tagName.toLowerCase();
		const cls = node.getAttribute('class') ?? '';

		if (tag === 'hr' || cls.includes('VRC_Section-Sub-head') || cls.includes('VRC_Section-Header'))
			continue;

		// Detect rule/definition: direct <p> whose first-child span is d_Term
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
						type: 'rule',
						code,
						summary: summary || undefined,
						leadSpans: parseLeadSpans(node),
						blocks: []
					};
				} else {
					current = {
						type: 'definition',
						term: rawTerm,
						leadSpans: parseLeadSpans(node),
						blocks: []
					};
				}
				entries.push(current);

				// Hoist any block-level children inside the <p> (e.g. nested <ul>)
				for (const child of node.childNodes) {
					if (!(child instanceof HTMLElement)) continue;
					const ct = child.tagName.toLowerCase();
					if (['ul', 'ol', 'div', 'table'].includes(ct)) addBlock(current, parseBlock(child));
				}
				continue;
			}
		}

		if (!current) {
			current = { type: 'content', leadSpans: [], blocks: [] };
			entries.push(current);
		}
		addBlock(current, parseBlock(node));
	}

	return { id, title, entries };
}

// ── Section 2 subsection nav ──────────────────────────────────────────────────

const outerNav = doc.querySelector('nav.nav.nav-pills.flex-column');
if (!outerNav) throw new Error('Sidebar nav not found');

const sec2Meta: { id: string; title: string }[] = [];
let inSec2 = false;

for (const node of outerNav.childNodes) {
	if (!(node instanceof HTMLElement)) continue;
	const tag = node.tagName.toLowerCase();
	if (tag === 'a') {
		const href = (node.getAttribute('href') ?? '').replace('#', '');
		if (href === 'sec2') {
			inSec2 = true;
			continue;
		}
		if (/^sec\d/.test(href) && href !== 'sec2') {
			if (inSec2) break;
		}
	}
	if (inSec2 && tag === 'nav') {
		for (const a of node.querySelectorAll('a')) {
			sec2Meta.push({
				id: (a.getAttribute('href') ?? '').replace('#', ''),
				title: a.text.replace(/\s+/g, ' ').trim()
			});
		}
	}
}

console.log('=== Section 2 Subsections ===');
for (const s of sec2Meta) console.log(`  [${s.id}] ${s.title}`);

// ── Parse Section 2 ───────────────────────────────────────────────────────────

const sec2 = sec2Meta.map((s) => parseSubsectionDiv(s.id, s.title));

// ── Stats ─────────────────────────────────────────────────────────────────────

console.log('\n=== Stats ===');
const blockCounts: Record<string, number> = {};
let totalRules = 0,
	totalDefs = 0;

for (const sub of sec2) {
	const rules = sub.entries.filter((e) => e.type === 'rule').length;
	const defs = sub.entries.filter((e) => e.type === 'definition').length;
	totalRules += rules;
	totalDefs += defs;
	for (const e of sub.entries) {
		for (const b of e.blocks) {
			blockCounts[b.type] = (blockCounts[b.type] ?? 0) + 1;
		}
	}
	console.log(`  ${sub.title}: ${rules} rules, ${defs} defs`);
}
console.log(`TOTAL: ${totalRules} rules, ${totalDefs} defs`);
console.log('Block types:', blockCounts);

// ── Deep sample: first rule per subsection ────────────────────────────────────

function renderBlock(b: Block, indent = '    '): string {
	switch (b.type) {
		case 'paragraph':
			return `${indent}[para] "${spansText(b.spans).slice(0, 90)}"`;
		case 'note':
			return `${indent}[note] "${spansText(b.spans).slice(0, 90)}"`;
		case 'list': {
			const label = b.ordered ? 'ol' : 'ul';
			const preview = b.items
				.slice(0, 3)
				.map((it) => {
					const v = it.violations ? ' [V]' : '';
					return `${indent}  [${it.cls}${v}] "${spansText(it.spans).slice(0, 65)}"${it.children.length ? ` +${it.children.length}` : ''}`;
				})
				.join('\n');
			return `${indent}[${label}:${b.items.length}]\n${preview}${b.items.length > 3 ? `\n${indent}  ...+${b.items.length - 3}` : ''}`;
		}
		case 'figure':
			return `${indent}[fig] "${b.caption.slice(0, 70)}"`;
		case 'redbox': {
			const inner = b.blocks
				.map((bb) => spansText((bb as any).spans ?? []).slice(0, 50))
				.join(' | ');
			return `${indent}[redbox:${b.blocks.length}] ${inner}`;
		}
		case 'greybox':
			return `${indent}[greybox:${b.blocks.length} blocks]`;
		case 'vexubox': {
			const inner = b.blocks.map((bb) => spansText((bb as any).spans ?? []).slice(0, 50)).join(' ');
			return `${indent}[vexubox:${b.blocks.length}] "${inner}"`;
		}
		case 'table':
			return `${indent}[table] hdrs=${b.headers.join('|')} rows=${b.rows.length}`;
	}
}

console.log('\n=== First Rule Per Subsection ===');
for (const sub of sec2) {
	const rule = sub.entries.find((e) => e.type === 'rule');
	if (!rule) continue;
	console.log(`\n[${sub.id}] ${sub.title}`);
	console.log(`  <${rule.code}>${rule.summary ? ' — ' + rule.summary : ''}`);
	const lead = spansText(rule.leadSpans).slice(0, 120);
	if (lead) console.log(`  Lead: "${lead}"`);
	for (const b of rule.blocks) console.log(renderBlock(b));
}

// ── First 3 definitions ───────────────────────────────────────────────────────

console.log('\n=== First 3 Definitions ===');
let defCount = 0;
outer: for (const sub of sec2) {
	for (const e of sub.entries) {
		if (e.type !== 'definition') continue;
		console.log(`\n  "${e.term}"`);
		console.log(`  Lead: "${spansText(e.leadSpans).slice(0, 100)}"`);
		console.log(`  Blocks: ${e.blocks.length}`);
		for (const b of e.blocks.slice(0, 3)) console.log(renderBlock(b));
		if (++defCount >= 3) break outer;
	}
}

// ── One example of each block type ───────────────────────────────────────────

console.log('\n=== Block Type Samples ===');
const wanted = ['list', 'note', 'redbox', 'greybox', 'vexubox', 'figure', 'table'] as const;
for (const type of wanted) {
	let found = false;
	for (const sub of sec2) {
		for (const e of sub.entries) {
			const b = e.blocks.find((b) => b.type === type);
			if (b) {
				console.log(`  [${type}] in <${e.code ?? e.term ?? 'content'}> (${sub.title})`);
				console.log(renderBlock(b, '    '));
				found = true;
				break;
			}
		}
		if (found) break;
	}
	if (!found) console.log(`  [${type}] NOT FOUND`);
}
