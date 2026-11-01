import { describe, expect, it } from "vitest";
import { matchPullToVod } from "./match";

const inRange = {
  reportStartMs: 1_000_000,
  fightStartMs: 60_000,
  actualStartMs: 1_000_000,
  vodDurationSeconds: 600,
  offsetSeconds: 0,
};

describe("matchPullToVod", () => {
  it("places an in-range pull at the fight offset from the stream start", () => {
    expect(matchPullToVod(inRange)).toEqual({ vodSeconds: 60, inVod: true });
  });

  it("marks a pull before the stream started as outside the VOD", () => {
    const result = matchPullToVod({ ...inRange, actualStartMs: 1_120_000 });
    expect(result.vodSeconds).toBe(-60);
    expect(result.inVod).toBe(false);
  });

  it("marks a pull after the VOD ends as outside the VOD", () => {
    const result = matchPullToVod({ ...inRange, vodDurationSeconds: 30 });
    expect(result.vodSeconds).toBe(60);
    expect(result.inVod).toBe(false);
  });

  it("shifts every timestamp by the offset", () => {
    expect(matchPullToVod({ ...inRange, offsetSeconds: 15 })).toEqual({
      vodSeconds: 75,
      inVod: true,
    });
    const pulledForward = matchPullToVod({
      ...inRange,
      vodDurationSeconds: 30,
      offsetSeconds: -40,
    });
    expect(pulledForward).toEqual({ vodSeconds: 20, inVod: true });
  });

  it("keeps the exact start and the exact end inside the VOD", () => {
    expect(matchPullToVod({ ...inRange, fightStartMs: 0 }).inVod).toBe(true);
    expect(matchPullToVod({ ...inRange, fightStartMs: 600_000 }).inVod).toBe(true);
    expect(matchPullToVod({ ...inRange, fightStartMs: 600_001 }).inVod).toBe(false);
  });
});
