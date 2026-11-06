import { z } from "zod";

/** Search params for `/raid/$reportCode`. `player` is the dev-only stand-in. */
export const raidSearchSchema = z.object({
  vod: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  pull: z.number().int().optional(),
  t: z.number().finite().optional(),
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

  if (current.player != null) next.player = current.player;

  return next;
}
