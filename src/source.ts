import { matchPullToVod } from "./match";
import type { VodPlatform } from "./types";

/** One recording of the night. Page state holds a list of these; only one is active for now. */
export interface VideoSource {
  kind: VodPlatform;
  id: string;
  /** Wall-clock epoch milliseconds of video second 0. */
  startedAt: number;
  /** Length in seconds. */
  duration: number;
  /** Seconds added after the wall-clock mapping (stream delay or a trimmed file). */
  offset: number;
}

/** Video second for a pull. Depends only on the pull's wall clock and the source. */
export function pullToVideoSeconds(pull: { startedAt: number }, source: VideoSource): number {
  return matchPullToVod({
    reportStartMs: pull.startedAt,
    fightStartMs: 0,
    actualStartMs: source.startedAt,
    vodDurationSeconds: source.duration,
    offsetSeconds: source.offset,
  }).vodSeconds;
}

export function pullEndVideoSeconds(pull: { endedAt: number }, source: VideoSource): number {
  return (pull.endedAt - source.startedAt) / 1000 + source.offset;
}

/** True when the pull's start falls inside the source. */
export function pullInSource(pull: { startedAt: number }, source: VideoSource): boolean {
  return matchPullToVod({
    reportStartMs: pull.startedAt,
    fightStartMs: 0,
    actualStartMs: source.startedAt,
    vodDurationSeconds: source.duration,
    offsetSeconds: source.offset,
  }).inVod;
}

/** Video second for a pull, or null when there is no source or the source does not cover it. */
export function pullSecondsIn(
  pull: { startedAt: number },
  source: VideoSource | null,
): number | null {
  if (!source || !pullInSource(pull, source)) return null;

  return pullToVideoSeconds(pull, source);
}

/**
 * Second in `to` showing the same wall-clock moment as `seconds` in `from`, each with its own
 * offset. Null when `to` has no footage of that moment.
 */
export function sameMoment(seconds: number, from: VideoSource, to: VideoSource): number | null {
  const wallClock = from.startedAt + (seconds - from.offset) * 1000;
  const target = (wallClock - to.startedAt) / 1000 + to.offset;

  return target >= 0 && target <= to.duration ? target : null;
}
