import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { pullRequestSchema, pullSyncResponseSchema } from "./contract";
import { HttpError } from "./http-error";
import { readReport, readYoutubeVideo } from "./parse-api";
import { buildPulls } from "./pulls";
import { parseReportCode, parseVideoId } from "./urls";
import { fetchReportBody } from "./wcl";
import { fetchYoutubeBody } from "./youtube";

export interface Env {
  ASSETS: { fetch(input: Request | URL | string): Promise<Response> };
  WCL_CLIENT_ID?: string;
  WCL_CLIENT_SECRET?: string;
  YOUTUBE_API_KEY?: string;
  USE_FIXTURES?: string;
}

function pullRequestMessage(error: { issues: { path: PropertyKey[] }[] }): string {
  const root = error.issues.find((issue) => issue.path.length === 0);

  if (root) return "Send a JSON body.";

  const fields = error.issues.map((issue) => String(issue.path[0]));

  if (fields.includes("reportUrl") || fields.includes("vodUrl")) {
    return "Enter a Warcraft Logs report URL and a YouTube VOD URL.";
  }

  if (fields.includes("offsetSeconds")) return "Offset must be a number of seconds.";

  return "Send a JSON body.";
}

export const api = new Hono<{ Bindings: Env }>()
  .post(
    "/pulls",
    zValidator("json", pullRequestSchema, (result, c) => {
      if (result.success) return;

      return c.json({ error: pullRequestMessage(result.error) }, 400);
    }),
    async (c) => {
      const request = c.req.valid("json");
      const code = parseReportCode(request.reportUrl);

      if (!code) {
        return c.json({ error: "That doesn't look like a Warcraft Logs report URL." }, 400);
      }

      const videoId = parseVideoId(request.vodUrl);

      if (!videoId) return c.json({ error: "That doesn't look like a YouTube URL." }, 400);

      const useFixtures = c.env.USE_FIXTURES === "true";

      if (
        !useFixtures &&
        (!c.env.WCL_CLIENT_ID || !c.env.WCL_CLIENT_SECRET || !c.env.YOUTUBE_API_KEY)
      ) {
        return c.json({ error: "WCL and YouTube API credentials are not configured." }, 500);
      }

      try {
        const [reportBody, youtubeBody] = await Promise.all([
          fetchReportBody(
            code,
            c.env.WCL_CLIENT_ID ?? "",
            c.env.WCL_CLIENT_SECRET ?? "",
            useFixtures,
          ),
          fetchYoutubeBody(videoId, request.vodUrl, c.env.YOUTUBE_API_KEY ?? "", useFixtures),
        ]);

        const report = readReport(reportBody);
        const vod = readYoutubeVideo(youtubeBody);

        const response = pullSyncResponseSchema.parse({
          videoId: vod.videoId || videoId,
          videoTitle: vod.title,
          reportCode: report.code || code,
          reportTitle: report.title,
          vodStartedAtMs: vod.actualStartMs,
          vodDurationSeconds: vod.durationSeconds,
          pulls: buildPulls(report, vod, request.offsetSeconds),
        });

        return c.json(response, 200);
      } catch (error) {
        if (error instanceof HttpError) {
          if (error.status === 400) return c.json({ error: error.message }, 400);

          if (error.status === 404) return c.json({ error: error.message }, 404);

          return c.json({ error: error.message }, 502);
        }

        return c.json({ error: "Something went wrong loading that raid." }, 500);
      }
    },
  )
  .on(["GET", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"], "/pulls", (c) =>
    c.json({ error: "Use POST." }, 405),
  );

api.onError((error, c) => {
  if (error instanceof HTTPException && error.message === "Malformed JSON in request body") {
    return c.json({ error: "Send a JSON body." }, 400);
  }

  return c.json({ error: "Something went wrong loading that raid." }, 500);
});

export type AppType = typeof api;
