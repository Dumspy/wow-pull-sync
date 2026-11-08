import { describe, expect, it } from "vitest";

import { formatClock } from "./client/format";

import {
  FIXTURE_TWITCH_VIDEO_ID,
  FIXTURE_VIDEO_ID,
  fixtureReportBody,
  fixtureTwitchVideoBody,
  fixtureYoutubeBody,
} from "./fixtures";
import { matchPullToVod } from "./match";
import { readReport, readTwitchVideo, readYoutubeVideo } from "./parse-api";
import { buildPulls } from "./pulls";
import { pullInSource, pullToVideoSeconds, sameMoment, type VideoSource } from "./source";

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

  it("matches the wall-clock formula for the recorded night, including a shifted offset", () => {
    for (const offset of [0, 10, -30]) {
      const source = sourceFrom(vod, offset);
      const pulls = buildPulls(report);

      for (const pull of pulls) {
        const fight = report.fights.find((item) => item.id === pull.fightId);

        const match = matchPullToVod({
          reportStartMs: report.startTime,
          fightStartMs: fight?.startTime ?? 0,
          actualStartMs: vod.actualStartMs,
          vodDurationSeconds: vod.durationSeconds,
          offsetSeconds: offset,
        });

        expect(pullToVideoSeconds(pull, source)).toBeCloseTo(match.vodSeconds, 6);
        expect(pullInSource(pull, source)).toBe(match.inVod);
        expect(pull.endedAt - pull.startedAt).toBe(pull.durationMs);
      }
    }
  });

  it("keeps pull start on the report wall clock", () => {
    const fight = report.fights.find((item) => item.id === 1);
    const pull = buildPulls(report)[0];
    expect(fight).toBeDefined();
    expect(pull?.startedAt).toBe(report.startTime + (fight?.startTime ?? 0));
  });

  it("places early pulls before video second 0 when the stream starts late", () => {
    const late = readYoutubeVideo(
      fixtureYoutubeBody(FIXTURE_VIDEO_ID, "https://youtube.com/live/BLJBhzLNt8w?fixture=outside"),
    );

    const source = sourceFrom(late, 0);
    const pulls = buildPulls(report);
    expect(pullInSource(pulls[0]!, source)).toBe(false);
    expect(pullToVideoSeconds(pulls[0]!, source)).toBeLessThan(0);
    expect(pullInSource(pulls[2]!, source)).toBe(true);
  });

  it("places the same pulls on the Twitch VOD of the night, about 21 minutes earlier", () => {
    const twitch = readTwitchVideo(fixtureTwitchVideoBody(FIXTURE_TWITCH_VIDEO_ID));
    const source: VideoSource = { ...sourceFrom(twitch, 0), kind: "twitch" };
    const pulls = buildPulls(report);

    expect(formatClock(pullToVideoSeconds(pulls[0]!, source))).toBe("2:57");
    expect(pulls.every((pull) => pullInSource(pull, source))).toBe(true);
  });

  it("keeps the same moment of the night when switching from YouTube to Twitch and back", () => {
    const youtube = sourceFrom(vod, 6);

    const twitch: VideoSource = {
      ...sourceFrom(readTwitchVideo(fixtureTwitchVideoBody(FIXTURE_TWITCH_VIDEO_ID)), -2),
      kind: "twitch",
    };

    const first = buildPulls(report)[0]!;
    const onYoutube = pullToVideoSeconds(first, youtube) + 30;
    const onTwitch = sameMoment(onYoutube, youtube, twitch);

    expect(onTwitch).toBeCloseTo(pullToVideoSeconds(first, twitch) + 30, 6);
    expect(sameMoment(onTwitch ?? 0, twitch, youtube)).toBeCloseTo(onYoutube, 6);
  });

  it("has no same moment before a VOD starts or after it ends", () => {
    const twitch: VideoSource = {
      ...sourceFrom(readTwitchVideo(fixtureTwitchVideoBody(FIXTURE_TWITCH_VIDEO_ID)), 0),
      kind: "twitch",
    };

    const youtube = sourceFrom(vod, 0);

    // The YouTube stream starts about 21 minutes before the Twitch one and ends about 4 before it.
    expect(sameMoment(60, youtube, twitch)).toBeNull();
    expect(sameMoment(twitch.duration, twitch, youtube)).toBeNull();
  });
});
