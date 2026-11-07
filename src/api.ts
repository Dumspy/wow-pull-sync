import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";

import { captureException } from "@sentry/cloudflare";

import {
  type ErrorResponse,
  reportRequestSchema,
  reportResponseSchema,
  vodRequestSchema,
  vodResponseSchema,
} from "./contract";
import { HttpError } from "./http-error";
import {
  isStreamLive,
  readReport,
  readTwitchVideo,
  readYoutubeVideo,
  VOD_ERRORS,
  type VodSummary,
} from "./parse-api";
import { buildPulls } from "./pulls";
import {
  buildEncounterPhases,
  buildAbilities,
  buildPlayers,
  withoutHiddenSpells,
} from "./report-meta";
import { loadReportEvents } from "./report-events";
import { parseReportCode, parseVodLink } from "./urls";
import { fetchTwitchStreamsBody, fetchTwitchVideoBody } from "./twitch";
import { fetchReportBody } from "./wcl";
import { fetchYoutubeBody } from "./youtube";

export interface Env {
  ASSETS: { fetch(input: Request | URL | string): Promise<Response> };
  WCL_CLIENT_ID?: string;
  WCL_CLIENT_SECRET?: string;
  YOUTUBE_API_KEY?: string;
  TWITCH_CLIENT_ID?: string;
  TWITCH_CLIENT_SECRET?: string;
  USE_FIXTURES?: string;
  SENTRY_DSN?: string;
}

function bodyMessage(
  error: { issues: { path: PropertyKey[] }[] },
  field: string,
  missing: string,
): string {
  const root = error.issues.find((issue) => issue.path.length === 0);

  if (root) return "Send a JSON body.";

  if (error.issues.some((issue) => String(issue.path[0]) === field)) return missing;

  return "Send a JSON body.";
}

/** An upstream error keeps its message. Anything else was already reported and gets `fallback`. */
function failure(error: HttpError | null, fallback: string) {
  if (!error) return { body: { error: fallback }, status: 500 as const };

  const body: ErrorResponse = error.reason
    ? { error: error.message, reason: error.reason }
    : { error: error.message };

  if (error.status === 400) return { body, status: 400 as const };

  if (error.status === 404) return { body, status: 404 as const };

  return { body, status: 502 as const };
}

/** The past broadcast, rejected while its stream is still running. */
async function loadTwitchVideo(
  videoId: string,
  env: Env,
  useFixtures: boolean,
): Promise<VodSummary> {
  const clientId = env.TWITCH_CLIENT_ID ?? "";
  const clientSecret = env.TWITCH_CLIENT_SECRET ?? "";

  const video = readTwitchVideo(
    await fetchTwitchVideoBody(videoId, clientId, clientSecret, useFixtures),
  );

  const streams = await fetchTwitchStreamsBody(video.userId, clientId, clientSecret, useFixtures);

  if (isStreamLive(streams, video.streamId)) throw new HttpError(400, VOD_ERRORS.live, "live");

  return video;
}

const reportFailure = "Something went wrong loading that raid.";
const vodFailure = "Something went wrong loading that VOD.";

export const api = new Hono<{ Bindings: Env }>()
  .post(
    "/report",
    zValidator("json", reportRequestSchema, (result, c) => {
      if (result.success) return;

      return c.json(
        {
          error: bodyMessage(result.error, "reportUrl", "Enter a Warcraft Logs report URL."),
        },
        400,
      );
    }),
    async (c) => {
      const request = c.req.valid("json");
      const code = parseReportCode(request.reportUrl);

      if (!code) {
        return c.json({ error: "That doesn't look like a Warcraft Logs report URL." }, 400);
      }

      const useFixtures = c.env.USE_FIXTURES === "true";

      if (!useFixtures && (!c.env.WCL_CLIENT_ID || !c.env.WCL_CLIENT_SECRET)) {
        return c.json({ error: "WCL API credentials are not configured." }, 500);
      }

      try {
        const clientId = c.env.WCL_CLIENT_ID ?? "";
        const clientSecret = c.env.WCL_CLIENT_SECRET ?? "";

        const report = readReport(await fetchReportBody(code, clientId, clientSecret, useFixtures));

        const events = await loadReportEvents(code, clientId, clientSecret, useFixtures, report);

        const pulls = buildPulls(report, {
          ...events,
          casts: withoutHiddenSpells(report, events.casts),
        });

        const response = reportResponseSchema.parse({
          reportCode: report.code || code,
          reportTitle: report.title,
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
        if (!(error instanceof HttpError)) captureException(error);
        const result = failure(error instanceof HttpError ? error : null, reportFailure);

        return c.json(result.body, result.status);
      }
    },
  )
  .post(
    "/vod",
    zValidator("json", vodRequestSchema, (result, c) => {
      if (result.success) return;

      return c.json(
        { error: bodyMessage(result.error, "vodUrl", "Enter a YouTube or Twitch VOD URL.") },
        400,
      );
    }),
    async (c) => {
      const request = c.req.valid("json");
      const link = parseVodLink(request.vodUrl);

      if (!link) {
        return c.json({ error: VOD_ERRORS.unsupported, reason: "unsupported" as const }, 400);
      }

      const useFixtures = c.env.USE_FIXTURES === "true";

      if (link.platform === "twitch") {
        if (!useFixtures && (!c.env.TWITCH_CLIENT_ID || !c.env.TWITCH_CLIENT_SECRET)) {
          return c.json({ error: "Twitch API credentials are not configured." }, 500);
        }
      } else if (!useFixtures && !c.env.YOUTUBE_API_KEY) {
        return c.json({ error: "YouTube API credentials are not configured." }, 500);
      }

      try {
        const vod =
          link.platform === "twitch"
            ? await loadTwitchVideo(link.id, c.env, useFixtures)
            : readYoutubeVideo(
                await fetchYoutubeBody(
                  link.id,
                  request.vodUrl,
                  c.env.YOUTUBE_API_KEY ?? "",
                  useFixtures,
                ),
              );

        const response = vodResponseSchema.parse({
          platform: link.platform,
          id: vod.videoId || link.id,
          title: vod.title,
          startedAtMs: vod.actualStartMs,
          durationSeconds: vod.durationSeconds,
        });

        return c.json(response, 200);
      } catch (error) {
        if (!(error instanceof HttpError)) captureException(error);
        const result = failure(error instanceof HttpError ? error : null, vodFailure);

        return c.json(result.body, result.status);
      }
    },
  );

api.onError((error, c) => {
  if (error instanceof HTTPException && error.message === "Malformed JSON in request body") {
    return c.json({ error: "Send a JSON body." }, 400);
  }

  if (!(error instanceof HTTPException) || error.status >= 500) captureException(error);

  return c.json({ error: "Something went wrong loading that raid." }, 500);
});

export type AppType = typeof api;
