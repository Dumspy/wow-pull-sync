import { specFromIcon, wowClassFor } from "./classes";
import type { EncounterPhases, Player } from "./contract";
import type { ReportSummary } from "./parse-api";

export function buildPlayers(report: ReportSummary): Player[] {
  const actors = report.masterData?.actors ?? [];

  return actors.map((actor) => ({
    id: actor.id,
    name: actor.name,
    wowClass: wowClassFor(actor.subType ?? null),
    spec: specFromIcon(actor.icon ?? null),
    server: actor.server ?? null,
  }));
}

/** Phase names for the encounters that were pulled in this report. */
export function buildEncounterPhases(report: ReportSummary): EncounterPhases[] {
  const pulled = new Set<number>();

  for (const fight of report.fights) {
    if (fight.encounterID > 0) pulled.add(fight.encounterID);
  }

  const result: EncounterPhases[] = [];

  for (const entry of report.phases ?? []) {
    if (!pulled.has(entry.encounterID)) continue;

    result.push({ encounterId: entry.encounterID, phases: entry.phases ?? [] });
  }

  return result;
}
