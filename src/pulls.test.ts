import { describe, expect, it } from "vitest";
import { fixtureReportBody, fixtureYoutubeBody, FIXTURE_VIDEO_ID } from "./fixtures";
import { readReport, readYoutubeVideo } from "./parse-api";
import { buildPulls } from "./pulls";
import { HttpError } from "./http-error";

describe("fixture night", () => {
  const report = readReport(fixtureReportBody("TPYJD2c4VkLZfBp9"));
  const vod = readYoutubeVideo(fixtureYoutubeBody(FIXTURE_VIDEO_ID));

  it("drops trash and numbers pulls per boss", () => {
    const pulls = buildPulls(report, vod, 0);
    expect(pulls.map((pull) => pull.bossName)).not.toContain("Trash");
    expect(pulls).toHaveLength(12);
    const nek = pulls.filter((pull) => pull.bossName === "Nek'zali the Soulcoiler");
    expect(nek.map((pull) => [pull.pullNumber, pull.kill])).toEqual([
      [1, false],
      [2, true],
    ]);
    expect(nek[0]?.durationMs).toBe(185_000);
  });

  it("lands the first boss pull well into the VOD and the last one outside it", () => {
    const pulls = buildPulls(report, vod, 0);
    expect(pulls[0]).toMatchObject({
      bossName: "Nek'zali the Soulcoiler",
      vodSeconds: 2280,
      inVod: true,
    });
    expect(pulls.at(-1)).toMatchObject({
      bossName: "The Coiled Altar",
      pullNumber: 2,
      vodSeconds: 12300,
      inVod: false,
    });
  });

  it("shifts the late pull into the VOD when the offset moves every timestamp", () => {
    const pulls = buildPulls(report, vod, -400);
    expect(pulls[0]?.vodSeconds).toBe(1880);
    expect(pulls.at(-1)?.inVod).toBe(true);
  });
});

describe("youtube errors", () => {
  it("rejects a video that was not a finished live stream", () => {
    expect(() => readYoutubeVideo(fixtureYoutubeBody("dQw4w9WgXcQ"))).toThrow(HttpError);
    try {
      readYoutubeVideo(fixtureYoutubeBody("dQw4w9WgXcQ"));
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);
      expect((error as HttpError).message).toBe("That video is not a past live stream.");
    }
  });
});
