import { z } from "zod";

/** Search params for `/raid/$reportCode`. `player` is the dev-only stand-in. */
export const raidSearchSchema = z.object({
  vod: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  pull: z.number().int().optional(),
  t: z.number().finite().optional(),
  offset: z.number().finite().optional(),
  /** Spell ids shown as event lanes on the pull timeline. */
  spells: z.array(z.number().int()).optional(),
  player: z.literal("fake").optional(),
});

export type RaidSearch = z.output<typeof raidSearchSchema>;

export const raidLinkError =
  "That raid link is missing a VOD, or one of its parameters is not valid.";

export class RaidLinkError extends Error {
  constructor() {
    super(raidLinkError);
    this.name = "RaidLinkError";
  }
}

/** One history entry for a selected pull. `t` is omitted when the pull is outside the VOD. */
export function searchForPull(
  current: RaidSearch,
  fightId: number,
  seconds: number | null,
): RaidSearch {
  const next: RaidSearch = { vod: current.vod, pull: fightId };

  if (seconds != null) next.t = seconds;

  if (current.offset != null) next.offset = current.offset;

  if (current.spells != null) next.spells = current.spells;

  if (current.player != null) next.player = current.player;

  return next;
}

/** The search with `offset` set, or dropped when it is zero. */
export function searchWithOffset(current: RaidSearch, offset: number): RaidSearch {
  const { offset: _previous, ...rest } = current;

  return offset === 0 ? rest : { ...rest, offset };
}

/** Search params for the overview and boss progress pages. */
export const raidViewSearchSchema = z.object({
  vod: raidSearchSchema.shape.vod,
  offset: raidSearchSchema.shape.offset,
});

export type RaidViewSearch = z.output<typeof raidViewSearchSchema>;

/** The search with the shown spells set, or dropped when none are left. */
export function searchWithSpells(current: RaidSearch, spells: number[]): RaidSearch {
  const { spells: _previous, ...rest } = current;

  return spells.length === 0 ? rest : { ...rest, spells };
}
