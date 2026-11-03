import { isBoolean, isJsonArray, isJsonObject, isNumber, isString, type Json } from "./json";
import { parseIso8601Duration } from "./duration";
import { HttpError } from "./http-error";
import type { Fight, ReportSummary, VodSummary } from "./types";

export function readReport(body: Json): ReportSummary {
  if (!isJsonObject(body)) {
    throw new HttpError(502, "Warcraft Logs returned an unexpected response.");
  }

  const errors = body.errors;

  if (isJsonArray(errors) && errors.length > 0) {
    const first = errors[0];

    const message =
      isJsonObject(first) && isString(first.message)
        ? first.message
        : "Warcraft Logs rejected the report.";

    throw new HttpError(400, message);
  }

  const data = isJsonObject(body.data) ? body.data : null;
  const reportData = data && isJsonObject(data.reportData) ? data.reportData : null;
  const report = reportData ? reportData.report : undefined;

  if (report == null) {
    throw new HttpError(404, "No Warcraft Logs report found for that link.");
  }

  if (!isJsonObject(report) || !isJsonArray(report.fights) || !isNumber(report.startTime)) {
    throw new HttpError(502, "Warcraft Logs returned an unexpected response.");
  }

  const fights: Fight[] = report.fights.map((fight) => {
    if (
      !isJsonObject(fight) ||
      !isNumber(fight.id) ||
      !isString(fight.name) ||
      !isNumber(fight.encounterID) ||
      !isNumber(fight.startTime) ||
      !isNumber(fight.endTime)
    ) {
      throw new HttpError(502, "Warcraft Logs returned an unexpected response.");
    }

    return {
      id: fight.id,
      name: fight.name,
      encounterID: fight.encounterID,
      startTime: fight.startTime,
      endTime: fight.endTime,
      kill: isBoolean(fight.kill) ? fight.kill : null,
      bossPercentage: isNumber(fight.bossPercentage) ? fight.bossPercentage : null,
    };
  });

  return {
    code: isString(report.code) ? report.code : "",
    title: isString(report.title) ? report.title : "Warcraft Logs report",
    startTime: report.startTime,
    fights,
  };
}

export function readYoutubeVideo(body: Json): VodSummary {
  if (!isJsonObject(body) || !isJsonArray(body.items)) {
    throw new HttpError(502, "YouTube returned an unexpected response.");
  }

  if (body.items.length === 0) {
    throw new HttpError(400, "No YouTube video found for that link.");
  }

  const item = body.items[0];

  if (!isJsonObject(item)) {
    throw new HttpError(502, "YouTube returned an unexpected response.");
  }

  const live = isJsonObject(item.liveStreamingDetails) ? item.liveStreamingDetails : null;

  if (!live || !isString(live.actualStartTime) || !isString(live.actualEndTime)) {
    throw new HttpError(400, "That video is not a past live stream.");
  }

  const content = isJsonObject(item.contentDetails) ? item.contentDetails : null;

  const duration =
    content && isString(content.duration) ? parseIso8601Duration(content.duration) : null;

  if (duration == null) {
    throw new HttpError(502, "YouTube did not return a video length.");
  }

  const actualStartMs = Date.parse(live.actualStartTime);

  if (!Number.isFinite(actualStartMs)) {
    throw new HttpError(502, "YouTube returned an unexpected start time.");
  }

  const snippet = isJsonObject(item.snippet) ? item.snippet : null;

  return {
    videoId: isString(item.id) ? item.id : "",
    title: snippet && isString(snippet.title) ? snippet.title : "YouTube VOD",
    actualStartMs,
    durationSeconds: duration,
  };
}
