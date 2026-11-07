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
