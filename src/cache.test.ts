import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { SETTLED_TTL_SECONDS, UpstreamCache, type CacheStore } from "./cache";
import { pullSyncResponseSchema } from "./contract";
import {
  fixtureEventsBody,
  fixtureReportBody,
  fixtureYoutubeBody,
  FIXTURE_VIDEO_ID,
} from "./fixtures";
import { jsonBody, type Json } from "./json";
import app from "./worker";

const CODE = "TPYJD2c4VkLZfBp9";

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

describe("POST /api/pulls with a cache", () => {
  it("answers a repeat load from the cache without calling upstream", async () => {
    const calls = stubUpstream(fixtureReportBody(CODE));
    const store = new MemoryStore();

    const first = await postPulls(store);
    const upstreamCalls = calls.length;

    const second = await postPulls(store);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(calls).toHaveLength(upstreamCalls);
    expect(second.headers.get("Server-Timing")).toContain('desc="6 hit, 0 miss"');

    expect(pullSyncResponseSchema.parse(await second.json())).toEqual(
      pullSyncResponseSchema.parse(await first.json()),
    );

    expect([...store.entries.values()].every((entry) => entry.ttl === SETTLED_TTL_SECONDS)).toBe(
      true,
    );
  });

  it("does not cache a report that is still being logged", async () => {
    stubUpstream(withEndTime(fixtureReportBody(CODE), Date.now()));

    const store = new MemoryStore();

    expect((await postPulls(store)).status).toBe(200);
    expect([...store.entries.keys()].map((key) => key.split(":")[0])).toEqual(["youtube-video"]);
  });
});

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

/** Stubs the token, report, events and YouTube endpoints with fixtures. Returns the request log. */
function stubUpstream(reportBody: Json): string[] {
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
        const deaths = body.includes('"dataType":"Deaths"');

        return Response.json({
          data: {
            reportData: {
              report: {
                events: {
                  data: deaths ? fixtureEventsBody(CODE, "deaths") : [],
                  nextPageTimestamp: null,
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

function postPulls(store: CacheStore) {
  return app.request(
    "http://localhost/api/pulls",
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
