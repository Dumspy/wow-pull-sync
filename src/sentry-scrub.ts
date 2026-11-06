import type { Breadcrumb, ErrorEvent, EventHint } from "@sentry/core";
import { z } from "zod";

import { jsonBody, type Json } from "./json";
import { isReportCode, isVideoId, scrubTrackedUrlText } from "./scrub-text";

const SECRET_KEYS = new Set([
  "access_token",
  "api_key",
  "apikey",
  "authorization",
  "client_secret",
  "clientsecret",
  "cookie",
  "cookies",
  "headers",
  "id_token",
  "password",
  "proxy-authorization",
  "refresh_token",
  "secret",
  "set-cookie",
]);

/**
 * Rewrites raid URLs, video ids, pull ids, the `t` param, and tokens.
 * Request bodies, headers, cookies, and query-string fields are removed.
 */
export function scrubSentryText(value: string): string {
  const tracked = scrubTrackedUrlText(value);

  const withoutReportValues = tracked.replace(
    /([?&#][A-Za-z_][A-Za-z0-9_]*=)([A-Za-z0-9]{16})(?=[&#\s]|$)/g,
    (match, prefix: string, raw: string) => (isReportCode(raw) ? `${prefix}:report` : match),
  );

  const withoutVideoIds = withoutReportValues.replace(
    /([?&#]id=)([^&#\s]*)/g,
    (match, prefix: string, raw: string) => (isVideoId(raw) ? `${prefix}:video` : match),
  );

  const withoutParams = withoutVideoIds.replace(
    /([?&#])(access_token|client_secret|refresh_token|api_key|apikey|token|key|t)=[^&#\s]*/gi,
    "$1",
  );

  const tidied = tidyQuery(withoutParams);

  return tidied
    .replace(
      /(^|[^\w])(access_token|client_secret|refresh_token|api_key|apikey|token|key)=([^&\s"']+)/gi,
      "$1$2=[Filtered]",
    )
    .replace(/(authorization\s*[:=]\s*)(?:bearer|basic)\s+\S+/gi, "$1[Filtered]")
    .replace(
      /("(?:access_token|api_key|apiKey|client_secret|clientSecret|refresh_token)"\s*:\s*")[^"]*/g,
      "$1[Filtered]",
    );
}

export function scrubSentryJson(value: Json): Json {
  return scrubNode(value, null);
}

export function scrubSentryEvent(event: ErrorEvent): ErrorEvent {
  const scrubbed = scrubJsonValue(event);

  if (!scrubbed) return event;

  const restored: unknown = scrubbed;

  // SAFETY: `restored` is the same Sentry event after JSON string scrubbing and secret-key removal.
  return restored as ErrorEvent;
}

export function scrubSentryBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  const scrubbed = scrubJsonValue(breadcrumb);

  if (!scrubbed) return breadcrumb;

  // SAFETY: `scrubbed` is the same breadcrumb after JSON string scrubbing and secret-key removal.
  return scrubbed as Breadcrumb;
}

const seenErrors = new WeakSet<Error>();

/** One report per error object. The React boundary and the root hooks both see a caught error. */
export function sentryBeforeSend(event: ErrorEvent, hint: EventHint): ErrorEvent | null {
  const original = hint.originalException;

  if (original instanceof Error && seenErrors.has(original)) return null;

  const scrubbed = scrubSentryEvent(event);

  if (original instanceof Error) seenErrors.add(original);

  return scrubbed;
}

function scrubJsonValue(value: ErrorEvent | Breadcrumb): Json | null {
  let serialised: string;

  try {
    serialised = JSON.stringify(value);
  } catch {
    return null;
  }

  const parsed = jsonBody.safeParse(JSON.parse(serialised));

  if (!parsed.success) return null;

  return scrubSentryJson(parsed.data);
}

function scrubNode(value: Json, parent: string | null): Json {
  const text = z.string().safeParse(value);

  if (text.success) return scrubSentryText(text.data);

  const list = z.array(jsonBody).safeParse(value);

  if (list.success) {
    const next: Json[] = [];

    for (const item of list.data) next.push(scrubNode(item, parent));

    return next;
  }

  const fields = z.record(z.string(), jsonBody).safeParse(value);

  if (!fields.success) return value;

  const entries: Array<[string, Json]> = [];

  for (const key of Object.keys(fields.data)) {
    if (dropKey(key, parent)) continue;

    const child = fields.data[key];

    if (child === undefined) continue;
    entries.push([key, scrubNode(child, key)]);
  }

  return jsonBody.parse(Object.fromEntries(entries));
}

function dropKey(key: string, parent: string | null): boolean {
  const normalized = key.toLowerCase();

  if (SECRET_KEYS.has(normalized)) return true;

  if (normalized === "query_string" || normalized === "url.query") return true;

  if (normalized === "body" || normalized === "request_body" || normalized === "requestbody") {
    return true;
  }

  if (parent === "request" && (normalized === "data" || normalized === "env")) return true;

  if ((parent === null || parent === "contexts") && normalized === "user") return true;

  return false;
}

function tidyQuery(value: string): string {
  return value
    .replace(/\?&+/g, "?")
    .replace(/&&+/g, "&")
    .replace(/[?&](#|$)/g, "$1");
}
