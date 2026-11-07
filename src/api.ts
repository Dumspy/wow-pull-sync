import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { pullRequestSchema, pullSyncResponseSchema } from "./contract";
import { HttpError } from "./http-error";
import { readReport, readYoutubeVideo } from "./parse-api";
import { buildPulls } from "./pulls";
import {
  buildEncounterPhases,
  buildAbilities,
  buildPlayers,
  withoutHiddenSpells,
} from "./report-meta";
import { loadReportEvents } from "./report-events";
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

export const api = new Hono<{ Bindings: Env }>().post(
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
      const clientId = c.env.WCL_CLIENT_ID ?? "";
      const clientSecret = c.env.WCL_CLIENT_SECRET ?? "";

      const [report, vod] = await Promise.all([
        fetchReportBody(code, clientId, clientSecret, useFixtures).then(readReport),
        fetchYoutubeBody(videoId, request.vodUrl, c.env.YOUTUBE_API_KEY ?? "", useFixtures).then(
          readYoutubeVideo,
        ),
      ]);

      const events = await loadReportEvents(code, clientId, clientSecret, useFixtures, report);

      const pulls = buildPulls(report, vod, request.offsetSeconds, {
        ...events,
        casts: withoutHiddenSpells(report, events.casts),
      });

      const response = pullSyncResponseSchema.parse({
        videoId: vod.videoId || videoId,
        videoTitle: vod.title,
        reportCode: report.code || code,
        reportTitle: report.title,
        vodStartedAtMs: vod.actualStartMs,
        vodDurationSeconds: vod.durationSeconds,
        zone: report.zone ?? null,
        guild: report.guild
          ? {
              id: report.guild.id,
              name: report.guild.name,
              server: report.guild.server?.name ?? null,
              region: report.guild.server?.region?.slug ?? null,
            }
          : null,
        owner: report.owner?.name ?? null,
        players: buildPlayers(report),
        encounterPhases: buildEncounterPhases(report),
        abilities: buildAbilities(
          report,
          pulls.flatMap((pull) => pull.casts.map((cast) => cast.spellId)),
        ),
        pulls,
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
);

api.onError((error, c) => {
  if (error instanceof HTTPException && error.message === "Malformed JSON in request body") {
    return c.json({ error: "Send a JSON body." }, 400);
  }

  return c.json({ error: "Something went wrong loading that raid." }, 500);
});

export type AppType = typeof api;
