import { z } from "zod";

/** One boss pull on the wire. `startedAt` and `endedAt` are wall-clock epoch milliseconds. */
export interface Pull {
  fightId: number;
  bossName: string;
  kill: boolean;
  pullNumber: number;
  durationMs: number;
  bossPercentage: number | null;
  startedAt: number;
  endedAt: number;
  vodSeconds: number;
  inVod: boolean;
}

/** `vodStartedAtMs` is wall-clock epoch milliseconds of video second 0. */
export interface PullSyncResponse {
  videoId: string;
  videoTitle: string;
  reportCode: string;
  reportTitle: string;
  vodStartedAtMs: number;
  vodDurationSeconds: number;
  pulls: Pull[];
}

/** Body of `POST /api/pulls`. A missing or null offset is zero seconds. */
export const pullRequestSchema = z.object({
  reportUrl: z.string(),
  vodUrl: z.string(),
  offsetSeconds: z
    .number()
    .finite()
    .nullish()
    .transform((value) => value ?? 0),
});

export type PullRequest = z.output<typeof pullRequestSchema>;

export interface ErrorResponse {
  error: string;
}
