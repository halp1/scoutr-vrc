import { File, Directory, Paths } from 'expo-file-system';
import { getNetworkStateAsync, NetworkStateType } from 'expo-network';
import { parse } from 'node-html-parser';

const QNA_API = 'https://api.qnapl.us/internal/update';
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const getCacheFile = () => new File(Paths.document, 'qna-cache.json');

const IMAGE_CACHE_DIR = 'qna-images';

const urlToFilename = (url: string): string => {
	let h = 2166136261;
	for (let i = 0; i < url.length; i++) {
		h ^= url.charCodeAt(i);
		h = Math.imul(h, 16777619);
		h >>>= 0;
	}
	const rawExt = url.split('?')[0].split('.').pop()?.toLowerCase() ?? 'jpg';
	const ext = /^[a-z0-9]{1,5}$/.test(rawExt) ? rawExt : 'jpg';
	return `${h.toString(16).padStart(8, '0')}.${ext}`;
};

const getImageDir = (): Directory => new Directory(Paths.document, IMAGE_CACHE_DIR);
const imageLocalFile = (url: string): File =>
	new File(Paths.document, IMAGE_CACHE_DIR, urlToFilename(url));

const _imageUriMap = new Map<string, string>();

const extractImageUrls = (questions: QnaQuestion[]): string[] => {
	const urls = new Set<string>();
	for (const q of questions) {
		for (const html of [q.questionRaw, q.answerRaw]) {
			if (!html) continue;
			try {
				const root = parse(html);
				for (const img of root.querySelectorAll('img')) {
					const src = img.getAttribute('src');
					if (src) {
						const normalized = src.startsWith('//') ? `https:${src}` : src;
						if (normalized.startsWith('http')) urls.add(normalized);
					}
				}
			} catch {}
		}
	}
	return [...urls];
};

export const resolveImageUri = (url: string): string => _imageUriMap.get(url) ?? url;

export const initImageCache = (questions: QnaQuestion[]): void => {
	const urls = extractImageUrls(questions);
	for (const url of urls) {
		try {
			const file = imageLocalFile(url);
			if (file.exists) _imageUriMap.set(url, file.uri);
		} catch {}
	}
};

export interface NetworkStatus {
	isWifi: boolean;
	isVpn: boolean;
}

export const getNetworkStatus = async (): Promise<NetworkStatus> => {
	try {
		const state = await getNetworkStateAsync();
		return {
			isWifi: state.type === NetworkStateType.WIFI || state.type === NetworkStateType.ETHERNET,
			isVpn: state.type === NetworkStateType.VPN
		};
	} catch {
		return { isWifi: false, isVpn: false };
	}
};

export const cacheAllImages = async (
	questions: QnaQuestion[],
	onProgress: (cached: number, total: number) => void
): Promise<void> => {
	const urls = extractImageUrls(questions);
	const total = urls.length;
	if (total === 0) {
		onProgress(0, 0);
		return;
	}
	onProgress(0, total);
	try {
		const dir = getImageDir();
		if (!dir.exists) dir.create({ intermediates: true });
	} catch {}
	let done = 0;
	for (const url of urls) {
		try {
			const file = imageLocalFile(url);
			if (!file.exists) await File.downloadFileAsync(url, file);
			_imageUriMap.set(url, file.uri);
		} catch {}
		done++;
		onProgress(done, total);
	}
};

export const clearImageCache = (): void => {
	_imageUriMap.clear();
	try {
		const dir = getImageDir();
		if (dir.exists) dir.delete();
	} catch {}
};

const ALLOWED_PROGRAMS = new Set(['v5rc', 'vurc', 'judging']);
const CURRENT_SEASON = '2025-2026';

export interface QnaQuestion {
	id: string;
	url: string;
	author: string;
	program: string;
	title: string;
	question: string;
	questionRaw: string;
	answer: string;
	answerRaw: string;
	season: string;
	askedTimestampMs: number | null;
	answeredTimestampMs: number | null;
	answered: boolean;
	tags: string[];
}

interface UpdateResponseOutdated {
	outdated: true;
	version: string;
	questions: QnaQuestion[];
}

interface UpdateResponseCurrent {
	outdated: false;
}

type UpdateResponse = UpdateResponseOutdated | UpdateResponseCurrent;

export interface QnaSyncResult {
	questions: QnaQuestion[];
	lastSync: number;
	warning: string | null;
	fromCache: boolean;
}

const normalizeProgram = (program: string | null | undefined): string =>
	(program ?? '').trim().toLowerCase();

const asString = (value: unknown): string => {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' && Number.isFinite(value)) return String(value);
	return '';
};

const asStringArray = (value: unknown): string[] =>
	Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const asNumberOrNull = (value: unknown): number | null => {
	if (typeof value === 'number' && !Number.isNaN(value)) return value;
	if (typeof value === 'string') {
		const parsed = Number.parseInt(value, 10);
		if (!Number.isNaN(parsed)) return parsed;
	}
	return null;
};

const toErrorMessage = (error: unknown): string => {
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === 'string' && error.trim().length > 0) return error;
	return 'Unable to refresh Q&A right now.';
};

const parseUpdateResponse = (value: unknown): UpdateResponse => {
	if (!value || typeof value !== 'object') {
		throw new Error('Q&A response was not a valid object.');
	}
	const raw = value as Record<string, unknown>;
	if (raw.outdated === false) {
		return { outdated: false };
	}
	if (raw.outdated !== true) {
		throw new Error('Q&A response is missing an outdated flag.');
	}
	const version = asString(raw.version) || '_';
	const questions = Array.isArray(raw.questions) ? raw.questions.map(toQuestion) : [];
	return {
		outdated: true,
		version,
		questions: questions.filter((item): item is QnaQuestion => item !== null)
	};
};

const toQuestion = (value: unknown): QnaQuestion | null => {
	if (!value || typeof value !== 'object') return null;
	const raw = value as Record<string, unknown>;
	const program = asString(raw.program);
	if (!ALLOWED_PROGRAMS.has(normalizeProgram(program))) {
		return null;
	}
	const season = asString(raw.season);
	if (season !== CURRENT_SEASON) return null;
	const id = asString(raw.id);
	if (!id) return null;
	return {
		id,
		url: asString(raw.url),
		author: asString(raw.author),
		program,
		title: asString(raw.title),
		question: asString(raw.question),
		questionRaw: asString(raw.questionRaw),
		answer: asString(raw.answer),
		answerRaw: asString(raw.answerRaw),
		season: asString(raw.season),
		askedTimestampMs: asNumberOrNull(raw.askedTimestampMs),
		answeredTimestampMs: asNumberOrNull(raw.answeredTimestampMs),
		answered: Boolean(raw.answered),
		tags: asStringArray(raw.tags)
	};
};

const sortQuestions = (questions: QnaQuestion[]): QnaQuestion[] => {
	const fallbackTime = (id: string): number => {
		const parsed = Number.parseInt(id, 10);
		return Number.isNaN(parsed) ? 0 : parsed;
	};
	return [...questions].sort((a, b) => {
		const at = a.askedTimestampMs ?? fallbackTime(a.id);
		const bt = b.askedTimestampMs ?? fallbackTime(b.id);
		return bt - at;
	});
};

interface CacheFile {
	version: string;
	lastSync: number;
	questions: QnaQuestion[];
}

const readCache = async () => {
	try {
		const file = getCacheFile();
		if (!file.exists) return { cacheVersion: '_', cacheLastSync: 0, questions: [] };
		const raw = await file.text();
		const parsed = JSON.parse(raw) as CacheFile;
		const questions = Array.isArray(parsed.questions)
			? sortQuestions(parsed.questions.map(toQuestion).filter((q): q is QnaQuestion => q !== null))
			: [];
		return {
			cacheVersion: typeof parsed.version === 'string' ? parsed.version : '_',
			cacheLastSync: typeof parsed.lastSync === 'number' ? parsed.lastSync : 0,
			questions
		};
	} catch {
		return { cacheVersion: '_', cacheLastSync: 0, questions: [] };
	}
};

const saveCache = async (
	version: string,
	lastSync: number,
	questions: QnaQuestion[]
): Promise<number> => {
	const file = getCacheFile();
	const cache: CacheFile = { version, lastSync, questions };
	file.write(JSON.stringify(cache));
	return questions.length;
};

export const clearQNACache = async (): Promise<void> => {
	_imageUriMap.clear();
	const file = getCacheFile();
	if (file.exists) file.delete();
};

const shouldAutoRefresh = (lastSync: number): boolean => Date.now() - lastSync >= ONE_DAY_MS;

const QNA_FETCH_HEADERS: HeadersInit = {
	accept: '*/*',
	'accept-language': 'en-US,en;q=0.9',
	'cache-control': 'no-cache',
	pragma: 'no-cache',
	priority: 'u=1, i',
	'sec-ch-ua': '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
	'sec-ch-ua-mobile': '?0',
	'sec-ch-ua-platform': '"Windows"',
	'sec-fetch-dest': 'empty',
	'sec-fetch-mode': 'cors',
	'sec-fetch-site': 'same-site',
	Referer: 'https://qnapl.us/',
	Origin: 'https://qnapl.us',
	'User-Agent':
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36'
};

const fetchUpdate = async (version: string): Promise<UpdateResponse> => {
	const response = await fetch(`${QNA_API}?version=${encodeURIComponent(version)}`, {
		headers: QNA_FETCH_HEADERS,
		method: 'GET'
	});
	if (!response.ok) {
		throw new Error(`Q&A fetch failed (${response.status})`);
	}
	const payload = (await response.json()) as unknown;
	return parseUpdateResponse(payload);
};

export const syncQnaQuestions = async (forceRefresh = false): Promise<QnaSyncResult> => {
	const { cacheVersion, cacheLastSync, questions: cachedQuestions } = await readCache();
	if (!forceRefresh && cachedQuestions.length > 0 && !shouldAutoRefresh(cacheLastSync)) {
		return {
			questions: cachedQuestions,
			lastSync: cacheLastSync,
			warning: null,
			fromCache: true
		};
	}
	try {
		const requestVersion = cachedQuestions.length > 0 ? cacheVersion : '_';
		const updateResponse = await fetchUpdate(requestVersion);
		const now = Date.now();
		if (!updateResponse.outdated) {
			try {
				await saveCache(cacheVersion, now, cachedQuestions);
			} catch {}
			return {
				questions: cachedQuestions,
				lastSync: now,
				warning: null,
				fromCache: cachedQuestions.length > 0
			};
		}
		const filtered = sortQuestions(updateResponse.questions);
		let warning: string | null = null;
		try {
			const cachedCount = await saveCache(updateResponse.version, now, filtered);
			if (cachedCount < filtered.length) {
				warning = `Loaded fresh Q&A, but only ${cachedCount} of ${filtered.length} questions were cached locally.`;
			}
		} catch (cacheError) {
			warning = `Loaded fresh Q&A, but local cache update failed: ${toErrorMessage(cacheError)}`;
		}
		return {
			questions: filtered,
			lastSync: now,
			warning,
			fromCache: false
		};
	} catch (error) {
		const warning = toErrorMessage(error);
		return {
			questions: cachedQuestions,
			lastSync: cacheLastSync,
			warning,
			fromCache: true
		};
	}
};

export const qnaSearchText = (question: QnaQuestion): string => {
	return [
		question.title,
		question.author,
		question.program,
		question.season,
		question.question,
		question.questionRaw,
		question.answer,
		question.answerRaw,
		...question.tags
	]
		.join(' ')
		.toLowerCase();
};
