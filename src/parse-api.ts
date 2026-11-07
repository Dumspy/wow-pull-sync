import { z } from "zod";

import { parseIso8601Duration } from "./duration";
import { HttpError } from "./http-error";
import { jsonBody, type Json } from "./json";

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
  durationSeconds: number;
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
  unsupported: "This link is not supported. pull-sync works with YouTube and Twitch recordings.",
  "not-found":
    "We couldn't find this video. Check the link, and that the video is public or unlisted.",
  live: "This stream is still live. Add it once the stream has ended and the recording is available.",
  "not-stream":
    "This isn't a recorded live stream. pull-sync needs a stream recording to line up with the log. Uploads and highlights have no start time.",
} as const;

export function readYoutubeVideo(body: Json): VodSummary {
  const parsed = youtubeResponseSchema.safeParse(body);

  if (!parsed.success) {
    throw new HttpError(502, "YouTube returned an unexpected response.");
  }

  const item = parsed.data.items[0];

  if (!item) throw new HttpError(404, VOD_ERRORS["not-found"], "not-found");

  const live = item.liveStreamingDetails;

  if (!live) throw new HttpError(400, VOD_ERRORS["not-stream"], "not-stream");

  // A scheduled stream has no start yet; a running one has no end yet.
  if (!live.actualStartTime || !live.actualEndTime) {
    throw new HttpError(400, VOD_ERRORS.live, "live");
  }

  const duration = item.contentDetails ? parseIso8601Duration(item.contentDetails.duration) : null;

  if (duration == null) {
    throw new HttpError(502, "YouTube did not return a video length.");
  }

  const actualStartMs = Date.parse(live.actualStartTime);

  if (!Number.isFinite(actualStartMs)) {
    throw new HttpError(502, "YouTube returned an unexpected start time.");
  }

  return {
    videoId: item.id,
    title: item.snippet?.title ?? "YouTube VOD",
    actualStartMs,
    durationSeconds: duration,
  };
}
