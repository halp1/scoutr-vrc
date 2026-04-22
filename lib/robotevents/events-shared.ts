import { parse } from "node-html-parser";
import { cache } from "./cache";

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
  { id: 1, name: "In-Person" },
  { id: 7, name: "Invitational" },
  { id: 4, name: "Remote" },
  { id: 5, name: "Skills Only" },
];

export interface GradeLevel {
  id: number;
  name: string;
}

export const gradeLevels: GradeLevel[] = [
  { id: 1, name: "Elementary" },
  { id: 2, name: "Middle School" },
  { id: 3, name: "High School" },
  { id: 4, name: "College" },
];

export interface Level {
  id: number;
  name: string;
}

export const levels: Level[] = [
  { id: 1, name: "Event Region Championship" },
  { id: 2, name: "National Championship" },
  { id: 3, name: "World Championship" },
  { id: 4, name: "Signature Event" },
  { id: 5, name: "JROTC Brigade Championship" },
  { id: 6, name: "JROTC National Championship" },
  { id: 7, name: "Showcase Event" },
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

  const skillsLeaderboard = await cache.load("skills.leaderboard", season);

  const eventRegions = [
    ...new Set(
      skillsLeaderboard.map((r) => `${r.team.eventRegionId}:${r.team.eventRegion}`),
    ),
  ].map((er) => {
    const [id, name] = er.split(":");
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

export interface SearchEvent {
  name: string;
  sku: string;
  date: Date[];
  location: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  } | null;
  status?: string;
  spots?: number;
  type?: string;
  region?: EventRegion;
}

export const defaultQuery: EventsQuery = {
  country: null,
  region: null,
  season: null,
  type: null,
  formats: [],
  name: "",
  grade: null,
  level: null,
  from: null,
  to: null,
  eventRegion: null,
};

export const buildEventParams = (q: EventsQuery): URLSearchParams => {
  const params = new URLSearchParams();
  if (q.country) params.append("country_id", q.country.toString());
  if (q.region) params.append("country_region_id", q.region.toString());
  if (q.season) params.append("seasonId", q.season.toString());
  if (q.type) params.append("eventType", q.type.toString());
  if (q.formats.length > 0)
    q.formats.forEach((f) => params.append("event_tags[]", f.toString()));
  if (q.name) params.append("name", q.name);
  if (q.grade) params.append("grade_level_id", q.grade.id.toString());
  if (q.level) params.append("level_class_id", q.level.id.toString());
  if (q.from) params.append("from_date", q.from);
  if (q.to) params.append("to_date", q.to);
  if (q.eventRegion) params.append("event_region", q.eventRegion.toString());
  return params;
};

const parseRobotEventsDate = (s: string): [Date] | [Date, Date] => {
  const isDualDate = /^\d{1,2}-[A-Za-z]{3}-\d{4} - \d{1,2}-[A-Za-z]{3}-\d{4}$/.test(s);

  if (isDualDate) {
    const [start, end] = s.split(" - ");
    return [parseRobotEventsDate(start)[0], parseRobotEventsDate(end)[0]];
  }

  const [day, mon, year] = s.split("-");

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
    Dec: 11,
  };

  return [new Date(Number(year), months[mon], Number(day))];
};

export const parseEventsPage = (raw: string, regions: EventRegion[]) => {
  const document = parse(raw);

  if (document.querySelector("title")?.text === "Just a moment...") {
    throw new Error("Cloudflare is blocking event search.\nPlease try again later.");
  }

  const items = document.querySelectorAll(".card-body").slice(1);

  const events = document
    .querySelector("body")
    ?.text?.includes("No matching events found")
    ? []
    : items.map((item) => ({
        name: item.querySelector("a")?.childNodes?.[0]?.text?.trim?.() ?? "",
        status:
          item
            .querySelector(".col-sm-6")
            ?.children[0].text?.replace("Status: ", "")
            .trim() ?? "",
        spots: parseInt(
          item
            .querySelector(".col-sm-6")
            ?.children[1].text?.replace("Spots: ", "")
            .trim() ?? "0",
        ),
        date: parseRobotEventsDate(
          item
            .querySelector(".col-sm-6")
            ?.children[2].text?.replace("Date: ", "")
            .trim() ?? "0",
        ),
        region: regions.find(
          (r) =>
            r.name ===
            item
              .querySelector(".col-sm-6")
              ?.children[3].text?.replace("Region: ", "")
              .trim(),
        ),
        sku:
          item
            .querySelectorAll(".col-sm-6")[1]
            ?.children[0].text?.replace("Event Code: ", "")
            .trim() ?? "",
        type:
          item
            .querySelectorAll(".col-sm-6")[1]
            ?.children[1].text?.replace("Type: ", "")
            .trim() ?? "",
        location: (() => {
          const rawLocation =
            item
              .querySelectorAll(".col-sm-6")[1]
              ?.children[2].text?.replace("Location: ", "")
              .trim() ?? "";
          if (rawLocation.length === 0) return null;

          const split = rawLocation.split(",").map((s) => s.trim());
          return {
            address: split[0],
            city: split[1],
            state: split[2],
            zip: split[3],
            country: split[4],
          };
        })(),
      }));

  return {
    events,
    pages: parseInt(
      document.querySelectorAll(".page-item .page-link").at(-2)?.text ?? "1",
    ),
  };
};

export const coreGetEvents = async (
  query: Omit<Partial<EventsQuery>, "season"> & { season: number },
  cancelled: () => boolean,
  fetchPage: (params: URLSearchParams) => Promise<string>,
) => {
  const q = { ...defaultQuery, ...query };
  const baseParams = buildEventParams(q);
  const regionsPromise = loadEventRegions(q.season).catch(() => [] as EventRegion[]);

  const loadPage = async (page: number) => {
    const params = new URLSearchParams(baseParams);
    params.set("page", page.toString());
    const raw = await fetchPage(params);
    const regions = await regionsPromise;
    return parseEventsPage(raw, regions);
  };

  const res = await loadPage(1);

  return {
    events: res.events,
    pages: res.pages,
    loadPage: async (page: number) => {
      if (page < 1 || page > res.pages) throw new Error("Invalid page number");
      if (cancelled()) throw new Error("Event search cancelled");
      return (await loadPage(page)).events;
    },
  };
};
