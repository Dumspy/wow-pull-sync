import { z } from "zod";

import wclReport from "../fixtures/wcl-TPYJD2c4VkLZfBp9.json";
import wclEvents from "../fixtures/wcl-TPYJD2c4VkLZfBp9-events.json";
import youtubeLive from "../fixtures/yt-BLJBhzLNt8w.json";
import youtubeLateStart from "../fixtures/yt-BLJBhzLNt8w-late-start.json";
import youtubeNotLive from "../fixtures/yt-nonlive.json";
import { jsonBody, type Json } from "./json";

/** Recorded responses for the 29 Oct 2026 Average Pillagers report and VOD. */
export const FIXTURE_REPORT_CODE = "TPYJD2c4VkLZfBp9";
export const FIXTURE_VIDEO_ID = "BLJBhzLNt8w";
export const FIXTURE_NON_LIVE_VIDEO_ID = "dQw4w9WgXcQ";

/**
 * Dev-only. Append `?fixture=outside` to the VOD URL to serve a copy of the
 * real videos.list body whose actualStartTime is 30 minutes later, so early
 * pulls fall before the VOD. The real pair has every boss pull inside it.
 */
export const OUTSIDE_FIXTURE = "outside";

export function fixtureReportBody(code: string): Json {
  if (code !== FIXTURE_REPORT_CODE) {
    return { data: { reportData: { report: null } } };
  }

  return recordedJson(wclReport);
}

/**
 * Recorded events for the fixture report: `deaths`, and `casts` (the three Ula'tek
 * spells that were recorded). Anything else is empty.
 */
export function fixtureEventsBody(code: string, key: string): Json {
  if (code !== FIXTURE_REPORT_CODE) return [];

  if (key === "deaths") return recordedJson(wclEvents.deaths);

  if (key === "casts") return recordedJson(wclEvents.lanes.flatMap((entry) => entry.events));

  const lane = wclEvents.lanes.find((entry) => entry.id === key);

  return recordedJson(lane?.events ?? []);
}

export function fixtureYoutubeBody(videoId: string, vodUrl?: string): Json {
  if (videoId === FIXTURE_VIDEO_ID) {
    if (requestsOutsideFixture(vodUrl)) return recordedJson(youtubeLateStart);

    return recordedJson(youtubeLive);
  }

  if (videoId === FIXTURE_NON_LIVE_VIDEO_ID) return recordedJson(youtubeNotLive);

  const body = recordedJson(structuredClone(youtubeNotLive));

  const parsed = z
    .looseObject({
      items: z.array(z.looseObject({ id: z.string() })).optional(),
    })
    .safeParse(body);

  const item = parsed.success ? parsed.data.items?.[0] : undefined;

  if (item) item.id = videoId;

  return parsed.success ? jsonBody.parse(parsed.data) : body;
}

function recordedJson<T>(document: T): Json {
  // SAFETY: fixture files are recorded JSON documents, not typed domain objects.
  return document as Json;
}

function requestsOutsideFixture(vodUrl: string | undefined): boolean {
  if (!vodUrl) return false;

  try {
    return new URL(vodUrl).searchParams.get("fixture") === OUTSIDE_FIXTURE;
  } catch {
    return false;
  }
}
