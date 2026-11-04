import type { PostHog } from "posthog-js";

/** Named product events. `$pageview` is sent by PostHog on init, not via `track`. */
export type AnalyticsEvent = "raid loaded" | "pull clicked" | "VOD played";

export interface AnalyticsProperties {
  "raid loaded": { pull_count: number };
  "pull clicked": { encounter_id: number; kill: boolean };
  "VOD played": Record<string, never>;
}

type Client = Pick<PostHog, "capture">;

let client: Client | null = null;
let starting = false;
const pending: Array<() => void> = [];

/**
 * Public project key, inlined at build time. Missing for local dev, tests,
 * and any build that did not set `VITE_POSTHOG_KEY`.
 */
function projectKey(): string | undefined {
  if (import.meta.env.DEV) return undefined;
  const key = import.meta.env.VITE_POSTHOG_KEY;
  if (typeof key !== "string") return undefined;
  const trimmed = key.trim();
  return trimmed === "" ? undefined : trimmed;
}

export function initAnalytics(): void {
  const key = projectKey();
  if (!key || starting || client) return;
  starting = true;
  // Slim build has no session-replay, survey, or product-tour code.
  void import("posthog-js/dist/module.slim.no-external")
    .then(({ default: posthog }) => {
      if (!projectKey()) return;
      posthog.init(key, {
        api_host: "https://eu.i.posthog.com",
        // Page memory only. With this mode, posthog-js keeps the session id on
        // the same store instead of sessionStorage, and it does not write cookies
        // or localStorage. https://posthog.com/docs/libraries/js/persistence
        persistence: "memory",
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
      });
      client = posthog;
      for (const send of pending.splice(0)) send();
    })
    .catch(() => {
      starting = false;
      pending.splice(0);
    });
}

export function track<E extends AnalyticsEvent>(event: E, properties: AnalyticsProperties[E]): void {
  if (!projectKey()) return;
  const send = () => {
    client?.capture(event, properties);
  };
  if (client) send();
  else if (starting) pending.push(send);
}
