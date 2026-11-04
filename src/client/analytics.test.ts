import { describe, expect, it } from "vitest";

import { initAnalytics, track } from "./analytics";

describe("analytics", () => {
  it("does nothing when PostHog is not configured", () => {
    expect(import.meta.env.DEV).toBe(true);
    expect(() => {
      initAnalytics();
      track("raid loaded", { pull_count: 3 });
      track("pull clicked", { encounter_id: 3492, kill: false });
      track("VOD played", {});
    }).not.toThrow();
  });
});
