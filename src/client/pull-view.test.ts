import { describe, expect, it } from "vitest";

import type { Pull } from "../types";
import { formatSpan, summarizeBosses } from "./pull-view";

function pull(fightId: number, encounterId: number, kill: boolean, pct: number | null): Pull {
  return {
    fightId,
    encounterId,
    bossName: `Boss ${encounterId}`,
    kill,
    pullNumber: fightId,
    durationMs: 60_000,
    bossPercentage: pct,
    startedAt: 0,
    endedAt: 0,
    vodSeconds: 0,
    inVod: true,
    difficulty: null,
    fightPercentage: null,
    lastPhase: null,
    phaseStarts: [],
    playerIds: [],
    deaths: [],
    casts: [],
  };
}

describe("summarizeBosses", () => {
  it("merges a boss pulled again later and keeps first-pulled order", () => {
    const summary = summarizeBosses([
      pull(1, 10, false, 40),
      pull(2, 20, false, 80),
      pull(3, 10, true, 0),
    ]);

    expect(summary.map((boss) => boss.encounterId)).toEqual([10, 20]);
    expect(summary[0]).toMatchObject({ kills: 1, wipes: 1, timeMs: 120_000, bestWipeHp: 40 });
    expect(summary[1]).toMatchObject({ kills: 0, wipes: 1, bestWipeHp: 80 });
  });

  it("has no best wipe when every pull killed", () => {
    expect(summarizeBosses([pull(1, 10, true, 0)])[0]?.bestWipeHp).toBeNull();
  });
});

describe("formatSpan", () => {
  it("formats hours, minutes and seconds", () => {
    expect(formatSpan(3 * 3_600_000 + 12 * 60_000)).toBe("3h 12m");
    expect(formatSpan(45 * 60_000)).toBe("45m");
    expect(formatSpan(20_000)).toBe("20s");
  });
});
