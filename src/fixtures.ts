import wclReport from "../fixtures/wcl-report.json";
import youtubeLive from "../fixtures/youtube-live.json";
import youtubeNotLive from "../fixtures/youtube-not-live.json";

/**
 * Recorded stand-ins for the 29 Oct 2026 Average Pillagers night.
 * Response shapes follow the WCL v2 GraphQL report query and YouTube videos.list.
 * Boss names are that guild's current raid. Fight times are not the real report:
 * the public report page and YouTube watch page both blocked unauthenticated fetches.
 * The stream start is placed 30 minutes before the report so the first boss pull
 * lands at 38:00, and the last pull is past a 3h20m VOD.
 */
export const FIXTURE_REPORT_CODE = "TPYJD2c4VkLZfBp9";
export const FIXTURE_VIDEO_ID = "BLJBhzLNt8w";

export function fixtureReportBody(code: string): unknown {
  if (code !== FIXTURE_REPORT_CODE) {
    return { data: { reportData: { report: null } } };
  }
  return wclReport;
}

export function fixtureYoutubeBody(videoId: string): unknown {
  if (videoId === FIXTURE_VIDEO_ID) return youtubeLive;
  const body = structuredClone(youtubeNotLive);
  const item = body.items[0];
  if (item) item.id = videoId;
  return body;
}
