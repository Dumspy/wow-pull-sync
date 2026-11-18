import { describe, expect, it } from "vitest";

import type { Player } from "../types";
import { VodLoadError } from "./raid-queries";
import { raidVod } from "./raid-vods";

const PLAYERS: Player[] = [
  { id: 12, name: "Healgoesbrr", wowClass: "druid", spec: null, server: null },
];

const LOADED = {
  platform: "twitch",
  id: "2914150345",
  title: "Mythic Ulasnek",
  startedAtMs: 1_000,
  durationSeconds: 8429,
  live: false,
} as const;

describe("raidVod", () => {
  it("names a VOD after its recorded-by player and builds its source with the offset", () => {
    const vod = raidVod(
      { platform: "twitch", id: "2914150345", offset: -2, by: 12 },
      1,
      { data: LOADED, error: null },
      PLAYERS,
      0,
    );

    expect(vod).toMatchObject({
      name: "Healgoesbrr",
      wowClass: "druid",
      platformLabel: "Twitch",
      status: "ready",
      source: { kind: "twitch", id: "2914150345", startedAt: 1_000, duration: 8429, offset: -2 },
    });
  });

  it("falls back to its position when no recorded-by player is set", () => {
    const vod = raidVod(
      { platform: "youtube", id: "BLJBhzLNt8w" },
      0,
      { data: undefined, error: null },
      PLAYERS,
      0,
    );

    expect(vod).toMatchObject({ name: "VOD 1", status: "loading", source: null });
  });

  it("calls a VOD the platform no longer has expired, and keeps other errors as failed", () => {
    const ref = { platform: "twitch", id: "1" } as const;

    const gone = raidVod(
      ref,
      0,
      { data: undefined, error: new VodLoadError("We couldn't find this video.", "not-found") },
      PLAYERS,
      0,
    );

    const broken = raidVod(
      ref,
      0,
      { data: undefined, error: new VodLoadError("Twitch could not be reached.", null) },
      PLAYERS,
      0,
    );

    expect(gone.status).toBe("expired");
    expect(broken).toMatchObject({ status: "failed", error: "Twitch could not be reached." });
  });
});

describe("raidVod for a running stream", () => {
  it("grows the source with the clock, so new pulls land inside it", () => {
    const vod = raidVod(
      { platform: "twitch", id: "2914150345", by: 12 },
      0,
      { data: { ...LOADED, durationSeconds: 60, live: true }, error: null },
      PLAYERS,
      1_000 + 2 * 3600_000,
    );

    expect(vod).toMatchObject({ live: true, source: { duration: 2 * 3600 } });
  });
});
