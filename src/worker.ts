import { HttpError } from "./http-error";
import { readReport, readYoutubeVideo } from "./parse-api";
import { buildPulls } from "./pulls";
import type { PullSyncResponse } from "./types";
import { parseReportCode, parseVideoId } from "./urls";
import { fetchReportBody } from "./wcl";
import { fetchYoutubeBody } from "./youtube";

interface Env {
  ASSETS: { fetch(input: Request | URL | string): Promise<Response> };
  WCL_CLIENT_ID?: string;
  WCL_CLIENT_SECRET?: string;
  YOUTUBE_API_KEY?: string;
  USE_FIXTURES?: string;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function handlePulls(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return json({ error: "Use POST." }, 405);
  }
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Send a JSON body." }, 400);
  }
  if (!payload || typeof payload !== "object") {
    return json({ error: "Send a JSON body." }, 400);
  }
  const body = payload as { reportUrl?: unknown; vodUrl?: unknown; offsetSeconds?: unknown };
  if (typeof body.reportUrl !== "string" || typeof body.vodUrl !== "string") {
    return json({ error: "Enter a Warcraft Logs report URL and a YouTube VOD URL." }, 400);
  }
  const offsetSeconds = body.offsetSeconds == null ? 0 : body.offsetSeconds;
  if (typeof offsetSeconds !== "number" || !Number.isFinite(offsetSeconds)) {
    return json({ error: "Offset must be a number of seconds." }, 400);
  }
  const code = parseReportCode(body.reportUrl);
  if (!code) {
    return json({ error: "That doesn't look like a Warcraft Logs report URL." }, 400);
  }
  const videoId = parseVideoId(body.vodUrl);
  if (!videoId) {
    return json({ error: "That doesn't look like a YouTube URL." }, 400);
  }

  const useFixtures = env.USE_FIXTURES === "true";
  if (!useFixtures && (!env.WCL_CLIENT_ID || !env.WCL_CLIENT_SECRET || !env.YOUTUBE_API_KEY)) {
    return json({ error: "WCL and YouTube API credentials are not configured." }, 500);
  }

  try {
    const [reportBody, youtubeBody] = await Promise.all([
      fetchReportBody(code, env.WCL_CLIENT_ID ?? "", env.WCL_CLIENT_SECRET ?? "", useFixtures),
      fetchYoutubeBody(videoId, body.vodUrl, env.YOUTUBE_API_KEY ?? "", useFixtures),
    ]);
    const report = readReport(reportBody);
    const vod = readYoutubeVideo(youtubeBody);
    const response: PullSyncResponse = {
      videoId: vod.videoId || videoId,
      videoTitle: vod.title,
      reportCode: report.code || code,
      reportTitle: report.title,
      vodDurationSeconds: vod.durationSeconds,
      pulls: buildPulls(report, vod, offsetSeconds),
    };
    return json(response);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    return json({ error: "Something went wrong loading that raid." }, 500);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/pulls") return handlePulls(request, env);
    return env.ASSETS.fetch(request);
  },
};
