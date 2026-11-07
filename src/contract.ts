import { z } from "zod";

export const wowClassSchema = z.enum([
  "death-knight",
  "demon-hunter",
  "druid",
  "evoker",
  "hunter",
  "mage",
  "monk",
  "paladin",
  "priest",
  "rogue",
  "shaman",
  "warlock",
  "warrior",
]);

export type WowClass = z.output<typeof wowClassSchema>;

/** A player in the report's roster. `id` is the Warcraft Logs actor id used by `playerIds` and deaths. */
export const playerSchema = z.object({
  id: z.number(),
  name: z.string(),
  wowClass: wowClassSchema.nullable(),
  spec: z.string().nullable(),
  server: z.string().nullable(),
});

export type Player = z.output<typeof playerSchema>;

export const phaseSchema = z.object({
  id: z.number(),
  name: z.string(),
  isIntermission: z.boolean(),
});

/** Phase names for one encounter. A pull's `phaseStarts` ids refer to these. */
export const encounterPhasesSchema = z.object({
  encounterId: z.number(),
  phases: z.array(phaseSchema),
});

export type EncounterPhases = z.output<typeof encounterPhasesSchema>;

export const guildSchema = z.object({
  id: z.number(),
  name: z.string(),
  server: z.string().nullable(),
  region: z.string().nullable(),
});

export const zoneSchema = z.object({ id: z.number(), name: z.string() });

/**
 * A row on the pull timeline: every cast, buff or debuff of the listed spells in one encounter.
 * Defined in `lanes.ts`. `label` is a spell id until names are wired in.
 */
export const laneSchema = z.object({
  id: z.string(),
  encounterId: z.number(),
  label: z.string(),
  dataType: z.enum(["Casts", "Buffs", "Debuffs", "Interrupts", "Dispels"]),
  hostility: z.enum(["Friendlies", "Enemies"]),
  spellIds: z.array(z.number()),
});

export type Lane = z.output<typeof laneSchema>;

/** A phase starting. `atMs` counts from the start of the pull. */
export const phaseStartSchema = z.object({ phaseId: z.number(), atMs: z.number() });

/** A player death. `atMs` counts from the start of the pull. */
export const deathSchema = z.object({
  atMs: z.number(),
  playerId: z.number(),
  killerAbilityId: z.number().nullable(),
});

export type Death = z.output<typeof deathSchema>;

export const laneEventSchema = z.object({ atMs: z.number(), spellId: z.number() });

export const pullLaneSchema = z.object({
  laneId: z.string(),
  events: z.array(laneEventSchema),
});

/** One boss pull on the wire. `startedAt` and `endedAt` are wall-clock epoch milliseconds. */
export const pullSchema = z.object({
  fightId: z.number(),
  encounterId: z.number(),
  bossName: z.string(),
  kill: z.boolean(),
  pullNumber: z.number(),
  durationMs: z.number(),
  bossPercentage: z.number().nullable(),
  startedAt: z.number(),
  endedAt: z.number(),
  vodSeconds: z.number(),
  inVod: z.boolean(),
  difficulty: z.number().nullable(),
  /** Lowest HP across all bosses, where `bossPercentage` is the main boss. */
  fightPercentage: z.number().nullable(),
  lastPhase: z.number().nullable(),
  phaseStarts: z.array(phaseStartSchema),
  /** Roster ids of the players in the pull. */
  playerIds: z.array(z.number()),
  deaths: z.array(deathSchema),
  lanes: z.array(pullLaneSchema),
});

export type Pull = z.output<typeof pullSchema>;

/** `vodStartedAtMs` is wall-clock epoch milliseconds of video second 0. */
export const pullSyncResponseSchema = z.object({
  videoId: z.string(),
  videoTitle: z.string(),
  reportCode: z.string(),
  reportTitle: z.string(),
  vodStartedAtMs: z.number(),
  vodDurationSeconds: z.number(),
  zone: zoneSchema.nullable(),
  guild: guildSchema.nullable(),
  /** Name of the Warcraft Logs user who uploaded the report. */
  owner: z.string().nullable(),
  players: z.array(playerSchema),
  encounterPhases: z.array(encounterPhasesSchema),
  /** Lane definitions for the encounters in this report. */
  lanes: z.array(laneSchema),
  pulls: z.array(pullSchema),
});

export type PullSyncResponse = z.output<typeof pullSyncResponseSchema>;

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
