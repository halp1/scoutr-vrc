import AsyncStorage from "@react-native-async-storage/async-storage";
import { skillsLeaderboard } from "./sources/skills";
import { eventMeta, eventTeams, eventSkills, eventAwards } from "./sources/event";

export interface Source<T extends (...args: any[]) => Promise<any>> {
  loader: T;
  /** Expiry time in seconds */
  expiryTime: number;
}

export class Cache<T extends Record<string, Source<any>>> {
  #source: T;
  #pending = new Map<string, Promise<any>>();

  constructor(source: T) {
    this.#source = source;
  }

  #storageKey<K extends keyof T>(key: K, args: Parameters<T[K]["loader"]>): string {
    const hashInput = JSON.stringify({ key: key.toString(), args });
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      hash = (Math.imul(31, hash) + hashInput.charCodeAt(i)) | 0;
    }
    return `re_cache_${Math.abs(hash).toString(16)}`;
  }

  async invalidate<K extends keyof T>(
    key: K,
    ...args: Parameters<T[K]["loader"]>
  ): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.#storageKey(key, args));
    } catch {
      // ignore
    }
  }

  async load<K extends keyof T>(
    key: K,
    ...args: Parameters<T[K]["loader"]>
  ): Promise<Awaited<ReturnType<T[K]["loader"]>>> {
    const source = this.#source[key];
    if (!source) {
      throw new Error(`Source for key '${key.toString()}' not found`);
    }

    const storageKey = this.#storageKey(key, args);

    try {
      const raw = await AsyncStorage.getItem(storageKey);
      if (raw) {
        const isoDateRe = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        const cached = JSON.parse(raw, (_, v) =>
          typeof v === "string" && isoDateRe.test(v) ? new Date(v) : v,
        ) as {
          data: Awaited<ReturnType<T[K]["loader"]>>;
          expires: number;
        };
        if (cached.expires > Date.now()) {
          return cached.data;
        }
      }
    } catch {
      // ignore cache read errors
    }

    const inflight = this.#pending.get(storageKey);
    if (inflight) return inflight as Promise<Awaited<ReturnType<T[K]["loader"]>>>;

    const promise = (async () => {
      const data = await source.loader(...args);
      try {
        await AsyncStorage.setItem(
          storageKey,
          JSON.stringify({ data, expires: Date.now() + source.expiryTime * 1000 }),
        );
      } catch {
        // ignore cache write errors
      }
      return data;
    })().finally(() => this.#pending.delete(storageKey));

    this.#pending.set(storageKey, promise);
    return promise;
  }
}

type Time = "second" | "minute" | "hour" | "day";
export const time = (count: number, unit: Time | `${Time}s`) => {
  const multiplier =
    {
      second: 1,
      minute: 60,
      hour: 60 * 60,
      day: 24 * 60 * 60,
    }[unit.endsWith("s") ? (unit.slice(0, -1) as Time) : (unit as Time)] ?? 0;

  return count * multiplier;
};

const sources = {
  "skills.leaderboard": {
    loader: skillsLeaderboard,
    expiryTime: time(5, "minutes"),
  },
  "event.meta": {
    loader: eventMeta,
    expiryTime: time(30, "minutes"),
  },
  "event.teams": {
    loader: eventTeams,
    expiryTime: time(30, "minutes"),
  },
  "event.skills": {
    loader: eventSkills,
    expiryTime: time(10, "minutes"),
  },
  "event.awards": {
    loader: eventAwards,
    expiryTime: time(30, "minutes"),
  },
} as const;

export const cache = new Cache(sources);
export const load = cache.load.bind(cache);

export * as sources from "./sources/index";
