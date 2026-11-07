import { specFromIcon, wowClassFor } from "./classes";
import type { Ability, EncounterPhases, Player } from "./contract";
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

/** Names for the spells in `spellIds`, from the report's ability list. Unnamed ones keep the id. */
export function buildAbilities(report: ReportSummary, spellIds: Iterable<number>): Ability[] {
  const names = new Map(
    (report.masterData?.abilities ?? []).map((ability) => [ability.gameID, ability.name]),
  );

  return [...new Set(spellIds)]
    .sort((a, b) => a - b)
    .map((id) => ({ id, name: names.get(id) ?? `Spell ${id}` }));
}
