import { createClient } from "jsr:@supabase/supabase-js@2";

const RE_BASE = "https://www.robotevents.com/api/v2";
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EVENTS_REFRESH_MS = 30 * 60 * 1000;

interface RawMatch {
  id: number;
  event: { id: number; name: string };
  started?: string | null;
  name?: string;
  alliances: {
    color: string;
    score: number;
    teams: { team?: { id: number; number: string } | null }[];
  }[];
} 

interface RawAward {
  id: number;
  event: { id: number; name: string };
  title: string;
}

interface RawEvent {
  id: number;
  name: string;
  start?: string | null;
  end?: string | null;
}

interface RawSeason {
  id: number;
  start?: string | null;
}

interface PollState {
  re_team_id: number;
  event_id: number | null;
  seen_match_ids: number[];
  seen_award_ids: number[];
  events_refreshed_at: string | null;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const RE_KEY = Deno.env.get("ROBOTEVENTS_API_KEY")!;
const RE_HEADERS = { Accept: "application/json", Authorization: `Bearer ${RE_KEY}` };

const reGet = async (
  path: string,
  params: Record<string, string | number | (string | number)[]> = {},
): Promise<any> => {
  const url = new URL(`${RE_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v))
      v.forEach((val) => url.searchParams.append(`${k}[]`, String(val)));
    else url.searchParams.set(k, String(v));
  }
  url.searchParams.set("per_page", "250");
  const res = await fetch(url.toString(), { headers: RE_HEADERS });
  if (!res.ok) throw new Error(`RE ${path} → ${res.status}`);
  return res.json();
};

const reDepaginate = async <T>(
  path: string,
  params: Record<string, string | number | (string | number)[]> = {},
): Promise<T[]> => {
  const first = await reGet(path, params);
  const results: T[] = [...(first.data ?? [])];
  let nextUrl: string | null = first.meta?.next_page_url ?? null;
  while (nextUrl) {
    const res = await fetch(`${nextUrl}&per_page=250`, { headers: RE_HEADERS });
    if (!res.ok) break;
    const page = await res.json();
    results.push(...(page.data ?? []));
    nextUrl = page.meta?.next_page_url ?? null;
  }
  return results;
};

const findActiveEvent = (events: RawEvent[]): RawEvent | null => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return (
    events.find((e) => {
      const start = e.start ? new Date(e.start) : null;
      const end = e.end ? new Date(e.end) : start;
      if (!start || !end) return false;
      const s = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const d = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      return s <= today && today <= d;
    }) ?? null
  );
};

const determineResult = (
  reTeamId: number,
  match: RawMatch,
): "win" | "loss" | "tie" | null => {
  const mine = match.alliances.find((a) => a.teams.some((t) => t.team?.id === reTeamId));
  const opp = match.alliances.find((a) => a.color !== mine?.color);
  if (!mine || !opp) return null;
  if (mine.score > opp.score) return "win";
  if (mine.score < opp.score) return "loss";
  return "tie";
};

const formatMatchBody = (match: RawMatch): string => {
  const red = match.alliances.find((a) => a.color === "red");
  const blue = match.alliances.find((a) => a.color === "blue");
  if (!red || !blue) return "";
  const redTeams = red.teams.map((t) => t.team?.number ?? "?").join(", ");
  const blueTeams = blue.teams.map((t) => t.team?.number ?? "?").join(", ");
  return `Red ${red.score} · ${redTeams} — Blue ${blue.score} · ${blueTeams}`;
};

const sendExpoPush = async (messages: object[]): Promise<void> => {
  if (messages.length === 0) return;
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(batch),
    });
  }
};

Deno.serve(async (_req) => {
  try {
    const { data: prefs, error: prefsErr } = await supabase
      .from("notification_preferences")
      .select("re_team_id, team_number, program_id, user_id");
    if (prefsErr) throw prefsErr;
    if (!prefs || prefs.length === 0) {
      return new Response(JSON.stringify({ ok: true, teams: 0 }), { status: 200 });
    }

    const teamMap = new Map<
      number,
      { teamNumber: string; programId: number; userIds: string[] }
    >();
    for (const pref of prefs) {
      const existing = teamMap.get(pref.re_team_id);
      if (existing) existing.userIds.push(pref.user_id);
      else
        teamMap.set(pref.re_team_id, {
          teamNumber: pref.team_number,
          programId: pref.program_id,
          userIds: [pref.user_id],
        });
    }

    const allUserIds = [...new Set(prefs.map((p: any) => p.user_id as string))];
    const { data: tokens } = await supabase
      .from("notification_tokens")
      .select("user_id, expo_push_token")
      .in("user_id", allUserIds);

    const userTokens = new Map<string, string[]>();
    for (const tok of tokens ?? []) {
      const arr = userTokens.get(tok.user_id) ?? [];
      arr.push(tok.expo_push_token);
      userTokens.set(tok.user_id, arr);
    }

    const teamIds = [...teamMap.keys()];
    const { data: pollRows } = await supabase
      .from("notification_poll_state")
      .select("*")
      .in("re_team_id", teamIds);

    const pollStateMap = new Map<number, PollState>();
    for (const s of pollRows ?? []) pollStateMap.set(s.re_team_id, s as PollState);

    const seasonCache = new Map<number, number>();
    const getSeasonId = async (programId: number): Promise<number | null> => {
      if (seasonCache.has(programId)) return seasonCache.get(programId)!;
      const seasons = await reDepaginate<RawSeason>("/seasons", { program: [programId] });
      const now = new Date();
      const started = seasons.filter((s) => s.start && new Date(s.start) <= now);
      const pool = started.length > 0 ? started : seasons;
      const latest = pool.reduce<RawSeason | null>(
        (best, s) =>
          !best || (s.start && (!best.start || new Date(s.start) > new Date(best.start)))
            ? s
            : best,
        null,
      );
      if (!latest) return null;
      seasonCache.set(programId, latest.id);
      return latest.id;
    };

    const now = new Date();
    const pushMessages: object[] = [];

    for (const [reTeamId, teamInfo] of teamMap) {
      const state = pollStateMap.get(reTeamId) ?? null;

      const needsRefresh =
        !state?.events_refreshed_at ||
        now.getTime() - new Date(state.events_refreshed_at).getTime() > EVENTS_REFRESH_MS;

      let eventId: number | null = state?.event_id ?? null;

      if (needsRefresh) {
        try {
          const seasonId = await getSeasonId(teamInfo.programId);
          if (seasonId !== null) {
            const events = await reDepaginate<RawEvent>(`/teams/${reTeamId}/events`, {
              season: [seasonId],
            });
            const active = findActiveEvent(events);
            eventId = active?.id ?? null;
          }
        } catch (e) {
          console.error(`Event refresh failed for team ${reTeamId}:`, e);
        }
      }

      if (!eventId) {
        if (needsRefresh) {
          await supabase.from("notification_poll_state").upsert(
            {
              re_team_id: reTeamId,
              event_id: null,
              seen_match_ids: [],
              seen_award_ids: [],
              events_refreshed_at: now.toISOString(),
            },
            { onConflict: "re_team_id" },
          );
        }
        continue;
      }

      const isFirstPollForEvent = !state || state.event_id !== eventId;
      const seenMatchIds: number[] = isFirstPollForEvent
        ? []
        : (state?.seen_match_ids ?? []);
      const seenAwardIds: number[] = isFirstPollForEvent
        ? []
        : (state?.seen_award_ids ?? []);

      const watcherTokens = teamInfo.userIds.flatMap((uid) => userTokens.get(uid) ?? []);

      const [matches, awards] = await Promise.all([
        reDepaginate<RawMatch>(`/teams/${reTeamId}/matches`, { event: [eventId] }).catch(
          () => [] as RawMatch[],
        ),
        reDepaginate<RawAward>(`/teams/${reTeamId}/awards`, { event: [eventId] }).catch(
          () => [] as RawAward[],
        ),
      ]);

      const playedMatches = matches.filter((m) => m.started != null);

      if (isFirstPollForEvent) {
        await supabase.from("notification_poll_state").upsert(
          {
            re_team_id: reTeamId,
            event_id: eventId,
            seen_match_ids: playedMatches.map((m) => m.id),
            seen_award_ids: awards.map((a) => a.id),
            events_refreshed_at: now.toISOString(),
          },
          { onConflict: "re_team_id" },
        );
        continue;
      }

      if (watcherTokens.length === 0) continue;

      const newMatches = playedMatches.filter((m) => !seenMatchIds.includes(m.id));
      const newAwards = awards.filter((a) => !seenAwardIds.includes(a.id));

      for (const match of newMatches) {
        const result = determineResult(reTeamId, match);
        if (!result) continue;
        const title =
          result === "win"
            ? `${teamInfo.teamNumber} won! 🏆`
            : result === "loss"
              ? `${teamInfo.teamNumber} lost`
              : `${teamInfo.teamNumber} tied`;
        const body = formatMatchBody(match);
        for (const token of watcherTokens) {
          pushMessages.push({
            to: token,
            title,
            body,
            data: { type: "match", eventId, matchId: match.id },
            channelId: "matches",
            sound: "default",
          });
        }
      }

      for (const award of newAwards) {
        for (const token of watcherTokens) {
          pushMessages.push({
            to: token,
            title: `${teamInfo.teamNumber} won an award! 🥇`,
            body: `${award.title} — ${award.event?.name ?? "Event"}`,
            data: { type: "award", eventId, awardId: award.id },
            channelId: "awards",
            sound: "default",
          });
        }
      }

      if (newMatches.length > 0 || newAwards.length > 0) {
        await supabase
          .from("notification_poll_state")
          .update({
            seen_match_ids: [...seenMatchIds, ...newMatches.map((m) => m.id)],
            seen_award_ids: [...seenAwardIds, ...newAwards.map((a) => a.id)],
          })
          .eq("re_team_id", reTeamId);
      }

      if (needsRefresh) {
        await supabase
          .from("notification_poll_state")
          .update({ events_refreshed_at: now.toISOString(), event_id: eventId })
          .eq("re_team_id", reTeamId);
      }
    }

    await sendExpoPush(pushMessages);

    return new Response(
      JSON.stringify({
        ok: true,
        teams: teamMap.size,
        notifications: pushMessages.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Notify function error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
