import type { PostHog, PostHogConfig } from "posthog-js/dist/module.slim.no-external";

/** Named product events. `$pageview` is sent by PostHog on init, not via `track`. */
export type AnalyticsEvent = "raid loaded" | "pull clicked" | "VOD played";

export interface RaidLoadedProperties {
  pull_count: number;
}

export interface PullClickedProperties {
  encounter_id: number;
  kill: boolean;
}

type Client = Pick<PostHog, "capture" | "captureException">;

type ErrorTrackingExtensions = Pick<
  typeof import("posthog-js/dist/extension-bundles").ErrorTrackingExtensions,
  "exceptionObserver" | "exceptions"
>;

/**
 * Init options shared by the app and the cookieless / exception checks.
 * `capture_exceptions` stays off so unhandled errors are not autocaptured.
 * The error-tracking extensions are what make `captureException` emit `$exception`.
 */
export function analyticsInitOptions(
  errorTracking: ErrorTrackingExtensions,
): Partial<PostHogConfig> {
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
    capture_pageview: true,
    capture_pageleave: false,
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
    __extensionClasses: {
      exceptionObserver: errorTracking.exceptionObserver,
      exceptions: errorTracking.exceptions,
    },
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
  // Slim build has no session-replay, survey, or product-tour code.
  // Error tracking is registered from the extension bundle, which the slim entry omits.
  void Promise.all([
    import("posthog-js/dist/module.slim.no-external"),
    import("posthog-js/dist/extension-bundles"),
  ])
    .then(([posthogModule, extensionModule]) => {
      if (!projectKey()) return;
      const posthog = posthogModule.default;
      posthog.init(key, analyticsInitOptions(extensionModule.ErrorTrackingExtensions));
      client = posthog;

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
  if (!projectKey()) return;

  const send = () => {
    client?.capture(event, properties);
  };

  if (client) send();
  else if (starting) pending.push(send);
}
