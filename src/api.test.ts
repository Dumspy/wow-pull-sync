import { describe, expect, it } from "vitest";

import wranglerConfig from "../wrangler.jsonc?raw";

import { api } from "./api";
import { reportResponseSchema, vodResponseSchema } from "./contract";
import app from "./worker";

function post(path: "/report" | "/vod", body: string) {
  return api.request(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("POST /api/report and /api/vod", () => {
  it("returns Hono's default 404 for a method other than POST", async () => {
    expect((await api.request("/report", { method: "GET" })).status).toBe(404);
    expect((await api.request("/vod", { method: "GET" })).status).toBe(404);
  });

  it("rejects a body that is not JSON", async () => {
    for (const path of ["/report", "/vod"] as const) {
      const response = await post(path, "{");

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Send a JSON body." });
    }
  });

  it("rejects a JSON value that is not an object", async () => {
    for (const path of ["/report", "/vod"] as const) {
      const response = await post(path, "null");

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Send a JSON body." });
    }
  });

  it("asks for the URL each endpoint needs", async () => {
    const report = await post("/report", "{}");
    const vod = await post("/vod", "{}");

    expect(report.status).toBe(400);
    expect(await report.json()).toEqual({ error: "Enter a Warcraft Logs report URL." });
    expect(vod.status).toBe(400);
    expect(await vod.json()).toEqual({ error: "Enter a YouTube or Twitch VOD URL." });
  });

  it("checks the report URL and the VOD URL", async () => {
    const report = await post("/report", JSON.stringify({ reportUrl: "nope" }));
    const vod = await post("/vod", JSON.stringify({ vodUrl: "nope" }));

    expect(report.status).toBe(400);
    expect(await report.json()).toEqual({
      error: "That doesn't look like a Warcraft Logs report URL.",
    });
    expect(vod.status).toBe(400);
    expect(await vod.json()).toEqual({
      error: "This link is not supported. pull-sync works with YouTube and Twitch recordings.",
      reason: "unsupported",
    });
  });

  it("serves every other path from the asset binding", async () => {
    const env = {
      ASSETS: {
        fetch: async () => new Response("page", { headers: { "content-type": "text/html" } }),
      },
    };

    const page = await app.request("http://localhost/", {}, env);
    const other = await app.request("http://localhost/api/other", {}, env);
    const oldPulls = await app.request("http://localhost/api/pulls", { method: "POST" }, env);

    expect(page.status).toBe(200);
    expect(await page.text()).toBe("page");
    expect(other.status).toBe(200);
    expect(await other.text()).toBe("page");
    expect(oldPulls.status).toBe(200);

    for (const path of ["/api/report", "/api/vod"]) {
      const wrongMethod = await app.request(`http://localhost${path}`, { method: "GET" }, env);

      const mountedPost = await app.request(
        `http://localhost${path}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}",
        },
        env,
      );

      expect(wrongMethod.status).toBe(404);
      expect(mountedPost.status).toBe(400);
    }
  });

  it("serves a raid URL from assets and keeps a non-POST API call off the HTML page", async () => {
    const env = {
      ASSETS: {
        fetch: async (input: Request | URL | string) => {
          const url = input instanceof Request ? input.url : String(input);
          const path = new URL(url).pathname;

          if (path.startsWith("/raid/")) {
            return new Response('<!doctype html><div id="root"></div>', {
              headers: { "content-type": "text/html; charset=utf-8" },
            });
          }

          return new Response("page", { headers: { "content-type": "text/html" } });
        },
      },
    };

    const raid = await app.request(
      "http://localhost/raid/TPYJD2c4VkLZfBp9?vod=BLJBhzLNt8w&pull=12",
      {},
      env,
    );

    expect(raid.status).toBe(200);
    expect(raid.headers.get("content-type")).toContain("text/html");
    expect(await raid.text()).toContain('id="root"');

    for (const path of ["/api/report", "/api/vod"]) {
      const wrongMethod = await app.request(`http://localhost${path}`, { method: "GET" }, env);
      const wrongText = await wrongMethod.text();

      expect(wrongMethod.status).toBe(404);
      expect(wrongMethod.headers.get("content-type") ?? "").not.toContain("text/html");
      expect(wrongText).not.toContain("root");
      expect(wrongText).not.toContain("<!doctype");
    }
  });

  it("keeps Workers Assets on the single-page app for paths other than /api", () => {
    const config = wranglerConfig;

    expect(config).toContain('"not_found_handling": "single-page-application"');
    expect(config).toContain('"/api/*"');
  });

  it("keeps the encounter id on the report response", async () => {
    const response = await api.request(
      "/report",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reportUrl: "https://www.warcraftlogs.com/reports/TPYJD2c4VkLZfBp9",
        }),
      },
      { USE_FIXTURES: "true" },
    );

    expect(response.status).toBe(200);

    const body = reportResponseSchema.parse(await response.json());

    expect(body.pulls[0]?.encounterId).toBe(3492);
    expect(body.pulls.at(-1)?.encounterId).toBe(3379);
  });

  it("returns the VOD's start time and length", async () => {
    const response = await api.request(
      "/vod",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vodUrl: "https://youtube.com/live/BLJBhzLNt8w" }),
      },
      { USE_FIXTURES: "true" },
    );

    expect(response.status).toBe(200);
    expect(vodResponseSchema.parse(await response.json())).toEqual({
      platform: "youtube",
      id: "BLJBhzLNt8w",
      title: "Average Pillagers - 29/10/26",
      startedAtMs: Date.parse("2026-10-29T18:38:02Z"),
      durationSeconds: 9495,
    });
  });

  it("names the reason a YouTube link can't be used", async () => {
    const vod = (vodUrl: string) =>
      api.request(
        "/vod",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ vodUrl }),
        },
        { USE_FIXTURES: "true" },
      );

    const upload = await vod("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

    expect(upload.status).toBe(400);
    expect(await upload.json()).toMatchObject({ reason: "not-stream" });
  });

  it("recognises a Twitch link but does not load it yet", async () => {
    const response = await post(
      "/vod",
      JSON.stringify({ vodUrl: "https://www.twitch.tv/videos/2914150345" }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Twitch VODs are not supported yet." });
  });

  it("asks only for the credentials each endpoint uses", async () => {
    const report = await api.request(
      "/report",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reportUrl: "https://www.warcraftlogs.com/reports/TPYJD2c4VkLZfBp9",
        }),
      },
      { YOUTUBE_API_KEY: "key" },
    );

    const vod = await api.request(
      "/vod",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ vodUrl: "https://youtube.com/live/BLJBhzLNt8w" }),
      },
      { WCL_CLIENT_ID: "id", WCL_CLIENT_SECRET: "secret" },
    );

    expect(report.status).toBe(500);
    expect(await report.json()).toEqual({ error: "WCL API credentials are not configured." });
    expect(vod.status).toBe(500);
    expect(await vod.json()).toEqual({ error: "YouTube API credentials are not configured." });
  });
});
