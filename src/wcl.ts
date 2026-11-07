import { z } from "zod";

import { fixtureEventsBody, fixtureReportBody } from "./fixtures";
import { HttpError } from "./http-error";
import { jsonBody, type Json } from "./json";

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
        masterData { actors(type: "Player") { id name subType server icon } }
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

export async function fetchReportBody(
  code: string,
  clientId: string,
  clientSecret: string,
  useFixtures: boolean,
): Promise<Json> {
  if (useFixtures) return fixtureReportBody(code);
  const token = await accessToken(clientId, clientSecret);

  return graphql(token, REPORT_QUERY, { code });
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
 * array. `fixtureKey` picks the recorded array when `useFixtures` is on.
 */
export async function fetchEventsBody(
  code: string,
  clientId: string,
  clientSecret: string,
  useFixtures: boolean,
  fixtureKey: string,
  request: EventsRequest,
): Promise<Json> {
  if (useFixtures) return fixtureEventsBody(code, fixtureKey);

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

    if (result.nextPageTimestamp == null) return events;

    startTime = result.nextPageTimestamp;
  }

  return events;
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
