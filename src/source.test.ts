import { describe, expect, it } from "vitest";

import { FIXTURE_VIDEO_ID, fixtureReportBody, fixtureYoutubeBody } from "./fixtures";
import { readReport, readYoutubeVideo } from "./parse-api";
import { buildPulls } from "./pulls";
import { nightWindow, pullInSource, pullToVideoSeconds, type VideoSource } from "./source";

function sourceFrom(
  vod: { videoId: string; actualStartMs: number; durationSeconds: number },
  offset: number,
): VideoSource {
  return {
    kind: "youtube",
    id: vod.videoId,
    startedAt: vod.actualStartMs,
    duration: vod.durationSeconds,
    offset,
  };
}

describe("pull to video seconds", () => {
  const report = readReport(fixtureReportBody("TPYJD2c4VkLZfBp9"));
  const vod = readYoutubeVideo(fixtureYoutubeBody(FIXTURE_VIDEO_ID));

  it("matches the server mapping for the recorded night, including a shifted offset", () => {
    for (const offset of [0, 10, -30]) {
      const source = sourceFrom(vod, offset);
      const pulls = buildPulls(report, vod, offset);
      for (const pull of pulls) {
        expect(pullToVideoSeconds(pull, source)).toBeCloseTo(pull.vodSeconds, 6);
        expect(pullInSource(pull, source)).toBe(pull.inVod);
        expect(pull.endedAt - pull.startedAt).toBe(pull.durationMs);
      }
    }
  });

  it("keeps pull start on the report wall clock", () => {
    const fight = report.fights.find((item) => item.id === 1);
    const pull = buildPulls(report, vod, 0)[0];
    expect(fight).toBeDefined();
    expect(pull?.startedAt).toBe(report.startTime + (fight?.startTime ?? 0));
  });

  it("places early pulls before video second 0 when the stream starts late", () => {
    const late = readYoutubeVideo(
      fixtureYoutubeBody(FIXTURE_VIDEO_ID, "https://youtube.com/live/BLJBhzLNt8w?fixture=outside"),
    );
    const source = sourceFrom(late, 0);
    const pulls = buildPulls(report, late, 0);
    expect(pullInSource(pulls[0]!, source)).toBe(false);
    expect(pullToVideoSeconds(pulls[0]!, source)).toBeLessThan(0);
    expect(pullInSource(pulls[2]!, source)).toBe(true);
    expect(nightWindow(source, pulls).start).toBeLessThan(0);
  });
});
