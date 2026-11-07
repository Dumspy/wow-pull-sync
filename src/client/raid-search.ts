import { z } from "zod";

import { vodPlatformSchema } from "../contract";
import { isVodId } from "../urls";

/** One VOD of the raid as the URL keeps it. `by` is the recorded-by player's roster id. */
export const searchVodSchema = z
  .object({
    platform: vodPlatformSchema,
    id: z.string(),
    offset: z.number().finite().optional(),
    by: z.number().int().optional(),
  })
  .refine((vod) => isVodId(vod.platform, vod.id));

export type SearchVod = z.output<typeof searchVodSchema>;

const youtubeIdSchema = z.string().regex(/^[A-Za-z0-9_-]{11}$/);

/** The raid's VODs, and `pov`, the index of the one on screen. */
const vodParams = {
  vods: z.array(searchVodSchema).min(1),
  pov: z.number().int().min(0).optional(),
};

/** Links from before multi-VOD carried one YouTube `vod` and its `offset`. */
const legacyVodParams = {
  vod: youtubeIdSchema,
  offset: z.number().finite().optional(),
};

function fromLegacy<T extends { vod: string; offset?: number }>({ vod, offset, ...rest }: T) {
  const only: SearchVod =
    offset == null ? { platform: "youtube", id: vod } : { platform: "youtube", id: vod, offset };

  return { ...rest, vods: [only] };
}

const reviewParams = {
  pull: z.number().int().optional(),
  t: z.number().finite().optional(),
  /** Spell ids shown as event lanes on the pull timeline. */
  spells: z.array(z.number().int()).optional(),
  player: z.literal("fake").optional(),
};

const currentRaidSearch = z.object({ ...vodParams, ...reviewParams });

export type RaidSearch = z.output<typeof currentRaidSearch>;

/** Search params for `/raid/$reportCode`. `player` is the dev-only stand-in. */
export const raidSearchSchema = z.union([
  currentRaidSearch,
  z
    .object({ ...legacyVodParams, ...reviewParams })
    .transform((legacy): RaidSearch => fromLegacy(legacy)),
]);

export const raidLinkError =
  "That raid link is missing a VOD, or one of its parameters is not valid.";

export class RaidLinkError extends Error {
  constructor() {
    super(raidLinkError);
    this.name = "RaidLinkError";
  }
}

/** Index of the VOD on screen. A `pov` past the end falls back to the first VOD. */
export function activeVodIndex(search: { vods: SearchVod[]; pov?: number }): number {
  return search.pov != null && search.pov < search.vods.length ? search.pov : 0;
}

export function activeVod(search: { vods: SearchVod[]; pov?: number }): SearchVod {
  // SAFETY: the schema keeps at least one VOD and activeVodIndex stays in range.
  return search.vods[activeVodIndex(search)] as SearchVod;
}

/** One history entry for a selected pull. `t` is omitted when the pull is outside the VOD. */
export function searchForPull(
  current: RaidSearch,
  fightId: number,
  seconds: number | null,
): RaidSearch {
  const next: RaidSearch = { vods: current.vods, pull: fightId };

  if (current.pov != null) next.pov = current.pov;

  if (seconds != null) next.t = seconds;

  if (current.spells != null) next.spells = current.spells;

  if (current.player != null) next.player = current.player;

  return next;
}

/** The search with the active VOD's `offset` set, or dropped when it is zero. */
export function searchWithOffset(current: RaidSearch, offset: number): RaidSearch {
  const index = activeVodIndex(current);

  const vods = current.vods.map((vod, at) => {
    if (at !== index) return vod;
    const { offset: _previous, ...rest } = vod;

    return offset === 0 ? rest : { ...rest, offset };
  });

  return { ...current, vods };
}

const currentViewSearch = z.object(vodParams);

export type RaidViewSearch = z.output<typeof currentViewSearch>;

/** Search params for the overview and boss progress pages. */
export const raidViewSearchSchema = z.union([
  currentViewSearch,
  z.object(legacyVodParams).transform((legacy): RaidViewSearch => fromLegacy(legacy)),
]);

/** The VOD part of a raid search, for links to the overview and boss pages. */
export function viewSearch(search: RaidSearch | RaidViewSearch): RaidViewSearch {
  return search.pov == null ? { vods: search.vods } : { vods: search.vods, pov: search.pov };
}

/** The search with the shown spells set, or dropped when none are left. */
export function searchWithSpells(current: RaidSearch, spells: number[]): RaidSearch {
  const { spells: _previous, ...rest } = current;

  return spells.length === 0 ? rest : { ...rest, spells };
}
