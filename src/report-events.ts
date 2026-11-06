import type { Lane } from "./contract";
import { HttpError } from "./http-error";
import { LANES } from "./lanes";
import { readEvents, type ReportSummary, type WclEvent } from "./parse-api";
import { NO_EVENTS, type ReportEvents } from "./pulls";
import { fetchEventsBody, type EventsRequest } from "./wcl";

/** Lane definitions that apply to this report, and the events to draw them. */
export interface LoadedEvents {
  events: ReportEvents;
  lanes: Lane[];
}

/**
 * Deaths for every boss fight, plus the events of each configured lane whose encounter is in
 * the report. The pull list does not depend on any of this, so a failed request leaves that
 * part empty instead of failing the raid.
 */
export async function loadReportEvents(
  code: string,
  clientId: string,
  clientSecret: string,
  useFixtures: boolean,
  report: ReportSummary,
): Promise<LoadedEvents> {
  const fightsByEncounter = new Map<number, number[]>();

  for (const fight of report.fights) {
    if (fight.encounterID <= 0) continue;

    fightsByEncounter.set(fight.encounterID, [
      ...(fightsByEncounter.get(fight.encounterID) ?? []),
      fight.id,
    ]);
  }

  const bossFightIds = [...fightsByEncounter.values()].flat();

  if (bossFightIds.length === 0) return { events: NO_EVENTS, lanes: [] };

  const lanes = LANES.filter((lane) => fightsByEncounter.has(lane.encounterId));

  const request = (key: string, query: EventsRequest) =>
    fetchEventsBody(code, clientId, clientSecret, useFixtures, key, query).then(
      readEvents,
      keepGoing,
    );

  const [deaths, ...laneEvents] = await Promise.all([
    request("deaths", {
      dataType: "Deaths",
      hostility: "Friendlies",
      fightIds: bossFightIds,
      filter: null,
    }),
    ...lanes.map((lane) =>
      request(lane.id, {
        dataType: lane.dataType,
        hostility: lane.hostility,
        fightIds: fightsByEncounter.get(lane.encounterId) ?? [],
        filter: `ability.id in (${lane.spellIds.join(",")})`,
      }),
    ),
  ]);

  return {
    events: {
      deaths: deaths ?? [],
      lanes: lanes.map((lane, index) => ({ lane, events: laneEvents[index] ?? [] })),
    },
    lanes,
  };
}

function keepGoing(error: Error): WclEvent[] {
  if (error instanceof HttpError) return [];

  throw error;
}
