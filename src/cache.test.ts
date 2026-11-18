import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { SETTLED_TTL_SECONDS, UpstreamCache, type CacheStore } from "./cache";
import { reportResponseSchema, vodResponseSchema } from "./contract";
import {
  fixtureEventsBody,
  fixtureReportBody,
  fixtureYoutubeBody,
  FIXTURE_VIDEO_ID,
} from "./fixtures";
import { jsonBody, type Json } from "./json";
import { LIVE_LOG_WINDOW_MS } from "./live";
import { readReport } from "./parse-api";
import { reportCacheTtl } from "./wcl";
import app from "./worker";
import { youtubeCacheTtl } from "./youtube";

const CODE = "TPYJD2c4VkLZfBp9";
const HOUR_MS = 60 * 60_000;

class MemoryStore implements CacheStore {
  readonly entries = new Map<string, { value: string; ttl: number }>();

  async get(key: string): Promise<string | null> {
    return this.entries.get(key)?.value ?? null;
  }

  async put(key: string, value: string, options: { expirationTtl: number }): Promise<void> {
    this.entries.set(key, { value, ttl: options.expirationTtl });
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("UpstreamCache", () => {
  it("loads every time without a store", async () => {
    const cache = new UpstreamCache(undefined, () => {});
    const load = vi.fn(async () => "body");

    await cache.json("test", "a", load, () => 600);
    await cache.json("test", "a", load, () => 600);

    expect(load).toHaveBeenCalledTimes(2);
  });

  it("serves a stored body and counts hits and misses", async () => {
    const store = new MemoryStore();
    const writes: Promise<void>[] = [];
    const cache = new UpstreamCache(store, (work) => writes.push(work));
    const load = vi.fn(async () => ({ value: 1 }));

    expect(await cache.json("test", "a", load, () => 600)).toEqual({ value: 1 });

    await Promise.all(writes);

    expect(await cache.json("test", "a", load, () => 600)).toEqual({ value: 1 });
    expect(load).toHaveBeenCalledTimes(1);
    expect([cache.hits, cache.misses]).toEqual([1, 1]);
  });

  it("keys on the request parts", async () => {
    const store = new MemoryStore();
    const writes: Promise<void>[] = [];
    const cache = new UpstreamCache(store, (work) => writes.push(work));

    await cache.json(
      "test",
      { code: "a" },
      async () => "a",
      () => 600,
    );
    await Promise.all(writes);

    expect(
      await cache.json(
        "test",
        { code: "b" },
        async () => "b",
        () => 600,
      ),
    ).toBe("b");
  });

  it("does not store a body without a lifetime and raises a short one to KV's minimum", async () => {
    const store = new MemoryStore();
    const writes: Promise<void>[] = [];
    const cache = new UpstreamCache(store, (work) => writes.push(work));

    await cache.json(
      "skip",
      "a",
      async () => "a",
      () => null,
    );
    await cache.json(
      "short",
      "a",
      async () => "a",
      () => 5,
    );
    await Promise.all(writes);

    expect([...store.entries.values()].map((entry) => entry.ttl)).toEqual([60]);
  });

  it("reloads when the stored entry is not JSON or the store fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const store = new MemoryStore();
    const cache = new UpstreamCache(store, () => {});

    await cache.json(
      "test",
      "a",
      async () => "first",
      () => 600,
    );

    for (const key of store.entries.keys()) store.entries.set(key, { value: "{", ttl: 600 });

    expect(
      await cache.json(
        "test",
        "a",
        async () => "second",
        () => 600,
      ),
    ).toBe("second");

    const failing = new UpstreamCache(
      { get: async () => Promise.reject(new Error("down")), put: async () => {} },
      () => {},
    );

    expect(
      await failing.json(
        "test",
        "a",
        async () => "third",
        () => 600,
      ),
    ).toBe("third");
  });
});

describe("reportCacheTtl", () => {
  const report = readReport(fixtureReportBody(CODE));
  const endMs = report.endTime ?? 0;

  it("does not cache a log inside the live window", () => {
    expect(reportCacheTtl(report, endMs + LIVE_LOG_WINDOW_MS - 1)).toBeNull();
  });

  it("keeps a young log for a tenth of its age", () => {
    expect(reportCacheTtl(report, endMs + HOUR_MS)).toBe(6 * 60);
    expect(reportCacheTtl(report, endMs + 12 * HOUR_MS)).toBe(72 * 60);
  });

  it("keeps a log for the full lifetime only once it is a day old", () => {
    expect(reportCacheTtl(report, endMs + 23 * HOUR_MS)).toBeLessThan(SETTLED_TTL_SECONDS);
    expect(reportCacheTtl(report, endMs + 24 * HOUR_MS)).toBe(SETTLED_TTL_SECONDS);
  });

  it("falls back to the last fight's end without an endTime", () => {
    const lastFightEnd = Math.max(...report.fights.map((fight) => fight.endTime));
    const withoutEnd = { ...report, endTime: null };

    expect(reportCacheTtl(withoutEnd, report.startTime + lastFightEnd + 10 * 60_000)).toBeNull();
  });
});

describe("youtubeCacheTtl", () => {
  const ended = fixtureYoutubeBody(FIXTURE_VIDEO_ID);

  it("keeps an ended stream with a length", () => {
    expect(youtubeCacheTtl(ended)).toBe(SETTLED_TTL_SECONDS);
  });

  it("does not keep a running stream, a zero length or a missing video", () => {
    const running = editYoutubeItem(ended, (item) => {
      item.liveStreamingDetails = { actualStartTime: "2026-10-29T18:38:02Z" };
    });

    const zeroLength = editYoutubeItem(ended, (item) => {
      item.contentDetails = { duration: "P0D" };
    });

    expect(youtubeCacheTtl(running)).toBeNull();
    expect(youtubeCacheTtl(zeroLength)).toBeNull();
    expect(youtubeCacheTtl({ items: [] })).toBeNull();
    expect(youtubeCacheTtl(fixtureYoutubeBody("dQw4w9WgXcQ"))).toBeNull();
  });
});

describe("POST /api/report with a cache", () => {
  it("answers a repeat load from the cache without calling Warcraft Logs", async () => {
    const calls = stubUpstream(fixtureReportBody(CODE), false);
    const store = new MemoryStore();

    const first = await post("/api/report", store);
    const upstreamCalls = calls.length;
    const second = await post("/api/report", store);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(calls).toHaveLength(upstreamCalls);
    expect(second.headers.get("Server-Timing")).toContain('desc="3 hit, 0 miss"');

    expect(reportResponseSchema.parse(await second.json())).toEqual(
      reportResponseSchema.parse(await first.json()),
    );

    expect([...store.entries.values()].map((entry) => entry.ttl)).toEqual([
      SETTLED_TTL_SECONDS,
      SETTLED_TTL_SECONDS,
      SETTLED_TTL_SECONDS,
    ]);
  });

  it("does not cache a report that is still being logged, or its events", async () => {
    stubUpstream(withEndTime(fixtureReportBody(CODE), Date.now()), false);

    const store = new MemoryStore();

    expect((await post("/api/report", store)).status).toBe(200);
    expect(store.entries.size).toBe(0);
  });

  it("does not cache an events list cut off at the page limit", async () => {
    stubUpstream(fixtureReportBody(CODE), true);

    const store = new MemoryStore();

    expect((await post("/api/report", store)).status).toBe(200);
    expect(prefixes(store)).toEqual(["wcl-report"]);
  });
});

describe("POST /api/vod with a cache", () => {
  it("answers a repeat load of an ended stream from the cache", async () => {
    const calls = stubUpstream(fixtureReportBody(CODE), false);
    const store = new MemoryStore();

    const first = await post("/api/vod", store);
    const second = await post("/api/vod", store);

    expect(calls).toHaveLength(1);
    expect(second.headers.get("Server-Timing")).toContain('desc="1 hit, 0 miss"');

    expect(vodResponseSchema.parse(await second.json())).toEqual(
      vodResponseSchema.parse(await first.json()),
    );
  });
});

function prefixes(store: MemoryStore): string[] {
  return [...store.entries.keys()].map((key) => key.split(":")[0] ?? "");
}

const youtubeItemsSchema = z.object({
  items: z.array(
    z.looseObject({
      liveStreamingDetails: z.looseObject({}),
      contentDetails: z.looseObject({}),
    }),
  ),
});

type YoutubeItem = z.output<typeof youtubeItemsSchema>["items"][number];

/** A copy of a videos.list body with its first item changed by `edit`. */
function editYoutubeItem(body: Json, edit: (item: YoutubeItem) => void): Json {
  const copy = youtubeItemsSchema.parse(structuredClone(body));
  const item = copy.items[0];

  if (item) edit(item);

  return jsonBody.parse(copy);
}

/** A copy of a report body with the report's last event at `endTime`. */
function withEndTime(body: Json, endTime: number): Json {
  const copy = z
    .object({
      data: z.object({ reportData: z.object({ report: z.looseObject({ endTime: z.number() }) }) }),
    })
    .parse(structuredClone(body));

  copy.data.reportData.report.endTime = endTime;

  return jsonBody.parse(copy);
}

/**
 * Stubs the token, report, events and YouTube endpoints with fixtures. With `endlessEvents`
 * every events page points at another one. Returns the request log.
 */
function stubUpstream(reportBody: Json, endlessEvents: boolean): string[] {
  const calls: string[] = [];

  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = input instanceof Request ? input.url : input.toString();
      const body = String(init?.body ?? "");

      calls.push(url);

      if (url === "https://www.warcraftlogs.com/oauth/token") {
        return Response.json({ access_token: "token", expires_in: 3600 });
      }

      if (url.startsWith("https://www.googleapis.com/youtube/")) {
        return Response.json(fixtureYoutubeBody(FIXTURE_VIDEO_ID));
      }

      if (body.includes("ReportFights")) return Response.json(reportBody);

      if (body.includes("ReportEvents")) {
        const key = body.includes('"dataType":"Deaths"') ? "deaths" : "casts";

        return Response.json({
          data: {
            reportData: {
              report: {
                events: {
                  data: fixtureEventsBody(CODE, key),
                  nextPageTimestamp: endlessEvents ? 1 : null,
                },
              },
            },
          },
        });
      }

      throw new Error("unexpected fetch");
    },
  );

  return calls;
}

function post(path: "/api/report" | "/api/vod", store: CacheStore) {
  return app.request(
    `http://localhost${path}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reportUrl: `https://www.warcraftlogs.com/reports/${CODE}`,
        vodUrl: "https://youtube.com/live/BLJBhzLNt8w",
      }),
    },
    {
      ASSETS: { fetch: async () => new Response("") },
      WCL_CLIENT_ID: "client-id",
      WCL_CLIENT_SECRET: "client-secret",
      YOUTUBE_API_KEY: "youtube-key",
      PULL_CACHE: store,
    },
  );
}
