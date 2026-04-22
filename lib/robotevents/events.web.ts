import { CONSTANTS } from "../const";
import { coreGetEvents, type EventsQuery } from "./events-shared";

export * from "./events-shared";

const PROXY_BASE = `${CONSTANTS.PROXY_URL}/events`;

export const getEvents = async (
  query: Omit<Partial<EventsQuery>, "season"> & { season: number },
  cancelled: () => boolean,
) => {
  if (cancelled()) throw new Error("Event search cancelled");

  const fetchPage = async (params: URLSearchParams): Promise<string> => {
    const response = await fetch(`${PROXY_BASE}?${params.toString()}`);
    if (!response.ok) throw new Error(`Events proxy returned ${response.status}`);
    return response.text();
  };

  return coreGetEvents(query, cancelled, fetchPage);
};
