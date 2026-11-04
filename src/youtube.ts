import { fixtureYoutubeBody } from "./fixtures";
import { HttpError } from "./http-error";
import { jsonBody, type Json } from "./json";

export async function fetchYoutubeBody(
  videoId: string,
  vodUrl: string,
  apiKey: string,
  useFixtures: boolean,
): Promise<Json> {
  if (useFixtures) return fixtureYoutubeBody(videoId, vodUrl);
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,contentDetails,liveStreamingDetails");
  url.searchParams.set("id", videoId);
  url.searchParams.set("key", apiKey);
  const response = await fetch(url);

  if (!response.ok) {
    throw new HttpError(502, "YouTube could not be reached.");
  }

  return jsonBody.parse(await response.json());
}
