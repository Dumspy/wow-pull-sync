import { SETTLED_TTL_SECONDS, type UpstreamCache } from "./cache";
import { fixtureYoutubeBody } from "./fixtures";
import { HttpError } from "./http-error";
import { jsonBody, type Json } from "./json";
import { readYoutubeVideo } from "./parse-api";

const PARTS = "snippet,contentDetails,liveStreamingDetails";

export async function fetchYoutubeBody(
  videoId: string,
  vodUrl: string,
  apiKey: string,
  useFixtures: boolean,
  cache: UpstreamCache,
): Promise<Json> {
  if (useFixtures) return fixtureYoutubeBody(videoId, vodUrl);

  // Only a past live stream reads cleanly, and its start time and length are final.
  return cache.json(
    "youtube-video",
    { part: PARTS, videoId },
    () => fetchVideo(videoId, apiKey),
    (body) => {
      try {
        readYoutubeVideo(body);

        return SETTLED_TTL_SECONDS;
      } catch {
        return null;
      }
    },
  );
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
