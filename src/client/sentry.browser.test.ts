// @vitest-environment happy-dom

import { createServer, request as httpRequest, type Server } from "node:http";

import { makeFetchTransport } from "@sentry/react";
import * as Sentry from "@sentry/react";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { z } from "zod";

import { queryClient, queryErrorTag } from "./query-client";
import { initBrowserSentry, initSentry } from "./sentry";
import { SentryFallback } from "./sentry-fallback";

const REPORT = "TPYJD2c4VkLZfBp9";
const VIDEO = "BLJBhzLNt8w";

describe("browser sentry", () => {
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
    const address = z.object({ port: z.number() }).safeParse(server.address());

    if (!address.success) throw new Error("mock ingest did not bind");
    dsn = `http://public@127.0.0.1:${address.data.port}/1`;
  });

  afterAll(async () => {
    await Sentry.close(1000);
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("does nothing and makes no request when the DSN is missing", async () => {
    const calls: string[] = [];
    const original = window.fetch.bind(window);
    window.fetch = async (input) => {
      calls.push(String(input));

      return new Response("ok");
    };

    try {
      initSentry();
      initBrowserSentry("");
      initBrowserSentry("   ");
      Sentry.captureException(new Error("should not send"));
      await Sentry.flush(500);
      expect(calls).toEqual([]);
      expect(Sentry.getClient()).toBeUndefined();
    } finally {
      window.fetch = original;
    }
  });

  it("reports a render error once, tags only the query name, and stores nothing", async () => {
    bodies.splice(0);

    const localKeys: string[] = [];
    const sessionKeys: string[] = [];
    const cookieWrites: string[] = [];

    installStorage(localKeys, sessionKeys, cookieWrites);
    initBrowserSentry(dsn, (options) => makeFetchTransport(options, nodeFetch));

    const container = document.createElement("div");

    document.body.append(container);

    const root = createRoot(container, {
      onUncaughtError: Sentry.reactErrorHandler(),
      onCaughtError: Sentry.reactErrorHandler(),
      onRecoverableError: Sentry.reactErrorHandler(),
    });

    renderCrash(root);
    await settle();
    document.querySelector("button")?.click();
    await settle();
    await Sentry.flush(2000);

    expect(container.textContent).toContain("Something went wrong.");
    expect(eventCount(bodies)).toBe(1);
    expect(transactionCount(bodies)).toBe(0);
    expect(joined(bodies)).toContain("Sentry test error");
    expect(joined(bodies)).not.toContain(REPORT);
    expect(joined(bodies)).not.toContain(VIDEO);

    bodies.splice(0);
    await queryClient
      .fetchQuery({
        queryKey: ["pulls", REPORT, VIDEO, 0],
        queryFn: () => {
          throw new Error(
            `Could not load https://pull-sync.example/raid/${REPORT}?vod=${VIDEO}&pull=42&t=1472`,
          );
        },
        retry: false,
      })
      .catch(() => undefined);
    await queryClient
      .getMutationCache()
      .build(queryClient, {
        mutationKey: ["save", REPORT],
        mutationFn: () => {
          throw new Error(`token=super-secret-token https://youtu.be/${VIDEO}`);
        },
      })
      .execute(undefined)
      .catch(() => undefined);
    await Sentry.flush(2000);

    expect(eventCount(bodies)).toBe(2);
    const payload = joined(bodies);
    expect(payload).toContain('"query":"pulls"');
    expect(payload).toContain('"query":"save"');
    expect(payload).not.toContain(REPORT);
    expect(payload).not.toContain(VIDEO);
    expect(payload).not.toContain("pull=42");
    expect(payload).not.toContain("t=1472");
    expect(payload).not.toContain("super-secret-token");
    expect(queryErrorTag("pulls")).toBe("pulls");
    expect(localKeys.filter((key) => key.toLowerCase().includes("sentry"))).toEqual([]);
    expect(sessionKeys.filter((key) => key.toLowerCase().includes("sentry"))).toEqual([]);
    expect(cookieWrites.join("").toLowerCase()).not.toContain("sentry");
    expect(document.cookie.toLowerCase()).not.toContain("sentry");
    root.unmount();
  });
});

function nodeFetch(url: string, init: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    const request = httpRequest(url, { method: "POST" }, (response) => {
      response.resume();
      resolve(new Response(null, { status: response.statusCode ?? 200 }));
    });

    const body = z.union([z.string(), z.instanceof(Uint8Array)]).safeParse(init.body);

    request.on("error", reject);

    if (body.success) request.write(body.data);
    request.end();
  });
}

function renderCrash(root: Root): void {
  function Crash() {
    const [crash, setCrash] = useState(false);

    if (crash) {
      throw new Error(
        `Sentry test error https://pull-sync.example/raid/${REPORT}?vod=${VIDEO}&pull=4&t=8`,
      );
    }

    return createElement("button", { type: "button", onClick: () => setCrash(true) }, "Throw");
  }

  root.render(
    createElement(
      Sentry.ErrorBoundary,
      { fallback: createElement(SentryFallback) },
      createElement(Crash),
    ),
  );
}

async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 50));
}

function installStorage(localKeys: string[], sessionKeys: string[], cookieWrites: string[]): void {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: recordingStorage(localKeys),
  });
  Object.defineProperty(window, "sessionStorage", {
    configurable: true,
    value: recordingStorage(sessionKeys),
  });
  let cookie = "";
  Object.defineProperty(document, "cookie", {
    configurable: true,
    get: () => cookie,
    set: (value: string) => {
      cookieWrites.push(value);
      cookie = value;
    },
  });
}

function recordingStorage(writes: string[]): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.get(key) ?? null;
    },
    key(index) {
      return [...values.keys()][index] ?? null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      writes.push(key);
      values.set(key, value);
    },
  };
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
