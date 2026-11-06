// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";

import { analyticsInitOptions } from "./analytics";

describe("cookieless analytics", () => {
  it("keeps the browser empty and sends product events without $exception", async () => {
    Object.defineProperty(navigator, "webdriver", { configurable: true, get: () => false });

    const localKeys: string[] = [];
    const sessionKeys: string[] = [];
    const cookieWrites: string[] = [];

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

    const seen: Array<{ event: string; token: unknown; cookieless: unknown }> = [];
    const { default: posthog } = await import("posthog-js/dist/module.slim.no-external");
    const options = analyticsInitOptions();

    options.before_send = (event) => {
      seen.push({
        event: event.event,
        token: event.properties.token,
        cookieless: event.properties.$cookieless_mode,
      });

      return null;
    };

    posthog.init("phc_cookieless_test", options);
    posthog.capture("raid loaded", { pull_count: 3 });
    posthog.capture("$pageview");
    posthog.captureException(new Error("pull sync check"));

    expect(seen.map((event) => event.event)).toEqual(["raid loaded", "$pageview"]);
    expect(seen.every((event) => event.event !== "$exception")).toBe(true);
    expect(seen[0]?.token).toBe("phc_cookieless_test");
    expect(seen[0]?.cookieless).toBe(true);
    // Support probes only. posthog-js deletes them before capture returns.
    expect(localKeys).toEqual(["__mplssupport__"]);
    expect(sessionKeys).toEqual(["__support__"]);
    expect(cookieWrites).toEqual([]);
    expect(window.localStorage.length).toBe(0);
    expect(window.sessionStorage.length).toBe(0);
    expect(document.cookie).toBe("");
  });
});

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
