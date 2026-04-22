import { CONSTANTS } from "../../const";

const QNA_API = `${CONSTANTS.PROXY_URL}/qna`;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const CACHE_KEY = "qna-cache-web";
const IDB_NAME = "scoutr-cache";
const IDB_STORE = "keyval";

const openDB = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const idbGet = async (key: string): Promise<string | null> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve((req.result as string | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
};

const idbSet = async (key: string, value: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

const idbDelete = async (key: string): Promise<void> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const resolveImageUri = (url: string): string => url;

export const initImageCache = (_questions: QnaQuestion[]): void => {};

export interface NetworkStatus {
  isWifi: boolean;
  isVpn: boolean;
}

export const getNetworkStatus = async (): Promise<NetworkStatus> => ({
  isWifi: true,
  isVpn: false,
});

export const cacheAllImages = async (
  _questions: QnaQuestion[],
  onProgress: (cached: number, total: number) => void,
): Promise<void> => {
  onProgress(0, 0);
};

export const clearImageCache = (): void => {};

const ALLOWED_PROGRAMS = new Set(["v5rc", "vurc", "judging"]);
const CURRENT_SEASON = "2025-2026";

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

export interface QnaSyncResult {
  questions: QnaQuestion[];
  lastSync: number;
  warning: string | null;
  fromCache: boolean;
}

const normalizeProgram = (program: string | null | undefined): string =>
  (program ?? "").trim().toLowerCase();

const asString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const asNumberOrNull = (value: unknown): number | null => {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
};

const toErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim().length > 0) return error;
  return "Unable to refresh Q&A right now.";
};

const toQuestion = (value: unknown): QnaQuestion | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const program = asString(raw.program);
  if (!ALLOWED_PROGRAMS.has(normalizeProgram(program))) return null;
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
    tags: asStringArray(raw.tags),
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

interface CacheData {
  version: string;
  lastSync: number;
  questions: QnaQuestion[];
}

const readCache = async (): Promise<{
  cacheVersion: string;
  cacheLastSync: number;
  questions: QnaQuestion[];
}> => {
  try {
    const raw = await idbGet(CACHE_KEY);
    if (!raw) return { cacheVersion: "_", cacheLastSync: 0, questions: [] };
    const parsed = JSON.parse(raw) as CacheData;
    const questions = Array.isArray(parsed.questions)
      ? sortQuestions(
          parsed.questions.map(toQuestion).filter((q): q is QnaQuestion => q !== null),
        )
      : [];
    return {
      cacheVersion: typeof parsed.version === "string" ? parsed.version : "_",
      cacheLastSync: typeof parsed.lastSync === "number" ? parsed.lastSync : 0,
      questions,
    };
  } catch {
    return { cacheVersion: "_", cacheLastSync: 0, questions: [] };
  }
};

const saveCache = async (
  version: string,
  lastSync: number,
  questions: QnaQuestion[],
): Promise<number> => {
  const data: CacheData = { version, lastSync, questions };
  await idbSet(CACHE_KEY, JSON.stringify(data));
  return questions.length;
};

export const clearQNACache = async (): Promise<void> => {
  await idbDelete(CACHE_KEY);
};

const shouldAutoRefresh = (lastSync: number): boolean =>
  Date.now() - lastSync >= ONE_DAY_MS;

interface UpdateResponseOutdated {
  outdated: true;
  version: string;
  questions: QnaQuestion[];
}
interface UpdateResponseCurrent {
  outdated: false;
}
type UpdateResponse = UpdateResponseOutdated | UpdateResponseCurrent;

const parseUpdateResponse = (value: unknown): UpdateResponse => {
  if (!value || typeof value !== "object")
    throw new Error("Q&A response was not a valid object.");
  const raw = value as Record<string, unknown>;
  if (raw.outdated === false) return { outdated: false };
  if (raw.outdated !== true) throw new Error("Q&A response is missing an outdated flag.");
  const version = asString(raw.version) || "_";
  const questions = Array.isArray(raw.questions) ? raw.questions.map(toQuestion) : [];
  return {
    outdated: true,
    version,
    questions: questions.filter((item): item is QnaQuestion => item !== null),
  };
};

const fetchUpdate = async (version: string): Promise<UpdateResponse> => {
  const response = await fetch(`${QNA_API}?version=${encodeURIComponent(version)}`);
  if (!response.ok) throw new Error(`Q&A fetch failed (${response.status})`);
  return parseUpdateResponse(await response.json());
};

export const syncQnaQuestions = async (forceRefresh = false): Promise<QnaSyncResult> => {
  const { cacheVersion, cacheLastSync, questions: cachedQuestions } = await readCache();
  if (!forceRefresh && cachedQuestions.length > 0 && !shouldAutoRefresh(cacheLastSync)) {
    return {
      questions: cachedQuestions,
      lastSync: cacheLastSync,
      warning: null,
      fromCache: true,
    };
  }
  try {
    const requestVersion = cachedQuestions.length > 0 ? cacheVersion : "_";
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
        fromCache: cachedQuestions.length > 0,
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
    return { questions: filtered, lastSync: now, warning, fromCache: false };
  } catch (error) {
    return {
      questions: cachedQuestions,
      lastSync: cacheLastSync,
      warning: toErrorMessage(error),
      fromCache: true,
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
    ...question.tags,
  ]
    .join(" ")
    .toLowerCase();
};
