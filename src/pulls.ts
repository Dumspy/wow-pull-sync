import type { Death } from "./contract";
import type { WclEvent } from "./parse-api";
import type { Pull, ReportSummary } from "./types";

/** Events for one report: every player death, and every enemy cast. */
export interface ReportEvents {
  deaths: WclEvent[];
  casts: WclEvent[];
}

export const NO_EVENTS: ReportEvents = { deaths: [], casts: [] };

/** Boss pulls only (`encounterID > 0`). Pull numbers restart for each boss. */
export function buildPulls(report: ReportSummary, events: ReportEvents = NO_EVENTS): Pull[] {
  const bosses = report.fights
    .filter((fight) => fight.encounterID > 0)
    .slice()
    .sort((a, b) => a.startTime - b.startTime || a.id - b.id);

  const roster = new Set<number>();

  for (const actor of report.masterData?.actors ?? []) roster.add(actor.id);

  const seen = new Map<number, number>();

  return bosses.map((fight) => {
    const pullNumber = (seen.get(fight.encounterID) ?? 0) + 1;
    seen.set(fight.encounterID, pullNumber);

    const sinceStart = (timestamp: number) => Math.max(0, timestamp - fight.startTime);

    const deaths: Death[] = [];

    for (const event of events.deaths) {
      if (event.fight !== fight.id) continue;

      // Deaths include pets and NPCs; keep the roster's players only.
      if (roster.size > 0 && !roster.has(event.targetID)) continue;

      deaths.push({
        atMs: sinceStart(event.timestamp),
        playerId: event.targetID,
        killerAbilityId: event.killingAbilityGameID ?? null,
      });
    }

    deaths.sort((a, b) => a.atMs - b.atMs);

    const casts: Pull["casts"] = [];

    for (const event of events.casts) {
      // A cast also logs a `begincast`; count each cast once.
      if (event.fight !== fight.id || event.type === "begincast") continue;

      casts.push({ atMs: sinceStart(event.timestamp), spellId: event.abilityGameID });
    }

    casts.sort((a, b) => a.atMs - b.atMs);

    return {
      fightId: fight.id,
      encounterId: fight.encounterID,
      bossName: fight.name,
      kill: fight.kill === true,
      pullNumber,
      durationMs: Math.max(0, fight.endTime - fight.startTime),
      bossPercentage: fight.bossPercentage,
      startedAt: report.startTime + fight.startTime,
      endedAt: report.startTime + fight.endTime,
      difficulty: fight.difficulty,
      fightPercentage: fight.fightPercentage,
      lastPhase: fight.lastPhase,
      phaseStarts: fight.phaseTransitions.map((phase) => ({
        phaseId: phase.id,
        atMs: sinceStart(phase.startTime),
      })),
      playerIds: fight.friendlyPlayers,
      deaths,
      casts,
    };
  });
}
