import wclReport from "../fixtures/wcl-TPYJD2c4VkLZfBp9.json";
import youtubeLive from "../fixtures/yt-BLJBhzLNt8w.json";
import youtubeLateStart from "../fixtures/yt-BLJBhzLNt8w-late-start.json";
import youtubeNotLive from "../fixtures/yt-nonlive.json";

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

export function fixtureReportBody(code: string): unknown {
  if (code !== FIXTURE_REPORT_CODE) {
    return { data: { reportData: { report: null } } };
  }
  return wclReport;
}

export function fixtureYoutubeBody(videoId: string, vodUrl?: string): unknown {
  if (videoId === FIXTURE_VIDEO_ID) {
    if (requestsOutsideFixture(vodUrl)) return youtubeLateStart;
    return youtubeLive;
  }
  if (videoId === FIXTURE_NON_LIVE_VIDEO_ID) return youtubeNotLive;
  const body = structuredClone(youtubeNotLive) as { items?: { id?: string }[] };
  const item = body.items?.[0];
  if (item) item.id = videoId;
  return body;
}

function requestsOutsideFixture(vodUrl: string | undefined): boolean {
  if (!vodUrl) return false;
  try {
    return new URL(vodUrl).searchParams.get("fixture") === OUTSIDE_FIXTURE;
  } catch {
    return false;
  }
}
