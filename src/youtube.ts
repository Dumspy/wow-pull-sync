import { z } from "zod";

import { SETTLED_TTL_SECONDS, type UpstreamCache } from "./cache";
import { parseIso8601Duration } from "./duration";
import { fixtureYoutubeBody } from "./fixtures";
import { HttpError } from "./http-error";
import { jsonBody, type Json } from "./json";

const PARTS = "snippet,contentDetails,liveStreamingDetails";

export async function fetchYoutubeBody(
  videoId: string,
  vodUrl: string,
  apiKey: string,
  useFixtures: boolean,
  cache: UpstreamCache,
): Promise<Json> {
  if (useFixtures) return fixtureYoutubeBody(videoId, vodUrl);

  return cache.json(
    "youtube-video",
    { part: PARTS, videoId },
    () => fetchVideo(videoId, apiKey),
    youtubeCacheTtl,
  );
}

const endedStreamSchema = z.object({
  items: z
    .array(
      z.object({
        liveStreamingDetails: z.object({ actualStartTime: z.string(), actualEndTime: z.string() }),
        contentDetails: z.object({ duration: z.string() }),
      }),
    )
    .min(1),
});

/**
 * Only an ended stream with its final length is kept. That is read from the raw body rather
 * than the parser, which also accepts a running stream. Right after a stream ends YouTube can
 * still report a zero length, so that is not kept either.
 */
export function youtubeCacheTtl(body: Json): number | null {
  const parsed = endedStreamSchema.safeParse(body);
  const item = parsed.success ? parsed.data.items[0] : undefined;

  if (!item) return null;

  const seconds = parseIso8601Duration(item.contentDetails.duration);

  return seconds != null && seconds > 0 ? SETTLED_TTL_SECONDS : null;
}

async function fetchVideo(videoId: string, apiKey: string): Promise<Json> {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", PARTS);
  url.searchParams.set("id", videoId);
  url.searchParams.set("key", apiKey);
  const response = await fetch(url);

  if (!response.ok) {
    throw new HttpError(502, "YouTube could not be reached.");
  }

  return jsonBody.parse(await response.json());
}
