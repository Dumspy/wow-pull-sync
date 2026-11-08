import { z } from "zod";

import { jsonBody, type Json } from "./json";

/**
 * Dev-only, with `USE_FIXTURES=true` and `FIXTURE_LIVE_REPLAY=true`: the recorded night plays
 * again as if it were happening now. The log and the YouTube stream move by the same amount, so
 * every pull still lands on the same second of the real video, and the real player works.
 */

/** How far into the night the replay starts: a handful of pulls in, the next one minutes away. */
export const REPLAY_START_MS = 40 * 60_000;

/** When the replay began. Set by the first request, kept until the Worker restarts. */
let replayAnchorMs: number | null = null;

/** Milliseconds to add to every recorded wall-clock time. */
function replayShiftMs(recordedStartMs: number, nowMs: number): number {
  replayAnchorMs ??= nowMs;

  return replayAnchorMs - (recordedStartMs + REPLAY_START_MS);
}

/** Starts the replay over on the next request. For tests. */
export function resetReplay(): void {
  replayAnchorMs = null;
}

const replayReportSchema = z.looseObject({
  data: z.looseObject({
    reportData: z.looseObject({
      report: z.looseObject({
        startTime: z.number(),
        endTime: z.number(),
        fights: z.array(z.looseObject({ startTime: z.number(), endTime: z.number() })),
      }),
    }),
  }),
});

/**
 * The report as the live logger would have uploaded it by `nowMs`: only fights that have ended,
 * and an end time of now while the night is still going.
 */
export function replayReportBody(body: Json, nowMs: number): Json {
  const parsed = replayReportSchema.safeParse(structuredClone(body));

  if (!parsed.success) return body;
  const report = parsed.data.data.reportData.report;
  const shift = replayShiftMs(report.startTime, nowMs);
  const elapsed = nowMs - shift - report.startTime;

  report.fights = report.fights.filter((fight) => fight.endTime <= elapsed);
  report.endTime = Math.min(report.endTime - report.startTime, elapsed) + report.startTime + shift;
  report.startTime += shift;

  return jsonBody.parse(parsed.data);
}

const replayYoutubeSchema = z.looseObject({
  items: z.array(
    z.looseObject({
      contentDetails: z.looseObject({ duration: z.string() }).optional(),
      liveStreamingDetails: z.looseObject({
        actualStartTime: z.string().optional(),
        actualEndTime: z.string().optional(),
      }),
    }),
  ),
});

/**
 * The stream on the same replayed clock. Until its recorded end it is running: no end time and
 * no length, the way YouTube reports a live stream.
 */
export function replayYoutubeBody(body: Json, recordedReportStartMs: number, nowMs: number): Json {
  const parsed = replayYoutubeSchema.safeParse(structuredClone(body));
  const stream = parsed.success ? parsed.data.items[0]?.liveStreamingDetails : undefined;

  if (!parsed.success || !stream?.actualStartTime || !stream.actualEndTime) return body;
  const shift = replayShiftMs(recordedReportStartMs, nowMs);
  const endMs = Date.parse(stream.actualEndTime) + shift;
  stream.actualStartTime = new Date(Date.parse(stream.actualStartTime) + shift).toISOString();

  if (nowMs < endMs) {
    delete stream.actualEndTime;
    const item = parsed.data.items[0];

    if (item?.contentDetails) item.contentDetails.duration = "P0D";
  } else {
    stream.actualEndTime = new Date(endMs).toISOString();
  }

  return jsonBody.parse(parsed.data);
}
