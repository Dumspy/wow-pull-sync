import { z } from "zod";

import type { UpstreamCache } from "./cache";
import { HttpError } from "./http-error";
import { readEvents, type ReportSummary, type WclEvent } from "./parse-api";
import { NO_EVENTS, type ReportEvents } from "./pulls";
import { fetchEventsBody, reportCacheTtl, type EventsRequest } from "./wcl";

/**
 * Deaths and enemy casts for every boss fight. The pull list does not depend on any of this,
 * so a failed request is logged and leaves that part empty instead of failing the raid.
 */
export async function loadReportEvents(
  code: string,
  clientId: string,
  clientSecret: string,
  useFixtures: boolean,
  report: ReportSummary,
  cache: UpstreamCache,
): Promise<ReportEvents> {
  const bossFightIds = report.fights
    .filter((fight) => fight.encounterID > 0)
    .map((fight) => fight.id);

  if (bossFightIds.length === 0) return NO_EVENTS;

  // Events can only grow while the log does, so they keep the report's lifetime.
  const ttl = reportCacheTtl(report, Date.now());

  const request = (key: string, query: EventsRequest) =>
    fetchEventsBody(code, clientId, clientSecret, useFixtures, key, query, cache, ttl)
      .then(readEvents)
      .catch(keepGoing);

  const [deaths, casts] = await Promise.all([
    request("deaths", {
      dataType: "Deaths",
      hostility: "Friendlies",
      fightIds: bossFightIds,
      filter: null,
    }),
    request("casts", {
      dataType: "Casts",
      hostility: "Enemies",
      fightIds: bossFightIds,
      filter: null,
    }),
  ]);

  return { deaths: deaths ?? [], casts: casts ?? [] };
}

function keepGoing(cause: unknown): WclEvent[] {
  const kind = eventFailureKind(cause);

  if (kind == null) throw cause;

  console.warn(`Warcraft Logs events request failed: ${kind}`);

  return [];
}

/** Kind only. The cause can carry tokens or response bodies, so it is not logged. */
function eventFailureKind(cause: unknown): string | null {
  if (cause instanceof HttpError) return "http";

  if (cause instanceof SyntaxError) return "non-json";

  if (cause instanceof z.ZodError) return "schema";

  if (cause instanceof TypeError) return "network";

  return null;
}
