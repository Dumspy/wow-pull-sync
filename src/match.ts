export interface MatchInput {
  /** Report start, epoch milliseconds. */
  reportStartMs: number;
  /** Fight start, milliseconds after the report start. */
  fightStartMs: number;
  /** Finished live stream's actual start, epoch milliseconds. */
  actualStartMs: number;
  vodDurationSeconds: number;
  offsetSeconds: number;
}

export interface MatchResult {
  vodSeconds: number;
  inVod: boolean;
}

/**
 * VOD second for a pull:
 * (reportStart + fight.startTime - actualStartTime) / 1000 + offset.
 * A pull is outside the VOD when that second is before 0 or after the video length.
 */
export function matchPullToVod(input: MatchInput): MatchResult {
  const vodSeconds =
    (input.reportStartMs + input.fightStartMs - input.actualStartMs) / 1000 + input.offsetSeconds;
  const inVod = vodSeconds >= 0 && vodSeconds <= input.vodDurationSeconds;
  return { vodSeconds, inVod };
}
