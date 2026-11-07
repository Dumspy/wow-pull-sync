import { matchPullToVod } from "./match";

/** One recording of the night. Page state holds a list of these; only one is active for now. */
export interface VideoSource {
  kind: "youtube";
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
