const PORT = Number(process.env.PORT ?? 3579);

const EVENTS_BASE =
  "https://www.robotevents.com/robot-competitions/vex-robotics-competition";
const MANUAL_URL = "https://www.vexrobotics.com/push-back-manual";
const VDA_BASE = "https://vrc-data-analysis.com/v1";
const QNA_API = "https://api.qnapl.us/internal/update";

const ALLOWED_VDA_PATH = /^(allteams|historical_allteams\/\d+)$/;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

interface Cookie {
  name: string;
  value: string;
  expires: number;
}

const parseCookieHeader = (header: string): Cookie | null => {
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
      if (!isNaN(date.getTime())) expires = date.getTime();
    }
  }
  return { name, value, expires };
};

const buildCookieStore = () => {
  let cookies: Cookie[] = [];
  return {
    getHeader: (): string => {
      cookies = cookies.filter((c) => c.expires > Date.now());
      return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
    },
    ingest: (setCookieValues: string[]): void => {
      const valid = cookies.filter((c) => c.expires > Date.now());
      for (const raw of setCookieValues) {
        const nc = parseCookieHeader(raw);
        if (!nc) continue;
        const idx = valid.findIndex((c) => c.name === nc.name);
        if (idx !== -1) valid[idx] = nc;
        else valid.push(nc);
      }
      cookies = valid;
    },
  };
};

const manualCookies = buildCookieStore();
const eventsCookies = buildCookieStore();

const browserHeaders = (cookieHeader: string): Record<string, string> => ({
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Upgrade-Insecure-Requests": "1",
  ...(cookieHeader ? { Cookie: cookieHeader } : {}),
});

const pipeUpstream = async (
  upstream: Response,
  cookieStore?: ReturnType<typeof buildCookieStore>,
): Promise<Response> => {
  const setCookies =
    typeof (upstream.headers as unknown as { getSetCookie?: () => string[] })
      .getSetCookie === "function"
      ? (upstream.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : ([upstream.headers.get("set-cookie")].filter(Boolean) as string[]);
  if (setCookies.length > 0) cookieStore?.ingest(setCookies);

  const body = await upstream.arrayBuffer();
  return new Response(body, {
    status: upstream.status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/octet-stream",
    },
  });
};

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (req.method !== "GET") {
      return new Response("Method not allowed", {
        status: 405,
        headers: CORS_HEADERS,
      });
    }

    if (url.pathname === "/manual") {
      try {
        const upstream = await fetch(MANUAL_URL, {
          headers: browserHeaders(manualCookies.getHeader()),
        });
        return pipeUpstream(upstream, manualCookies);
      } catch (e) {
        return new Response(`Upstream fetch failed: ${e}`, {
          status: 502,
          headers: CORS_HEADERS,
        });
      }
    }

    if (url.pathname === "/events") {
      try {
        const params = url.searchParams.toString();
        const upstream = await fetch(`${EVENTS_BASE}?${params}`, {
          headers: browserHeaders(eventsCookies.getHeader()),
        });
        return pipeUpstream(upstream, eventsCookies);
      } catch (e) {
        return new Response(`Upstream fetch failed: ${e}`, {
          status: 502,
          headers: CORS_HEADERS,
        });
      }
    }

    if (url.pathname === "/vda") {
      const path = url.searchParams.get("path") ?? "";
      if (!ALLOWED_VDA_PATH.test(path)) {
        return new Response("Invalid path", { status: 400, headers: CORS_HEADERS });
      }
      try {
        const upstream = await fetch(`${VDA_BASE}/${path}`, {
          headers: { "User-Agent": "scoutr-vrc/1.0", Accept: "application/json" },
        });
        return pipeUpstream(upstream);
      } catch (e) {
        return new Response(`Upstream fetch failed: ${e}`, {
          status: 502,
          headers: CORS_HEADERS,
        });
      }
    }

    if (url.pathname === "/qna") {
      const version = url.searchParams.get("version") ?? "_";
      try {
        const upstream = await fetch(
          `${QNA_API}?version=${encodeURIComponent(version)}`,
          { headers: { "User-Agent": "scoutr-vrc/1.0", Accept: "application/json" } },
        );
        return pipeUpstream(upstream);
      } catch (e) {
        return new Response(`Upstream fetch failed: ${e}`, {
          status: 502,
          headers: CORS_HEADERS,
        });
      }
    }

    return new Response("Not found", { status: 404, headers: CORS_HEADERS });
  },
});

console.log(`Proxy server running on http://localhost:${PORT}`);
