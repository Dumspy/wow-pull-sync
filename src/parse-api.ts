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
});

const reportSchema = z.object({
  code: z.string().catch(""),
  title: z.string().catch("Warcraft Logs report"),
  startTime: z.number(),
  fights: z.array(fightSchema),
});

const recordSchema = z.record(z.string(), jsonBody);

export type Fight = z.output<typeof fightSchema>;

export type ReportSummary = z.output<typeof reportSchema>;

export interface VodSummary {
  videoId: string;
  title: string;
  actualStartMs: number;
  durationSeconds: number;
}

export function readReport(body: Json): ReportSummary {
  const payload = recordSchema.safeParse(body);

  if (!payload.success) {
    throw new HttpError(502, "Warcraft Logs returned an unexpected response.");
  }

  const errors = z.array(jsonBody).safeParse(payload.data.errors);

  if (errors.success && errors.data.length > 0) {
    const first = z.object({ message: z.string().optional() }).safeParse(errors.data[0]);
    const message = first.success ? first.data.message : undefined;

    throw new HttpError(400, message ?? "Warcraft Logs rejected the report.");
  }

  const data = recordSchema.safeParse(payload.data.data);
  const reportData = data.success ? recordSchema.safeParse(data.data.reportData) : undefined;

  if (!reportData?.success || reportData.data.report == null) {
    throw new HttpError(404, "No Warcraft Logs report found for that link.");
  }

  const parsed = reportSchema.safeParse(reportData.data.report);

  if (!parsed.success) {
    throw new HttpError(502, "Warcraft Logs returned an unexpected response.");
  }

  return parsed.data;
}

export function readYoutubeVideo(body: Json): VodSummary {
  const payload = recordSchema.safeParse(body);
  const items = payload.success ? z.array(jsonBody).safeParse(payload.data.items) : undefined;

  if (!payload.success || !items?.success) {
    throw new HttpError(502, "YouTube returned an unexpected response.");
  }

  if (items.data.length === 0) {
    throw new HttpError(400, "No YouTube video found for that link.");
  }

  const item = recordSchema.safeParse(items.data[0]);

  if (!item.success) {
    throw new HttpError(502, "YouTube returned an unexpected response.");
  }

  const live = z
    .object({
      actualStartTime: z.string(),
      actualEndTime: z.string(),
    })
    .safeParse(item.data.liveStreamingDetails);

  if (!live.success) {
    throw new HttpError(400, "That video is not a past live stream.");
  }

  const content = z.object({ duration: z.string() }).safeParse(item.data.contentDetails);
  const duration = content.success ? parseIso8601Duration(content.data.duration) : null;

  if (duration == null) {
    throw new HttpError(502, "YouTube did not return a video length.");
  }

  const actualStartMs = Date.parse(live.data.actualStartTime);

  if (!Number.isFinite(actualStartMs)) {
    throw new HttpError(502, "YouTube returned an unexpected start time.");
  }

  const snippet = z.object({ title: z.string() }).safeParse(item.data.snippet);
  const id = z.string().safeParse(item.data.id);

  return {
    videoId: id.success ? id.data : "",
    title: snippet.success ? snippet.data.title : "YouTube VOD",
    actualStartMs,
    durationSeconds: duration,
  };
}
