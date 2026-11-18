import { z } from "zod";

import { SETTLED_TTL_SECONDS, type UpstreamCache } from "./cache";
import { fixtureEventsBody, fixtureReportBody } from "./fixtures";
import { HttpError } from "./http-error";
import { jsonBody, type Json } from "./json";
import { isLogLive, reportEndMs } from "./live";
import { readReport, type ReportSummary } from "./parse-api";

export interface EventsRequest {
  dataType: "Deaths" | "Casts" | "Buffs" | "Debuffs" | "Interrupts" | "Dispels";
  hostility: "Friendlies" | "Enemies";
  fightIds: number[];
  /** Warcraft Logs filter expression, e.g. `ability.id in (1,2)`. */
  filter: string | null;
}

const TOKEN_URL = "https://www.warcraftlogs.com/oauth/token";
const API_URL = "https://www.warcraftlogs.com/api/v2/client";

const REPORT_QUERY = `
  query ReportFights($code: String!) {
    reportData {
      report(code: $code) {
        code
        title
        startTime
        endTime
        zone { id name }
        guild { id name server { name region { slug } } }
        owner { name }
        phases { encounterID phases { id name isIntermission } }
        masterData {
          actors(type: "Player") { id name subType server icon }
          abilities { gameID name icon }
        }
        fights {
          id
          name
          encounterID
          startTime
          endTime
          kill
          difficulty
          bossPercentage
          fightPercentage
          lastPhase
          friendlyPlayers
          phaseTransitions { id startTime }
        }
      }
    }
  }
`;

const EVENTS_QUERY = `
  query ReportEvents(
    $code: String!
    $dataType: EventDataType!
    $hostility: HostilityType!
    $fightIds: [Int]!
    $filter: String
    $startTime: Float
  ) {
    reportData {
      report(code: $code) {
        events(
          dataType: $dataType
          hostilityType: $hostility
          fightIDs: $fightIds
          filterExpression: $filter
          startTime: $startTime
          limit: 10000
        ) {
          data
          nextPageTimestamp
        }
      }
    }
  }
`;

/** Events come in pages of up to 10,000. A night is a few hundred, so this is only a backstop. */
const MAX_EVENT_PAGES = 20;

let cachedToken: { token: string; expiresAt: number } | null = null;

async function accessToken(clientId: string, clientSecret: string): Promise<string> {
  const now = Date.now();

  if (cachedToken && cachedToken.expiresAt > now + 30_000) return cachedToken.token;

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const body = jsonBody.safeParse(await response.json().catch(() => null));
  const tokenBody = body.success ? z.record(z.string(), jsonBody).safeParse(body.data) : undefined;

  const token = tokenBody?.success
    ? z.string().safeParse(tokenBody.data.access_token).data
    : undefined;

  if (!response.ok || token === undefined) {
    throw new HttpError(502, "Warcraft Logs refused the API login.");
  }

  const expiresIn = tokenBody?.success
    ? (z.number().safeParse(tokenBody.data.expires_in).data ?? 3600)
    : 3600;

  cachedToken = { token, expiresAt: now + expiresIn * 1000 };

  return token;
}

/** A report this long past its last event is treated as final and kept for the full lifetime. */
const SETTLED_REPORT_AGE_MS = 24 * 60 * 60_000;

/** Below that age, a report is kept for this fraction of its age: 6 minutes at an hour old. */
const YOUNG_REPORT_TTL_FRACTION = 0.1;

/**
 * Seconds a report and its events may stay cached. A live log is not cached, so a reload shows
 * the newest pulls. A young one is kept briefly, since a long raid break or a late upload can
 * still add to it. Only a day-old log gets the full lifetime.
 */
export function reportCacheTtl(report: ReportSummary, nowMs: number): number | null {
  const endMs = reportEndMs(report);

  if (isLogLive(endMs, nowMs)) return null;

  const ageMs = nowMs - endMs;

  if (ageMs >= SETTLED_REPORT_AGE_MS) return SETTLED_TTL_SECONDS;

  return Math.floor((ageMs * YOUNG_REPORT_TTL_FRACTION) / 1000);
}

export async function fetchReportBody(
  code: string,
  clientId: string,
  clientSecret: string,
  useFixtures: boolean,
  cache: UpstreamCache,
): Promise<Json> {
  if (useFixtures) return fixtureReportBody(code);

  return cache.json(
    "wcl-report",
    { query: REPORT_QUERY, code },
    async () => graphql(await accessToken(clientId, clientSecret), REPORT_QUERY, { code }),
    (body) => {
      try {
        return reportCacheTtl(readReport(body), Date.now());
      } catch {
        return null;
      }
    },
  );
}

async function graphql(token: string, query: string, variables: Json): Promise<Json> {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new HttpError(502, "Warcraft Logs could not be reached.");
  }

  return jsonBody.parse(await response.json());
}

/**
 * Every event for the fights, following `nextPageTimestamp`. Returns the events as a JSON
 * array. `fixtureKey` picks the recorded array when `useFixtures` is on. `ttl` is the
 * report's cache lifetime from `reportCacheTtl`.
 */
export async function fetchEventsBody(
  code: string,
  clientId: string,
  clientSecret: string,
  useFixtures: boolean,
  fixtureKey: string,
  request: EventsRequest,
  cache: UpstreamCache,
  ttl: number | null,
): Promise<Json> {
  if (useFixtures) return fixtureEventsBody(code, fixtureKey);

  let complete = false;

  return cache.json(
    "wcl-events",
    { query: EVENTS_QUERY, code, request: { ...request } },
    async () => {
      const pages = await fetchEventPages(code, clientId, clientSecret, request);

      complete = pages.complete;

      return pages.events;
    },
    // A list cut off at `MAX_EVENT_PAGES` is served but not kept.
    () => (complete ? ttl : null),
  );
}

async function fetchEventPages(
  code: string,
  clientId: string,
  clientSecret: string,
  request: EventsRequest,
): Promise<{ events: Json[]; complete: boolean }> {
  const token = await accessToken(clientId, clientSecret);
  const events: Json[] = [];
  let startTime: number | null = null;

  for (let page = 0; page < MAX_EVENT_PAGES; page++) {
    const body = await graphql(token, EVENTS_QUERY, {
      code,
      dataType: request.dataType,
      hostility: request.hostility,
      fightIds: request.fightIds,
      filter: request.filter,
      startTime,
    });

    const parsed = eventsPageSchema.safeParse(body);

    if (!parsed.success) {
      throw new HttpError(502, "Warcraft Logs returned an unexpected response.");
    }

    const result = parsed.data.data?.reportData?.report?.events;

    if (!result) {
      const message = parsed.data.errors?.[0]?.message;

      throw new HttpError(400, message ?? "Warcraft Logs rejected the events request.");
    }

    events.push(...result.data);

    if (result.nextPageTimestamp == null) return { events, complete: true };

    startTime = result.nextPageTimestamp;
  }

  return { events, complete: false };
}

const eventsPageSchema = z.object({
  errors: z.array(z.object({ message: z.string().optional() })).optional(),
  data: z
    .object({
      reportData: z
        .object({
          report: z
            .object({
              events: z
                .object({
                  data: z.array(jsonBody),
                  nextPageTimestamp: z.number().nullish(),
                })
                .nullish(),
            })
            .nullish(),
        })
        .nullish(),
    })
    .nullish(),
});
