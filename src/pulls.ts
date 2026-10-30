import { matchPullToVod } from "./match";
import type { Pull, ReportSummary, VodSummary } from "./types";

/** Boss pulls only (`encounterID > 0`). Pull numbers restart for each boss. */
export function buildPulls(
  report: ReportSummary,
  vod: VodSummary,
  offsetSeconds: number,
): Pull[] {
  const bosses = report.fights
    .filter((fight) => fight.encounterID > 0)
    .slice()
    .sort((a, b) => a.startTime - b.startTime || a.id - b.id);

  const seen = new Map<number, number>();
  return bosses.map((fight) => {
    const pullNumber = (seen.get(fight.encounterID) ?? 0) + 1;
    seen.set(fight.encounterID, pullNumber);
    const match = matchPullToVod({
      reportStartMs: report.startTime,
      fightStartMs: fight.startTime,
      actualStartMs: vod.actualStartMs,
      vodDurationSeconds: vod.durationSeconds,
      offsetSeconds,
    });
    return {
      fightId: fight.id,
      bossName: fight.name,
      kill: fight.kill === true,
      pullNumber,
      durationMs: Math.max(0, fight.endTime - fight.startTime),
      bossPercentage: fight.bossPercentage,
      vodSeconds: match.vodSeconds,
      inVod: match.inVod,
    };
  });
}
