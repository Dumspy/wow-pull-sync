import { parseIso8601Duration } from "./duration";
import { HttpError } from "./http-error";
import type { Fight, ReportSummary, VodSummary } from "./types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function readReport(body: unknown): ReportSummary {
  if (!isRecord(body)) {
    throw new HttpError(502, "Warcraft Logs returned an unexpected response.");
  }
  const errors = body.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0];
    const message =
      isRecord(first) && typeof first.message === "string"
        ? first.message
        : "Warcraft Logs rejected the report.";
    throw new HttpError(400, message);
  }
  const data = isRecord(body.data) ? body.data : null;
  const reportData = data && isRecord(data.reportData) ? data.reportData : null;
  const report = reportData ? reportData.report : undefined;
  if (report == null) {
    throw new HttpError(404, "No Warcraft Logs report found for that link.");
  }
  if (!isRecord(report) || !Array.isArray(report.fights) || typeof report.startTime !== "number") {
    throw new HttpError(502, "Warcraft Logs returned an unexpected response.");
  }
  const fights: Fight[] = report.fights.map((fight) => {
    if (
      !isRecord(fight) ||
      typeof fight.id !== "number" ||
      typeof fight.name !== "string" ||
      typeof fight.encounterID !== "number" ||
      typeof fight.startTime !== "number" ||
      typeof fight.endTime !== "number"
    ) {
      throw new HttpError(502, "Warcraft Logs returned an unexpected response.");
    }
    return {
      id: fight.id,
      name: fight.name,
      encounterID: fight.encounterID,
      startTime: fight.startTime,
      endTime: fight.endTime,
      kill: typeof fight.kill === "boolean" ? fight.kill : null,
      bossPercentage: typeof fight.bossPercentage === "number" ? fight.bossPercentage : null,
    };
  });
  return {
    code: typeof report.code === "string" ? report.code : "",
    title: typeof report.title === "string" ? report.title : "Warcraft Logs report",
    startTime: report.startTime,
    fights,
  };
}

export function readYoutubeVideo(body: unknown): VodSummary {
  if (!isRecord(body) || !Array.isArray(body.items)) {
    throw new HttpError(502, "YouTube returned an unexpected response.");
  }
  if (body.items.length === 0) {
    throw new HttpError(400, "No YouTube video found for that link.");
  }
  const item = body.items[0];
  if (!isRecord(item)) {
    throw new HttpError(502, "YouTube returned an unexpected response.");
  }
  const live = isRecord(item.liveStreamingDetails) ? item.liveStreamingDetails : null;
  if (!live || typeof live.actualStartTime !== "string" || typeof live.actualEndTime !== "string") {
    throw new HttpError(400, "That video is not a past live stream.");
  }
  const content = isRecord(item.contentDetails) ? item.contentDetails : null;
  const duration =
    content && typeof content.duration === "string" ? parseIso8601Duration(content.duration) : null;
  if (duration == null) {
    throw new HttpError(502, "YouTube did not return a video length.");
  }
  const actualStartMs = Date.parse(live.actualStartTime);
  if (!Number.isFinite(actualStartMs)) {
    throw new HttpError(502, "YouTube returned an unexpected start time.");
  }
  const snippet = isRecord(item.snippet) ? item.snippet : null;
  return {
    videoId: typeof item.id === "string" ? item.id : "",
    title: snippet && typeof snippet.title === "string" ? snippet.title : "YouTube VOD",
    actualStartMs,
    durationSeconds: duration,
  };
}
