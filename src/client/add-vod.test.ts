import { describe, expect, it } from "vitest";

import { fixtureReportBody } from "../fixtures";
import { readReport } from "../parse-api";
import { buildPulls } from "../pulls";
import type { VideoSource } from "../source";
import { nudgedOffset, pullsToCheck } from "./add-vod";

const pulls = buildPulls(readReport(fixtureReportBody("TPYJD2c4VkLZfBp9")));

const twitch: VideoSource = {
  kind: "twitch",
  id: "2914150345",
  startedAt: Date.parse("2026-10-29T18:59:37Z"),
  duration: 8429,
  offset: 0,
};

describe("Add VOD", () => {
  it("keeps nudged offsets on tenths of a second", () => {
    expect(nudgedOffset(0, 0.1)).toBe(0.1);
    expect(nudgedOffset(0.2, 0.1)).toBe(0.3);
    expect(nudgedOffset(6, -1)).toBe(5);
    expect(nudgedOffset(-0.1, 0.1)).toBe(0);
  });

  it("checks the first, a middle and the last pull the VOD covers", () => {
    const checks = pullsToCheck(pulls, twitch);

    expect(checks.map((pull) => [pull.bossName, pull.pullNumber])).toEqual([
      ["Ula'tek", 1],
      ["Ula'tek", 12],
      ["Nymrissa Wavecaller", 1],
    ]);
  });

  it("checks only the pulls a short VOD covers, once each", () => {
    const short = { ...twitch, duration: 200 };

    expect(pullsToCheck(pulls, short).map((pull) => pull.fightId)).toEqual([1]);
    expect(pullsToCheck(pulls, { ...twitch, duration: 0, startedAt: 0 })).toEqual([]);
  });
});
