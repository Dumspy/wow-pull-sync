import { describe, expect, it } from "vitest";

import wranglerConfig from "../wrangler.jsonc?raw";

import { api } from "./api";
import { pullSyncResponseSchema } from "./contract";
import app from "./worker";

function post(body: string) {
  return api.request("/pulls", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}

describe("POST /api/pulls", () => {
  it("returns Hono's default 404 for a method other than POST", async () => {
    const response = await api.request("/pulls", { method: "GET" });

    expect(response.status).toBe(404);
  });

  it("rejects a body that is not JSON", async () => {
    const response = await post("{");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Send a JSON body." });
  });

  it("rejects a JSON value that is not an object", async () => {
    const response = await post("null");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Send a JSON body." });
  });

  it("asks for both URLs", async () => {
    const response = await post("{}");

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Enter a Warcraft Logs report URL and a YouTube VOD URL.",
    });
  });

  it("rejects a non-numeric offset", async () => {
    const response = await post(
      JSON.stringify({
        reportUrl: "https://www.warcraftlogs.com/reports/abc",
        vodUrl: "https://youtube.com/watch?v=abcdefghijk",
        offsetSeconds: "nope",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Offset must be a number of seconds." });
  });

  it("serves every other path from the asset binding", async () => {
    const env = {
      ASSETS: {
        fetch: async () => new Response("page", { headers: { "content-type": "text/html" } }),
      },
    };

    const page = await app.request("http://localhost/", {}, env);
    const other = await app.request("http://localhost/api/other", {}, env);
    const wrongMethod = await app.request("http://localhost/api/pulls", { method: "GET" }, env);

    const mountedPost = await app.request(
      "http://localhost/api/pulls",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{}",
      },
      env,
    );

    expect(page.status).toBe(200);
    expect(await page.text()).toBe("page");
    expect(other.status).toBe(200);
    expect(await other.text()).toBe("page");
    expect(wrongMethod.status).toBe(404);
    expect(mountedPost.status).toBe(400);
  });

  it("serves a raid URL from assets and keeps a non-POST /api/pulls off the HTML page", async () => {
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

    const wrongMethod = await app.request("http://localhost/api/pulls", { method: "GET" }, env);
    const wrongText = await wrongMethod.text();

    expect(raid.status).toBe(200);
    expect(raid.headers.get("content-type")).toContain("text/html");
    expect(await raid.text()).toContain('id="root"');
    expect(wrongMethod.status).toBe(404);
    expect(wrongMethod.headers.get("content-type") ?? "").not.toContain("text/html");
    expect(wrongText).not.toContain("root");
    expect(wrongText).not.toContain("<!doctype");
  });

  it("keeps Workers Assets on the single-page app for paths other than /api", () => {
    const config = wranglerConfig;

    expect(config).toContain('"not_found_handling": "single-page-application"');
    expect(config).toContain('"/api/*"');
  });

  it("keeps the encounter id on the pulls response", async () => {
    const response = await api.request(
      "/pulls",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reportUrl: "https://www.warcraftlogs.com/reports/TPYJD2c4VkLZfBp9",
          vodUrl: "https://youtube.com/live/BLJBhzLNt8w",
        }),
      },
      { USE_FIXTURES: "true" },
    );

    expect(response.status).toBe(200);

    const body = pullSyncResponseSchema.parse(await response.json());

    expect(body.pulls[0]?.encounterId).toBe(3492);
    expect(body.pulls.at(-1)?.encounterId).toBe(3379);
  });

  it("treats a missing offset as zero and then checks the report URL", async () => {
    const response = await post(JSON.stringify({ reportUrl: "nope", vodUrl: "nope" }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "That doesn't look like a Warcraft Logs report URL.",
    });
  });
});
