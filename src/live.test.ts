import { describe, expect, it } from "vitest";

import { isLogLive, LIVE_LOG_WINDOW_MS, vodLengthSeconds } from "./live";

describe("isLogLive", () => {
  const end = Date.parse("2026-10-29T21:00:00Z");

  it("counts a log written to within the window as live, through a raid break", () => {
    expect(isLogLive(end, end + 1_000)).toBe(true);
    expect(isLogLive(end, end + 15 * 60_000)).toBe(true);
  });

  it("counts a log that has not moved for the whole window as ended", () => {
    expect(isLogLive(end, end + LIVE_LOG_WINDOW_MS)).toBe(false);
    expect(isLogLive(end, end + 24 * 3600_000)).toBe(false);
  });
});

describe("vodLengthSeconds", () => {
  const vod = { startedAtMs: 1_000_000, durationSeconds: 600 };

  it("keeps a finished VOD's length", () => {
    expect(vodLengthSeconds({ ...vod, live: false }, 1_000_000 + 3600_000)).toBe(600);
  });

  it("grows a live stream with the clock", () => {
    expect(vodLengthSeconds({ ...vod, live: true }, 1_000_000 + 3600_000)).toBe(3600);
  });

  it("never shrinks a live stream below the length it was loaded with", () => {
    expect(vodLengthSeconds({ ...vod, live: true }, 1_000_000 + 60_000)).toBe(600);
  });
});
