import type { PostHogConfig } from "posthog-js/dist/module.slim.no-external";

import { scrubAnalyticsCapture } from "./analytics-scrub";

/** Named product events. `$pageview` is sent from router navigation, not via `track`. */
export type AnalyticsEvent = "raid loaded" | "pull clicked" | "VOD played";

export interface RaidLoadedProperties {
  pull_count: number;
}

export interface PullClickedProperties {
  encounter_id: number;
  kill: boolean;
}

type Client = { capture: PostHogCapture };

type PostHogCapture = (
  event: string,
  properties?: RaidLoadedProperties | PullClickedProperties,
) => void;

/** A previous location is present once the router has resolved at least one navigation. */
export interface ResolvedNavigation {
  pathname: string;
}

/** First load, and any later navigation that changes the path. Search-only updates are not pageviews. */
export function onResolvedPageview(
  pathChanged: boolean,
  fromLocation: ResolvedNavigation | undefined,
): boolean {
  return pathChanged || fromLocation == null;
}

/**
 * Init options shared by the app and the cookieless checks.
 * Exceptions stay off: Sentry owns errors. Pageviews are sent from the router.
 */
export function analyticsInitOptions(): Partial<PostHogConfig> {
  const options: Partial<PostHogConfig> = {
    api_host: "https://eu.i.posthog.com",
    // No cookies and no web storage. Identity is a server-side hash.
    // The PostHog project must have cookieless mode enabled or these events are dropped.
    // https://posthog.com/docs/libraries/js/persistence
    cookieless_mode: "always",
    cross_subdomain_cookie: false,
    debug: false,
    ip: false,
    person_profiles: "identified_only",
    save_campaign_params: false,
    disable_compression: true,
    capture_pageview: false,
    capture_pageleave: false,
    before_send: scrubAnalyticsCapture,
    autocapture: false,
    rageclick: false,
    capture_dead_clicks: false,
    capture_exceptions: false,
    capture_heatmaps: false,
    capture_performance: false,
    disable_scroll_properties: true,
    disable_session_recording: true,
    disable_surveys: true,
    disable_product_tours: true,
    disable_conversations: true,
    disable_external_dependency_loading: true,
    advanced_disable_flags: true,
    advanced_disable_feature_flags: true,
  };

  return options;
}

let client: Client | null = null;
let starting = false;
const pending: Array<() => void> = [];

/**
 * Public project key, inlined at build time. Missing for local dev, tests,
 * and any build that did not set `VITE_POSTHOG_KEY`.
 */
function projectKey(): string | undefined {
  if (import.meta.env.DEV) return undefined;

  const key = import.meta.env.VITE_POSTHOG_KEY?.trim() ?? "";

  if (key === "") return undefined;

  return key;
}

export function initAnalytics(): void {
  const key = projectKey();

  if (!key || starting || client) return;
  starting = true;
  // Slim build has no session-replay, survey, product-tour, or exception code.
  void import("posthog-js/dist/module.slim.no-external")
    .then((posthogModule) => {
      if (!projectKey()) return;
      const posthog = posthogModule.default;
      posthog.init(key, analyticsInitOptions());
      client = {
        capture(event, properties) {
          posthog.capture(event, properties);
        },
      };

      for (const send of pending.splice(0)) send();
    })
    .catch(() => {
      starting = false;
      pending.splice(0);
    });
}

export function track(event: "raid loaded", properties: RaidLoadedProperties): void;
export function track(event: "pull clicked", properties: PullClickedProperties): void;
export function track(event: "VOD played"): void;
export function track(
  event: AnalyticsEvent,
  properties?: RaidLoadedProperties | PullClickedProperties,
): void {
  enqueue(() => {
    client?.capture(event, properties);
  });
}

export function capturePageview(): void {
  enqueue(() => {
    client?.capture("$pageview");
  });
}

function enqueue(send: () => void): void {
  if (!projectKey()) return;

  if (client) send();
  else if (starting) pending.push(send);
}
