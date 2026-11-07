import { specFromIcon, wowClassFor } from "./classes";
import { HIDDEN_SPELL_IDS, HIDDEN_SPELL_NAMES } from "./hidden-spells";
import type { Ability, EncounterPhases, Player } from "./contract";
import type { ReportSummary, WclEvent } from "./parse-api";

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

/** Names and icons for the spells in `spellIds`. Unnamed ones keep the id and have no icon. */
export function buildAbilities(report: ReportSummary, spellIds: Iterable<number>): Ability[] {
  const known = new Map(
    (report.masterData?.abilities ?? []).map((ability) => [ability.gameID, ability]),
  );

  return [...new Set(spellIds)]
    .sort((a, b) => a - b)
    .map((id) => ({
      id,
      name: known.get(id)?.name ?? `Spell ${id}`,
      icon: known.get(id)?.icon ?? null,
    }));
}

/** The casts without the spells on the hidden list. */
export function withoutHiddenSpells(report: ReportSummary, casts: WclEvent[]): WclEvent[] {
  const names = new Map(
    (report.masterData?.abilities ?? []).map((ability) => [ability.gameID, ability.name]),
  );

  return casts.filter((cast) => {
    if (HIDDEN_SPELL_IDS.has(cast.abilityGameID)) return false;

    const name = names.get(cast.abilityGameID)?.toLowerCase();

    return name == null || !HIDDEN_SPELL_NAMES.has(name);
  });
}
