import { z } from "zod";

import { parseIso8601Duration, parseTwitchDuration } from "./duration";
import { HttpError } from "./http-error";
import { jsonBody, type Json } from "./json";
import { vodErrorMessage } from "./vod-errors";

const fightSchema = z.object({
  id: z.number(),
  name: z.string(),
  encounterID: z.number(),
  startTime: z.number(),
  endTime: z.number(),
  kill: z.boolean().nullable().catch(null),
  bossPercentage: z.number().nullable().catch(null),
  fightPercentage: z.number().nullable().catch(null),
  difficulty: z.number().nullable().catch(null),
  lastPhase: z.number().nullable().catch(null),
  friendlyPlayers: z.array(z.number()).catch([]),
  phaseTransitions: z.array(z.object({ id: z.number(), startTime: z.number() })).catch([]),
});

const actorSchema = z.object({
  id: z.number(),
  name: z.string(),
  subType: z.string().nullish().catch(null),
  server: z.string().nullish().catch(null),
  icon: z.string().nullish().catch(null),
});

const reportSchema = z.object({
  code: z.string().catch(""),
  title: z.string().catch("Warcraft Logs report"),
  startTime: z.number(),
  endTime: z.number().nullish().catch(null),
  zone: z.object({ id: z.number(), name: z.string() }).nullish().catch(null),
  guild: z
    .object({
      id: z.number(),
      name: z.string(),
      server: z
        .object({
          name: z.string(),
          region: z.object({ slug: z.string() }).nullish().catch(null),
        })
        .nullish()
        .catch(null),
    })
    .nullish()
    .catch(null),
  owner: z.object({ name: z.string() }).nullish().catch(null),
  phases: z
    .array(
      z.object({
        encounterID: z.number(),
        phases: z
          .array(
            z.object({
              id: z.number(),
              name: z.string(),
              isIntermission: z.boolean().catch(false),
            }),
          )
          .nullish()
          .catch(null),
      }),
    )
    .nullish()
    .catch(null),
  masterData: z
    .object({
      actors: z.array(actorSchema).nullish().catch(null),
      abilities: z
        .array(
          z.object({
            gameID: z.number(),
            name: z.string(),
            icon: z.string().nullish().catch(null),
          }),
        )
        .nullish()
        .catch(null),
    })
    .nullish()
    .catch(null),
  fights: z.array(fightSchema),
});

const invalidReport = "invalid";

const reportValue = z.union([reportSchema, z.null(), z.literal(invalidReport)]);

const wclResponseSchema = z.object({
  errors: z.array(z.object({ message: z.string().optional() }).catch({})).catch([]),
  data: z
    .object({
      reportData: z
        .object({
          report: reportValue.optional().catch(invalidReport),
        })
        .nullish()
        .catch(null),
    })
    .nullish()
    .catch(null),
});

const youtubeResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().catch(""),
      liveStreamingDetails: z
        .object({
          actualStartTime: z.string().nullish().catch(null),
          actualEndTime: z.string().nullish().catch(null),
        })
        .nullish()
        .catch(null),
      contentDetails: z
        .object({
          duration: z.string(),
        })
        .nullish()
        .catch(null),
      snippet: z
        .object({
          title: z.string(),
        })
        .nullish()
        .catch(null),
    }),
  ),
});

const twitchVideosSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      stream_id: z.string().nullish().catch(null),
      user_id: z.string(),
      title: z.string().catch("Twitch VOD"),
      created_at: z.string(),
      duration: z.string(),
      type: z.string(),
    }),
  ),
});

const twitchStreamsSchema = z.object({
  data: z.array(z.object({ id: z.string() }).catch({ id: "" })).catch([]),
});

/** One entry of an events response. Deaths carry the killer; casts carry only the ability. A cast has a `begincast` and a `cast` entry. */
const eventSchema = z.object({
  timestamp: z.number(),
  fight: z.number(),
  type: z.string().catch(""),
  targetID: z.number().catch(-1),
  sourceID: z.number().catch(-1),
  abilityGameID: z.number().catch(0),
  killingAbilityGameID: z.number().nullish().catch(null),
});

export type WclEvent = z.output<typeof eventSchema>;

export type Actor = z.output<typeof actorSchema>;

export type Fight = z.output<typeof fightSchema>;

export type ReportSummary = z.output<typeof reportSchema>;

export interface VodSummary {
  videoId: string;
  title: string;
  actualStartMs: number;
  /** Length so far while `live`. */
  durationSeconds: number;
  /** The stream is still running. */
  live: boolean;
}

export function readReport(body: Json): ReportSummary {
  const parsed = wclResponseSchema.safeParse(body);

  if (!parsed.success) {
    throw new HttpError(502, "Warcraft Logs returned an unexpected response.");
  }

  const error = parsed.data.errors[0];

  if (error) {
    throw new HttpError(400, error.message ?? "Warcraft Logs rejected the report.");
  }

  const report = parsed.data.data?.reportData?.report;

  if (report == null) {
    throw new HttpError(404, "No Warcraft Logs report found for that link.");
  }

  if (report === invalidReport) {
    throw new HttpError(502, "Warcraft Logs returned an unexpected response.");
  }

  return report;
}

/** Events that fail to parse are skipped, so one odd entry cannot sink a raid. */
export function readEvents(body: Json): WclEvent[] {
  const parsed = z.array(jsonBody).safeParse(body);

  if (!parsed.success) {
    throw new HttpError(502, "Warcraft Logs returned an unexpected response.");
  }

  const events: WclEvent[] = [];

  for (const entry of parsed.data) {
    const event = eventSchema.safeParse(entry);

    if (event.success) events.push(event.data);
  }

  return events;
}

/** Messages for each `VodErrorReason`, worded as on the Add VOD design. */
export const VOD_ERRORS = {
  unsupported: vodErrorMessage("unsupported"),
  "not-found": vodErrorMessage("not-found"),
  upcoming: vodErrorMessage("upcoming"),
  live: vodErrorMessage("live"),
  "not-stream": vodErrorMessage("not-stream"),
} as const;

/** `nowMs` gives a running stream its length so far. */
export function readYoutubeVideo(body: Json, nowMs = Date.now()): VodSummary {
  const parsed = youtubeResponseSchema.safeParse(body);

  if (!parsed.success) {
    throw new HttpError(502, "YouTube returned an unexpected response.");
  }

  const item = parsed.data.items[0];

  if (!item) throw new HttpError(404, VOD_ERRORS["not-found"], "not-found");

  const stream = item.liveStreamingDetails;

  if (!stream) throw new HttpError(400, VOD_ERRORS["not-stream"], "not-stream");

  // A scheduled stream has no start yet.
  if (!stream.actualStartTime) throw new HttpError(400, VOD_ERRORS.upcoming, "upcoming");

  const actualStartMs = Date.parse(stream.actualStartTime);

  if (!Number.isFinite(actualStartMs)) {
    throw new HttpError(502, "YouTube returned an unexpected start time.");
  }

  const title = item.snippet?.title ?? "YouTube VOD";

  // A running stream has no end yet, and its video length reads as zero.
  if (!stream.actualEndTime) {
    return {
      videoId: item.id,
      title,
      actualStartMs,
      durationSeconds: Math.max(0, (nowMs - actualStartMs) / 1000),
      live: true,
    };
  }

  const duration = item.contentDetails ? parseIso8601Duration(item.contentDetails.duration) : null;
  const actualEndMs = Date.parse(stream.actualEndTime);

  // Just after a stream ends, YouTube can still report a zero length; the stream times cover it.
  const length =
    duration || !Number.isFinite(actualEndMs)
      ? duration
      : Math.max(0, (actualEndMs - actualStartMs) / 1000);

  if (length == null) {
    throw new HttpError(502, "YouTube did not return a video length.");
  }

  return { videoId: item.id, title, actualStartMs, durationSeconds: length, live: false };
}

/** A past broadcast. Whether its stream is still running takes a second request. */
export interface TwitchVideo extends Omit<VodSummary, "live"> {
  /** The channel, for checking whether the stream is still live. */
  userId: string;
  /** The broadcast this archive came from. */
  streamId: string;
}

/**
 * A past broadcast from `GET /helix/videos`. `created_at` is second 0: Helix has no broadcast
 * start for past streams, and on the fixture night it lands within a few seconds of it.
 */
export function readTwitchVideo(body: Json): TwitchVideo {
  const parsed = twitchVideosSchema.safeParse(body);

  if (!parsed.success) {
    throw new HttpError(502, "Twitch returned an unexpected response.");
  }

  const video = parsed.data.data[0];

  if (!video) throw new HttpError(404, VOD_ERRORS["not-found"], "not-found");

  // Highlights and uploads are cut or uploaded later, so `created_at` is not the stream start.
  if (video.type !== "archive" || !video.stream_id) {
    throw new HttpError(400, VOD_ERRORS["not-stream"], "not-stream");
  }

  const duration = parseTwitchDuration(video.duration);

  if (duration == null) throw new HttpError(502, "Twitch did not return a video length.");

  const startedAtMs = Date.parse(video.created_at);

  if (!Number.isFinite(startedAtMs)) {
    throw new HttpError(502, "Twitch returned an unexpected start time.");
  }

  return {
    videoId: video.id,
    title: video.title,
    actualStartMs: startedAtMs,
    durationSeconds: duration,
    userId: video.user_id,
    streamId: video.stream_id,
  };
}

/** True when the channel's live stream is the broadcast this archive is recording. */
export function isStreamLive(body: Json, streamId: string): boolean {
  const parsed = twitchStreamsSchema.safeParse(body);

  return parsed.success && parsed.data.data.some((stream) => stream.id === streamId);
}
