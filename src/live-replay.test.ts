import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "./api";
import { reportResponseSchema, vodResponseSchema } from "./contract";
import { resetReplay } from "./live-replay";
import { pullToVideoSeconds } from "./source";

const ENV = { USE_FIXTURES: "true", FIXTURE_LIVE_REPLAY: "true" };
const START = Date.parse("2026-11-08T20:00:00Z");

function post(path: "/report" | "/vod", body: { reportUrl: string } | { vodUrl: string }) {
  return api.request(
    path,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
    ENV,
  );
}

async function report() {
  const response = await post("/report", {
    reportUrl: "https://www.warcraftlogs.com/reports/TPYJD2c4VkLZfBp9",
  });

  return reportResponseSchema.parse(await response.json());
}

async function youtube() {
  const response = await post("/vod", { vodUrl: "https://youtube.com/live/BLJBhzLNt8w" });

  return vodResponseSchema.parse(await response.json());
}

describe("live replay of the fixture night", () => {
  beforeEach(() => {
    resetReplay();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(START);
  });

  afterEach(() => vi.useRealTimers());

  it("starts 40 minutes in, live, with only the pulls that have ended", async () => {
    const live = await report();

    expect(live.live).toBe(true);
    expect(live.pulls).toHaveLength(7);
    expect(live.pulls.every((pull) => pull.endedAt <= START)).toBe(true);
  });

  it("adds pulls as the clock moves, then ends with the night", async () => {
    await report();
    vi.setSystemTime(START + 5 * 60_000);

    expect((await report()).pulls).toHaveLength(8);

    vi.setSystemTime(START + 6 * 3600_000);
    const ended = await report();

    expect(ended.live).toBe(false);
    expect(ended.pulls.length).toBeGreaterThan(20);
  });

  it("keeps every pull on the same second of the video as the recorded night", async () => {
    const live = await report();
    const vod = await youtube();

    expect(vod.live).toBe(true);
    expect(vod.durationSeconds).toBeGreaterThan(0);

    const source = {
      kind: "youtube" as const,
      id: vod.id,
      startedAt: vod.startedAtMs,
      duration: vod.durationSeconds,
      offset: 0,
    };

    // Ula'tek pull 1 is at 24:32 in the recorded VOD.
    expect(Math.round(pullToVideoSeconds(live.pulls[0] ?? { startedAt: 0 }, source))).toBe(1472);
  });

  it("rejects the Twitch broadcast of the night while it is still going", async () => {
    await report();
    const response = await post("/vod", { vodUrl: "https://www.twitch.tv/videos/2914150345" });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ reason: "live" });
  });
});
