import { pullSecondsIn, type VideoSource } from "../source";
import type { Pull } from "../types";

/** One tenth of a second is the finest nudge, so offsets stay on tenths. */
export function nudgedOffset(offset: number, delta: number): number {
  return Math.round((offset + delta) * 10) / 10;
}

/**
 * Pulls to line the VOD up against: the first one it covers (the anchor), then one from the
 * middle and the last one, to confirm the offset holds across the night.
 */
export function pullsToCheck(pulls: Pull[], source: VideoSource): Pull[] {
  const covered = pulls.filter((pull) => pullSecondsIn(pull, source) != null);
  const picks = [covered[0], covered[Math.floor(covered.length / 2)], covered.at(-1)];
  const seen = new Set<number>();
  const result: Pull[] = [];

  for (const pull of picks) {
    if (!pull || seen.has(pull.fightId)) continue;
    seen.add(pull.fightId);
    result.push(pull);
  }

  return result;
}
