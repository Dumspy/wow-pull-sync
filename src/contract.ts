import { z } from "zod";

/**
 * One boss pull on the wire.
 * `startedAt` and `endedAt` are wall-clock epoch milliseconds.
 */
const pullSchema = z.object({
  fightId: z.number(),
  bossName: z.string(),
  kill: z.boolean(),
  pullNumber: z.number(),
  durationMs: z.number(),
  bossPercentage: z.number().nullable(),
  startedAt: z.number(),
  endedAt: z.number(),
  vodSeconds: z.number(),
  inVod: z.boolean(),
});

/** `vodStartedAtMs` is wall-clock epoch milliseconds of video second 0. */
export const pullSyncResponseSchema = z.object({
  videoId: z.string(),
  videoTitle: z.string(),
  reportCode: z.string(),
  reportTitle: z.string(),
  vodStartedAtMs: z.number(),
  vodDurationSeconds: z.number(),
  pulls: z.array(pullSchema),
});

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

export const errorResponseSchema = z.object({
  error: z.string(),
});

export type Pull = z.output<typeof pullSchema>;

export type PullSyncResponse = z.output<typeof pullSyncResponseSchema>;

export type PullRequest = z.output<typeof pullRequestSchema>;

export type ErrorResponse = z.output<typeof errorResponseSchema>;
