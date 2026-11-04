import type { CaptureResult, Properties } from "posthog-js";
import { z } from "zod";

import { jsonBody, type Json } from "../json";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * Rewrites report codes, fight ids, and video ids inside analytics payloads.
 * `token` is left alone: it is the project key, not a raid identifier.
 */
export function scrubAnalyticsCapture(capture: CaptureResult): CaptureResult {
  return {
    ...capture,
    properties: scrubProperties(capture.properties),
    $set: scrubOptionalProperties(capture.$set),
    $set_once: scrubOptionalProperties(capture.$set_once),
  };
}

function scrubOptionalProperties(fields: Properties | undefined): Properties | undefined {
  if (!fields) return fields;

  return scrubProperties(fields);
}

function scrubProperties(fields: Properties): Properties {
  let serialised: string;

  try {
    serialised = JSON.stringify(fields);
  } catch {
    return fields;
  }

  const parsed = jsonBody.safeParse(JSON.parse(serialised));

  if (!parsed.success) return fields;

  const record = z.record(z.string(), jsonBody).safeParse(scrubJson(parsed.data));

  if (!record.success) return fields;

  return record.data;
}

function scrubJson(value: Json): Json {
  const text = z.string().safeParse(value);

  if (text.success) return scrubText(text.data);

  const list = z.array(jsonBody).safeParse(value);

  if (list.success) {
    const next: Json[] = [];

    for (const item of list.data) next.push(scrubJson(item));

    return next;
  }

  const fields = z.record(z.string(), jsonBody).safeParse(value);

  if (!fields.success) return value;

  const entries: Array<[string, Json]> = [];

  for (const key of Object.keys(fields.data)) {
    const child = fields.data[key];

    if (child === undefined) continue;
    entries.push([key, scrubJson(child)]);
  }

  return jsonBody.parse(Object.fromEntries(entries));
}

function scrubText(value: string): string {
  const withoutPaths = value
    .replaceAll(/\/raid\/[A-Za-z0-9]+/g, "/raid/:report")
    .replaceAll(/\/reports\/[A-Za-z0-9]+/g, "/reports/:report")
    .replaceAll(/youtu\.be\/[A-Za-z0-9_-]{11}/g, "youtu.be/:video")
    .replaceAll(/\/live\/[A-Za-z0-9_-]{11}/g, "/live/:video")
    .replaceAll(/\/embed\/[A-Za-z0-9_-]{11}/g, "/embed/:video");

  const withoutNamedParams = replaceNamedParam(
    replaceNamedParam(replaceNamedParam(withoutPaths, "vod", ":video"), "pull", ":pull"),
    "fight",
    ":pull",
  );

  return withoutNamedParams.replace(/([?&#]v=)([^&#\s]*)/g, (match, prefix: string, raw: string) =>
    VIDEO_ID.test(raw) ? `${prefix}:video` : match,
  );
}

function replaceNamedParam(value: string, name: string, placeholder: string): string {
  const pattern = new RegExp(`([?&#]${name}=)([^&#\\s]*)`, "g");

  return value.replace(pattern, (match, prefix: string, raw: string) => {
    if (raw === placeholder) return match;

    return `${prefix}${placeholder}`;
  });
}
