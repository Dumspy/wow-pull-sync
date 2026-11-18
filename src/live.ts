import type { ReportSummary } from "./parse-api";

/**
 * Warcraft Logs has no "still logging" flag. A live log's end time moves forward as the logger
 * uploads, so a log whose end is this recent counts as live. It covers a raid break.
 */
export const LIVE_LOG_WINDOW_MS = 30 * 60_000;

/** True when the log ended within `LIVE_LOG_WINDOW_MS` of `nowMs`. */
export function isLogLive(endedAtMs: number, nowMs: number): boolean {
  return nowMs - endedAtMs < LIVE_LOG_WINDOW_MS;
}

/**
 * Length in seconds of a VOD as the page uses it. A stream that is still running grows with
 * the wall clock, so pulls logged after the VOD was loaded still land inside it.
 */
export function vodLengthSeconds(
  vod: { live: boolean; startedAtMs: number; durationSeconds: number },
  nowMs: number,
): number {
  if (!vod.live) return vod.durationSeconds;

  return Math.max(vod.durationSeconds, (nowMs - vod.startedAtMs) / 1000);
}

/** When the log last had anything written to it. Older reports may lack `endTime`. */
export function reportEndMs(report: ReportSummary): number {
  if (report.endTime != null) return report.endTime;

  const lastFightEnd = Math.max(0, ...report.fights.map((fight) => fight.endTime));

  return report.startTime + lastFightEnd;
}
