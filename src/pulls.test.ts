import { describe, expect, it } from "vitest";
import { z } from "zod";
import { formatClock } from "./client/format";
import {
  FIXTURE_NON_LIVE_VIDEO_ID,
  FIXTURE_VIDEO_ID,
  fixtureReportBody,
  fixtureYoutubeBody,
} from "./fixtures";
import { HttpError } from "./http-error";
import { matchPullToVod } from "./match";
import { readReport, readYoutubeVideo } from "./parse-api";
import { buildPulls } from "./pulls";

/** Independently computed table for this report/VOD pair. */
const expected = [
  [1, "Ula'tek", 1, false, "0:19", "99.99%", 1471.7, "24:32"],
  [2, "Ula'tek", 2, false, "1:12", "90.11%", 1720.0, "28:40"],
  [3, "Ula'tek", 3, false, "4:52", "64.1%", 1889.3, "31:29"],
  [4, "Ula'tek", 4, false, "2:05", "83.08%", 2233.0, "37:13"],
  [5, "Ula'tek", 5, false, "2:38", "76.74%", 2401.5, "40:01"],
  [6, "Ula'tek", 6, false, "4:39", "64.88%", 2621.4, "43:41"],
  [7, "Ula'tek", 7, false, "2:35", "79.74%", 2950.6, "49:11"],
  [8, "Ula'tek", 8, false, "3:57", "62.77%", 3188.7, "53:09"],
  [9, "Ula'tek", 9, false, "3:02", "64.32%", 3467.8, "57:48"],
  [10, "Ula'tek", 10, false, "4:54", "63.24%", 3709.8, "1:01:50"],
  [11, "Ula'tek", 11, false, "2:12", "79.98%", 4058.7, "1:07:39"],
  [12, "Ula'tek", 12, false, "2:16", "79.76%", 4273.8, "1:11:14"],
  [13, "Ula'tek", 13, false, "4:01", "62.41%", 4463.5, "1:14:23"],
  [14, "Ula'tek", 14, false, "1:29", "86.69%", 4799.0, "1:19:59"],
  [15, "Ula'tek", 15, false, "2:48", "68.73%", 4932.4, "1:22:12"],
  [16, "Ula'tek", 16, false, "8:10", "23.82%", 5169.7, "1:26:10"],
  [17, "Ula'tek", 17, false, "2:13", "80.02%", 5830.4, "1:37:10"],
  [18, "Ula'tek", 18, false, "2:48", "70.17%", 6012.6, "1:40:13"],
  [19, "Ula'tek", 19, false, "5:21", "52.63%", 6244.0, "1:44:04"],
  [20, "Ula'tek", 20, false, "0:47", "91.36%", 7303.2, "2:01:43"],
  [21, "Ula'tek", 21, true, "9:59", "0.01%", 7415.4, "2:03:35"],
  [26, "Nymrissa Wavecaller", 1, true, "4:46", "0.01%", 9061.4, "2:31:01"],
] as const;

function percent(value: number): string {
  return `${value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "")}%`;
}

describe("recorded raid night", () => {
  const report = readReport(fixtureReportBody("TPYJD2c4VkLZfBp9"));
  const vod = readYoutubeVideo(fixtureYoutubeBody(FIXTURE_VIDEO_ID));

  it("uses the video duration, which is 3s shorter than actualEnd minus actualStart", () => {
    expect(vod.durationSeconds).toBe(2 * 3600 + 38 * 60 + 15);
    const started = Date.parse("2026-10-29T18:38:02Z");
    const ended = Date.parse("2026-10-29T21:16:20Z");
    expect((ended - started) / 1000 - vod.durationSeconds).toBe(3);
    expect(
      matchPullToVod({
        reportStartMs: 0,
        fightStartMs: 9496_000,
        actualStartMs: 0,
        vodDurationSeconds: vod.durationSeconds,
        offsetSeconds: 0,
      }).inVod,
    ).toBe(false);
  });

  it("matches the expected boss pulls and drops trash, including same-name trash", () => {
    const pulls = buildPulls(report, vod, 0);
    expect(pulls).toHaveLength(22);
    expect(report.fights.some((fight) => fight.encounterID === 0 && fight.kill === null)).toBe(
      true,
    );
    expect(pulls.filter((pull) => pull.bossName === "Nymrissa Wavecaller")).toHaveLength(1);

    pulls.forEach((pull, index) => {
      const row = expected[index];
      expect(row, `row ${index}`).toBeDefined();

      if (!row) return;
      const [fightId, boss, pullNumber, kill, duration, bossPercent, vodSec, timestamp] = row;
      expect(pull.fightId).toBe(fightId);
      expect(pull.bossName).toBe(boss);
      expect(pull.pullNumber).toBe(pullNumber);
      expect(pull.kill).toBe(kill);
      expect(formatClock(pull.durationMs / 1000)).toBe(duration);
      expect(pull.bossPercentage).not.toBeNull();
      expect(percent(pull.bossPercentage ?? 0)).toBe(bossPercent);
      // The table prints one decimal. 1720.05 is the exact second for pull 2 and prints as 1720.0.
      expect(Math.abs(pull.vodSeconds - vodSec)).toBeLessThan(0.051);
      expect(formatClock(pull.vodSeconds)).toBe(timestamp);
      expect(pull.inVod).toBe(true);
    });
    expect(pulls[0]?.vodSeconds).toBeCloseTo(1471.7, 1);
    expect(formatClock(pulls[0]?.vodSeconds ?? 0)).toBe("24:32");
  });

  it("shifts every timestamp by the offset", () => {
    const pulls = buildPulls(report, vod, 10);
    expect(Math.round((pulls[0]?.vodSeconds ?? 0) * 10) / 10).toBe(1481.7);
    expect(formatClock(pulls[0]?.vodSeconds ?? 0)).toBe("24:42");
  });
});

describe("pulls outside the VOD", () => {
  it("marks pulls before a later stream start as not in the VOD", () => {
    const report = readReport(fixtureReportBody("TPYJD2c4VkLZfBp9"));

    const late = readYoutubeVideo(
      fixtureYoutubeBody(FIXTURE_VIDEO_ID, "https://youtube.com/live/BLJBhzLNt8w?fixture=outside"),
    );

    expect(late.actualStartMs - Date.parse("2026-10-29T18:38:02Z")).toBe(30 * 60 * 1000);
    expect(late.durationSeconds).toBe(9495);
    const pulls = buildPulls(report, late, 0);
    expect(pulls[0]).toMatchObject({ fightId: 1, inVod: false });
    expect(pulls[1]).toMatchObject({ fightId: 2, inVod: false });
    expect(pulls[2]?.inVod).toBe(true);
    expect(pulls[0]?.vodSeconds).toBeLessThan(0);
  });
});

describe("external response errors", () => {
  it("returns the Warcraft Logs error message", () => {
    expect(() => readReport({ errors: [{ message: "no such report" }] })).toThrow("no such report");
  });

  it("treats a missing report as not found and a bad report as a bad gateway", () => {
    expect(() => readReport({ data: { reportData: { report: null } } })).toThrow(
      "No Warcraft Logs report found for that link.",
    );

    try {
      readReport({ data: { reportData: { report: {} } } });
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);

      if (!(error instanceof HttpError)) return;

      expect(error.status).toBe(502);
      expect(error.message).toBe("Warcraft Logs returned an unexpected response.");
    }
  });

  it("rejects an empty YouTube list, a video with no length, and a bad start time", () => {
    expect(() => readYoutubeVideo({ items: [] })).toThrow("No YouTube video found for that link.");

    expect(() =>
      readYoutubeVideo({
        items: [
          {
            liveStreamingDetails: {
              actualStartTime: "2020-01-01T00:00:00Z",
              actualEndTime: "2020-01-01T01:00:00Z",
            },
          },
        ],
      }),
    ).toThrow("YouTube did not return a video length.");

    expect(() =>
      readYoutubeVideo({
        items: [
          {
            liveStreamingDetails: { actualStartTime: "not-a-date", actualEndTime: "also" },
            contentDetails: { duration: "PT1S" },
          },
        ],
      }),
    ).toThrow("YouTube returned an unexpected start time.");
  });
});

describe("youtube errors", () => {
  it("rejects the recorded non-live video", () => {
    expect(() => readYoutubeVideo(fixtureYoutubeBody(FIXTURE_NON_LIVE_VIDEO_ID))).toThrow(
      HttpError,
    );

    try {
      readYoutubeVideo(fixtureYoutubeBody(FIXTURE_NON_LIVE_VIDEO_ID));
    } catch (error) {
      expect(error).toBeInstanceOf(HttpError);

      if (!(error instanceof HttpError)) return;

      expect(error.message).toBe("That video is not a past live stream.");
    }
  });

  it("keeps an unknown fixture video on the non-live body and uses the requested id", () => {
    const body = fixtureYoutubeBody("abcdefghijk");
    const parsed = z.object({ items: z.array(z.object({ id: z.string() })) }).parse(body);

    expect(parsed.items[0]?.id).toBe("abcdefghijk");
    expect(() => readYoutubeVideo(body)).toThrow("That video is not a past live stream.");
  });
});
