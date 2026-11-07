import { createServer, type Server } from "node:http";

import { flush } from "@sentry/cloudflare";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import app from "./worker";

const REPORT = "TPYJD2c4VkLZfBp9";
const VIDEO = "BLJBhzLNt8w";
const WCL_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.wcl-token";
const CLIENT_SECRET = "wcl-client-secret";
const API_KEY = "AIzaSyDUMMYKEY1234567890";

describe("worker sentry", () => {
  let server: Server;
  let dsn = "";
  const bodies: string[] = [];

  beforeAll(async () => {
    server = createServer((request, response) => {
      const chunks: Buffer[] = [];

      request.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
      request.on("end", () => {
        bodies.push(Buffer.concat(chunks).toString("utf8"));
        response.statusCode = 200;
        response.end("ok");
      });
    });
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });
    const address = listenAddress(server.address());

    if (!address) throw new Error("mock ingest did not bind");
    dsn = `http://public@127.0.0.1:${address.port}/1`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("makes no ingest request when SENTRY_DSN is unset", async () => {
    bodies.splice(0);

    const execution = executionContext();

    const response = await app.request(
      "http://pull-sync.example/api/debug-sentry",
      { method: "GET" },
      { ASSETS: assets },
      execution.ctx,
    );

    await response.text();
    await execution.done();
    await flush(1000);

    expect(response.status).toBe(500);
    expect(bodies).toEqual([]);
  });

  it("reports an unexpected debug error once and leaves the 4xx pulls response alone", async () => {
    bodies.splice(0);

    const execution = executionContext();
    const env = { ASSETS: assets, SENTRY_DSN: dsn };

    const debug = await app.request(
      `http://pull-sync.example/api/debug-sentry?access_token=${WCL_TOKEN}&t=9`,
      {
        method: "GET",
        headers: { authorization: `Bearer ${WCL_TOKEN}`, cookie: "session=topsecret" },
      },
      env,
      execution.ctx,
    );

    const missing = await app.request(
      "http://pull-sync.example/api/pulls",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reportUrl: "https://www.warcraftlogs.com/reports/aaaaaaaaaaaaaaaa",
          vodUrl: `https://youtube.com/live/${VIDEO}`,
        }),
      },
      { ...env, USE_FIXTURES: "true" },
      execution.ctx,
    );

    expect(debug.status).toBe(500);
    expect(await debug.text()).not.toContain(REPORT);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ error: "No Warcraft Logs report found for that link." });
    await execution.done();
    await flush(1000);

    expect(eventCount(bodies)).toBe(1);
    expect(transactionCount(bodies)).toBe(0);
    expect(joined(bodies)).toContain("Sentry test error");
    expect(joined(bodies)).not.toContain(WCL_TOKEN);
    expect(joined(bodies)).not.toContain("topsecret");
    expect(joined(bodies)).not.toContain("t=9");
  });

  it("reports a swallowed pulls failure once and keeps the 500 JSON", async () => {
    bodies.splice(0);

    const execution = executionContext();
    const original = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      const url = requestUrl(input);

      if (url.includes("127.0.0.1")) return original(input, init);
      throw new Error(`network down ${url}`);
    };

    try {
      const response = await app.request(
        `http://pull-sync.example/api/pulls?access_token=${WCL_TOKEN}`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${WCL_TOKEN}`,
            cookie: "session=topsecret",
          },
          body: JSON.stringify({
            reportUrl: `https://www.warcraftlogs.com/reports/${REPORT}`,
            vodUrl: `https://youtube.com/live/${VIDEO}`,
            client_secret: CLIENT_SECRET,
          }),
        },
        {
          ASSETS: assets,
          SENTRY_DSN: dsn,
          WCL_CLIENT_ID: "wcl-client-id",
          WCL_CLIENT_SECRET: CLIENT_SECRET,
          YOUTUBE_API_KEY: API_KEY,
        },
        execution.ctx,
      );

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: "Something went wrong loading that raid." });
      await execution.done();
      await flush(1000);

      expect(eventCount(bodies)).toBe(1);
      const payload = joined(bodies);
      expect(payload).not.toContain(REPORT);
      expect(payload).not.toContain(VIDEO);
      expect(payload).not.toContain(WCL_TOKEN);
      expect(payload).not.toContain(CLIENT_SECRET);
      expect(payload).not.toContain(API_KEY);
      expect(payload).not.toContain("topsecret");
      expect(payload).not.toContain("wcl-client-id");
    } finally {
      globalThis.fetch = original;
    }
  });
});

const assets = {
  fetch: async () => new Response("page", { headers: { "content-type": "text/html" } }),
};

function executionContext() {
  const tasks: Array<Promise<unknown>> = [];

  return {
    ctx: {
      waitUntil(task: Promise<unknown>) {
        tasks.push(task);
      },
      passThroughOnException() {
        return undefined;
      },
      props: {},
    },
    async done() {
      let seen = 0;

      while (seen !== tasks.length) {
        const next = tasks.slice(seen);

        seen = tasks.length;
        await Promise.all(next);
      }
    },
  };
}

function listenAddress(address: ReturnType<Server["address"]>): { port: number } | null {
  const parsed = z.object({ port: z.number() }).safeParse(address);

  return parsed.success ? parsed.data : null;
}

function requestUrl(input: RequestInfo | URL): string {
  if (input instanceof Request) return input.url;

  return String(input);
}

function joined(payloads: string[]): string {
  return payloads.join("\n");
}

function eventCount(payloads: string[]): number {
  return countType(payloads, "event");
}

function transactionCount(payloads: string[]): number {
  return countType(payloads, "transaction");
}

function countType(payloads: string[], type: string): number {
  let count = 0;

  for (const payload of payloads) {
    const matches = payload.match(new RegExp(`"type":"${type}"`, "g"));

    count += matches?.length ?? 0;
  }

  return count;
}
