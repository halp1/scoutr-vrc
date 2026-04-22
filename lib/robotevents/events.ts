import { CONSTANTS } from "../const";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { coreGetEvents, type EventsQuery } from "./events-shared";

export * from "./events-shared";

const COOKIE_STORE_PREFIX = "robotevents-cookies";

interface Cookie {
  name: string;
  value: string;
  expires: number;
}

const createAsyncStorageStore = () => ({
  get: async <T>(key: string): Promise<T | null> => {
    const raw = await AsyncStorage.getItem(`${COOKIE_STORE_PREFIX}:${key}`);
    return raw !== null ? (JSON.parse(raw) as T) : null;
  },
  set: async (key: string, value: unknown): Promise<void> => {
    await AsyncStorage.setItem(`${COOKIE_STORE_PREFIX}:${key}`, JSON.stringify(value));
  },
  save: async (): Promise<void> => {},
});

export const cookies = Promise.resolve(createAsyncStorageStore());

const parseSetCookieHeader = (header: string): Cookie | null => {
  const parts = header.split(";").map((p) => p.trim());
  const nameValue = parts[0];
  const eqIdx = nameValue.indexOf("=");
  if (eqIdx === -1) return null;

  const name = nameValue.slice(0, eqIdx).trim();
  const value = nameValue.slice(eqIdx + 1).trim();
  let expires = Date.now() + 24 * 60 * 60 * 1000;

  for (const attr of parts.slice(1)) {
    const lower = attr.toLowerCase();
    if (lower.startsWith("max-age=")) {
      const maxAge = parseInt(attr.slice(8));
      if (!isNaN(maxAge)) {
        expires = Date.now() + maxAge * 1000;
        break;
      }
    } else if (lower.startsWith("expires=")) {
      const date = new Date(attr.slice(8));
      if (!isNaN(date.getTime())) {
        expires = date.getTime();
      }
    }
  }

  return { name, value, expires };
};

export const getEvents = async (
  query: Omit<Partial<EventsQuery>, "season"> & { season: number },
  cancelled: () => boolean,
) => {
  const cookieStore = await cookies;

  const fetchPage = async (params: URLSearchParams): Promise<string> => {
    const storedCookies = (await cookieStore.get<Cookie[]>("cookies")) ?? [];
    const now = Date.now();
    const validCookies = storedCookies.filter((c) => c.expires > now);
    const cookieHeader = validCookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const response = await fetch(
      `https://www.robotevents.com/robot-competitions/vex-robotics-competition?${params.toString()}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Authorization: `Bearer ${CONSTANTS.ROBOTEVENTS_API_KEY}`,
          ...(cookieHeader.length > 0 ? { Cookie: cookieHeader } : {}),
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "en-US,en;q=0.9,es-US;q=0.8,es;q=0.7",
          "cache-control": "no-cache",
          pragma: "no-cache",
          priority: "u=0, i",
          "sec-ch-ua":
            '"Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
        },
      },
    );

    const responseHeaders = response.headers as unknown as Headers;
    const setCookieValues: string[] =
      typeof responseHeaders.getSetCookie === "function"
        ? responseHeaders.getSetCookie()
        : ([responseHeaders.get("set-cookie")].filter(Boolean) as string[]);

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
      await cookieStore.set("cookies", merged);
      await cookieStore.save();
    }

    return response.text();
  };

  await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait a second to avoid hitting Cloudflare immediately
  if (cancelled()) throw new Error("Event search cancelled");

  return coreGetEvents(query, cancelled, fetchPage);
};
