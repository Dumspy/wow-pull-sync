// @vitest-environment happy-dom

import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import type { CaptureResult } from "posthog-js";
import { describe, expect, it } from "vitest";

import { ErrorTrackingExtensions } from "posthog-js/dist/extension-bundles";

import { analyticsInitOptions, initAnalytics, onResolvedPageview, track } from "./analytics";
import { scrubAnalyticsCapture } from "./analytics-scrub";
import { queryErrorProperties, reportedQueryName } from "./query-client";
import { raidLinkError, raidSearchSchema } from "./raid-search";
import { routeErrorMessage } from "./route-status";

const REPORT = "TPYJD2c4VkLZfBp9";
const VIDEO = "BLJBhzLNt8w";

describe("analytics", () => {
  it("does nothing when PostHog is not configured", () => {
    expect(import.meta.env.DEV).toBe(true);
    expect(() => {
      initAnalytics();
      track("raid loaded", { pull_count: 3 });
      track("pull clicked", { encounter_id: 3492, kill: false });
      track("VOD played");
    }).not.toThrow();
  });

  it("keeps automatic pageviews off and scrubs through before_send", () => {
    const options = analyticsInitOptions(ErrorTrackingExtensions);

    expect(options.capture_pageview).toBe(false);
    expect(options.capture_pageleave).toBe(false);
    expect(options.cookieless_mode).toBe("always");
    expect(options.persistence).toBeUndefined();
    expect(options.before_send).toBe(scrubAnalyticsCapture);
    expect(options.__extensionClasses?.exceptionObserver).toBe(
      ErrorTrackingExtensions.exceptionObserver,
    );
    expect(options.__extensionClasses?.exceptions).toBe(ErrorTrackingExtensions.exceptions);
    expect(options.api_host).toBe("https://eu.i.posthog.com");
  });
});

describe("analytics scrub", () => {
  it("rewrites raid urls and leaves token in place", () => {
    const capture: CaptureResult = {
      uuid: "00000000-0000-4000-8000-000000000001",
      event: "$pageview",
      properties: {
        distinct_id: "memory-session",
        token: "phc_project_token",
        $current_url: `https://pull-sync.example/raid/${REPORT}?vod=${VIDEO}&pull=42&t=1472&token=phc_keep`,
        $pathname: `/raid/${REPORT}`,
        $referrer: `https://pull-sync.example/raid/${REPORT}?vod=${VIDEO}&pull=7`,
        $initial_referrer: `https://youtube.com/live/${VIDEO}`,
        $initial_current_url: `https://www.warcraftlogs.com/reports/${REPORT}#fight=99`,
        $session_entry_url: `https://pull-sync.example/raid/${REPORT}?pull=7&token=phc_entry`,
        $session_entry_pathname: `/raid/${REPORT}`,
        encounter_id: 3492,
        $exception_list: [
          {
            type: "TypeError",
            value: `Failed to fetch https://pull-sync.example/api/pulls while on https://pull-sync.example/raid/${REPORT}?vod=${VIDEO}&pull=42`,
            stacktrace: {
              frames: [
                {
                  filename: `https://pull-sync.example/raid/${REPORT}?vod=${VIDEO}`,
                  abs_path: `https://youtu.be/${VIDEO}`,
                },
              ],
            },
          },
        ],
      },
      $set: {
        $initial_pathname: `/raid/${REPORT}`,
        token: "phc_set_token",
      },
      $set_once: {
        $initial_referrer: `https://www.youtube.com/watch?v=${VIDEO}&token=phc_once`,
        $session_entry_pathname: `/raid/${REPORT}`,
      },
    };

    const scrubbed = scrubAnalyticsCapture(capture);
    const serialised = JSON.stringify(scrubbed);

    expect(serialised).not.toContain(REPORT);
    expect(serialised).not.toContain(VIDEO);
    expect(serialised).not.toContain("pull=42");
    expect(serialised).not.toContain("pull=7");
    expect(serialised).not.toContain("fight=99");
    expect(serialised).toContain("phc_project_token");
    expect(serialised).toContain("token=phc_keep");
    expect(serialised).toContain("phc_set_token");
    expect(serialised).toContain("token=phc_once");
    expect(serialised).toContain("token=phc_entry");
    expect(serialised).toContain("/raid/:report");
    expect(serialised).toContain("/reports/:report");
    expect(serialised).toContain("vod=:video");
    expect(serialised).toContain("pull=:pull");
    expect(serialised).toContain("fight=:pull");
    expect(serialised).toContain("/live/:video");
    expect(serialised).toContain("youtu.be/:video");
    expect(serialised).toContain("v=:video");
    expect(serialised).toContain("/api/pulls");
    expect(scrubbed.properties.encounter_id).toBe(3492);
    expect(scrubbed.properties.token).toBe("phc_project_token");
    expect(scrubbed.properties.$current_url).toBe(
      "https://pull-sync.example/raid/:report?vod=:video&pull=:pull&t=1472&token=phc_keep",
    );
    expect(scrubbed.properties.$pathname).toBe("/raid/:report");
  });
});

describe("query errors", () => {
  it("reports only the query name", () => {
    const name = reportedQueryName(["pulls", REPORT, VIDEO, 0]);

    expect(name).toBe("pulls");
    expect(JSON.stringify(queryErrorProperties(name ?? ""))).toBe('{"query":"pulls"}');
    expect(reportedQueryName(["pulls"])).toBe("pulls");
    expect(reportedQueryName([1, REPORT])).toBeNull();
  });
});

describe("router pageviews", () => {
  it("captures the first load and a path change, not a search-only change", async () => {
    const rootRoute = createRootRoute();

    const indexRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/",
    });

    const raidRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/raid/$reportCode",
      validateSearch: raidSearchSchema,
    });

    const routeTree = rootRoute.addChildren([indexRoute, raidRoute]);
    const history = createMemoryHistory({ initialEntries: ["/"] });
    const router = createRouter({ routeTree, history, isServer: false });
    const paths: string[] = [];

    router.subscribe("onResolved", (event) => {
      if (!onResolvedPageview(event.pathChanged, event.fromLocation)) return;
      paths.push(event.toLocation.pathname);
    });
    await router.load();
    await router.navigate({
      to: "/raid/$reportCode",
      params: { reportCode: REPORT },
      search: { vod: VIDEO },
    });
    await router.navigate({
      to: "/raid/$reportCode",
      params: { reportCode: REPORT },
      search: { vod: VIDEO, pull: 12, t: 90 },
    });
    await router.navigate({ to: "/" });

    expect(paths).toEqual(["/", `/raid/${REPORT}`, "/"]);
    expect(onResolvedPageview(false, undefined)).toBe(true);
    expect(onResolvedPageview(true, { pathname: "/" })).toBe(true);
    expect(onResolvedPageview(false, { pathname: `/raid/${REPORT}` })).toBe(false);
  });

  it("rejects a raid link that is missing a VOD", async () => {
    const rootRoute = createRootRoute();

    const raidRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: "/raid/$reportCode",
      validateSearch: raidSearchSchema,
    });

    const routeTree = rootRoute.addChildren([raidRoute]);

    const history = createMemoryHistory({
      initialEntries: [`/raid/${REPORT}`],
    });

    const router = createRouter({ routeTree, history, isServer: false });
    await router.load();

    const failed = router.state.matches.find((match) => match.status === "error");

    expect(failed?.routeId).toBe("/raid/$reportCode");
    expect(routeErrorMessage(failed?.error)).toBe(raidLinkError);
  });
});
