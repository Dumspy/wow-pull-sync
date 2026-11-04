import { z } from "zod";

import { parseIso8601Duration } from "./duration";
import { HttpError } from "./http-error";
import type { Json } from "./json";

const fightSchema = z.object({
  id: z.number(),
  name: z.string(),
  encounterID: z.number(),
  startTime: z.number(),
  endTime: z.number(),
  kill: z.boolean().nullable().catch(null),
  bossPercentage: z.number().nullable().catch(null),
});

const reportSchema = z.object({
  code: z.string().catch(""),
  title: z.string().catch("Warcraft Logs report"),
  startTime: z.number(),
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
          actualStartTime: z.string(),
          actualEndTime: z.string(),
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

export function readYoutubeVideo(body: Json): VodSummary {
  const parsed = youtubeResponseSchema.safeParse(body);

  if (!parsed.success) {
    throw new HttpError(502, "YouTube returned an unexpected response.");
  }

  const item = parsed.data.items[0];

  if (!item) {
    throw new HttpError(400, "No YouTube video found for that link.");
  }

  const live = item.liveStreamingDetails;

  if (!live) {
    throw new HttpError(400, "That video is not a past live stream.");
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
