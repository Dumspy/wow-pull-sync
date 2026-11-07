import type { Pull } from "../types";

/** Boss HP left when the pull ended, 0 to 100, as the pull row and bar show it. */
export function hpLeft(pull: Pull): number {
  if (pull.kill) return 0;

  if (pull.bossPercentage == null) return 100;

  return Math.min(100, Math.max(0, Math.round(pull.bossPercentage)));
}

export interface BossGroup {
  name: string;
  pulls: Pull[];
}

/** Consecutive pulls of the same boss. A boss pulled again later starts a new group. */
export function groupByBoss(pulls: readonly Pull[]): BossGroup[] {
  const groups: BossGroup[] = [];

  for (const pull of pulls) {
    const last = groups.at(-1);

    if (last?.name === pull.bossName) last.pulls.push(pull);
    else groups.push({ name: pull.bossName, pulls: [pull] });
  }

  return groups;
}

/** "1 / 16 · 12%": kills out of pulls, plus the best wipe until there is a kill. */
export function groupSummary(pulls: readonly Pull[]): string {
  const kills = pulls.filter((pull) => pull.kill).length;
  const base = `${kills} / ${pulls.length}`;

  if (kills > 0) return base;

  const best = Math.min(...pulls.map(hpLeft));

  return `${base} · ${best}%`;
}

export interface BossSummary {
  encounterId: number;
  name: string;
  pulls: Pull[];
  kills: number;
  wipes: number;
  /** Total pull time in milliseconds. */
  timeMs: number;
  /** Lowest boss HP left on a wipe, 0 to 100. Null when there is no wipe. */
  bestWipeHp: number | null;
}

/** Every boss pulled in the report, in the order each was first pulled, with all its pulls. */
export function summarizeBosses(pulls: readonly Pull[]): BossSummary[] {
  const byEncounter = new Map<number, Pull[]>();

  for (const pull of pulls) {
    byEncounter.set(pull.encounterId, [...(byEncounter.get(pull.encounterId) ?? []), pull]);
  }

  return [...byEncounter.entries()].map(([encounterId, group]) => {
    const kills = group.filter((pull) => pull.kill).length;
    const wipes = group.filter((pull) => !pull.kill).map(hpLeft);

    return {
      encounterId,
      name: group[0]?.bossName ?? "Unknown",
      pulls: group,
      kills,
      wipes: wipes.length,
      timeMs: group.reduce((sum, pull) => sum + pull.durationMs, 0),
      bestWipeHp: wipes.length > 0 ? Math.min(...wipes) : null,
    };
  });
}

/** "3h 12m", "45m", or "50s" for short totals. */
export function formatSpan(ms: number): string {
  const minutes = Math.round(ms / 60_000);

  if (minutes >= 60) return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

  if (minutes > 0) return `${minutes}m`;

  return `${Math.round(ms / 1000)}s`;
}
