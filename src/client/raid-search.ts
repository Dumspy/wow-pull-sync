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

/** Most VODs shown side by side, as on the replay inspector design. */
export const MAX_PANES = 3;

const youtubeIdSchema = z.string().regex(/^[A-Za-z0-9_-]{11}$/);

/**
 * The raid's VODs, and `pov`, the index of the one on screen. A raid starts with none: the log
 * loads first, then the first VOD is added on the Add VOD page.
 */
const vodParams = {
  vods: z.array(searchVodSchema).default([]),
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
  /** Indexes of the VODs shown side by side, oldest pick first. `pov` is the one with sound. */
  side: z.array(z.number().int().min(0)).max(MAX_PANES).optional(),
};

const currentRaidSearch = z.object({ ...vodParams, ...reviewParams });

export type RaidSearch = z.output<typeof currentRaidSearch>;

/** Search params for `/raid/$reportCode`. `player` is the dev-only stand-in. */
export const raidSearchSchema = z.union([
  // First: a legacy link would also pass the current schema, as a raid with no VODs.
  z
    .object({ ...legacyVodParams, ...reviewParams })
    .transform((legacy): RaidSearch => fromLegacy(legacy)),
  currentRaidSearch,
]);

export const raidLinkError = "One of that raid link's parameters is not valid.";

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

/** The VOD on screen, or null while the raid has none yet. */
export function activeVod(search: { vods: SearchVod[]; pov?: number }): SearchVod | null {
  return search.vods[activeVodIndex(search)] ?? null;
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

  if (current.side != null) next.side = current.side;

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

/** The search with the recorded-by player set on the VOD on screen. */
export function searchWithRecorder(current: RaidSearch, by: number): RaidSearch {
  const index = activeVodIndex(current);

  return { ...current, vods: current.vods.map((vod, at) => (at === index ? { ...vod, by } : vod)) };
}

const currentViewSearch = z.object(vodParams);

export type RaidViewSearch = z.output<typeof currentViewSearch>;

/** Search params for the overview and boss progress pages. */
export const raidViewSearchSchema = z.union([
  z.object(legacyVodParams).transform((legacy): RaidViewSearch => fromLegacy(legacy)),
  currentViewSearch,
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

/**
 * Search params for the Add VOD page: the raid's own search, kept for the way back, and
 * `replace`, the index of an expired VOD to swap out.
 */
export const addVodSearchSchema = z.object({
  ...vodParams,
  ...reviewParams,
  replace: z.number().int().min(0).optional(),
});

export type AddVodSearch = z.output<typeof addVodSearchSchema>;

/** The raid page's search to go back to from Add VOD, without `replace`. */
export function raidSearchFrom(search: AddVodSearch): RaidSearch {
  const { replace: _replace, ...raid } = search;

  return raid;
}

/**
 * The raid's VODs with `vod` added at the end, or in place of the one at `replace`, and that
 * VOD on screen. The rest of the view (pull, lanes, side by side) is kept; side by side, the
 * new VOD joins the panes.
 */
export function searchWithVod(current: AddVodSearch, vod: SearchVod): RaidSearch {
  // `t` is the pull start in the VOD on screen, which is about to change.
  const { t: _previous, ...raid } = raidSearchFrom(current);
  const { replace } = current;
  const replacing = replace != null && replace < raid.vods.length;

  const next: RaidSearch = replacing
    ? { ...raid, vods: raid.vods.map((item, at) => (at === replace ? vod : item)), pov: replace }
    : { ...raid, vods: [...raid.vods, vod], pov: raid.vods.length };

  const panes = sidePanes(raid);

  if (panes.length === 0 || panes.includes(next.pov ?? 0)) return next;

  return searchWithPaneToggled({ ...next, pov: activeVodIndex(raid) }, next.pov ?? 0);
}

/**
 * The VODs on screen side by side, in range and once each. Fewer than two, or none of them the
 * VOD with sound (`pov`), means one player.
 */
export function sidePanes(search: RaidSearch): number[] {
  const panes: number[] = [];

  for (const index of search.side ?? []) {
    if (index < search.vods.length && !panes.includes(index)) panes.push(index);
  }

  return panes.length >= 2 && panes.includes(activeVodIndex(search)) ? panes : [];
}

/** Side by side on: the VOD on screen plus the next one. Off: back to the one with sound. */
export function searchWithSideBySide(current: RaidSearch, on: boolean): RaidSearch {
  const { side: _previous, ...rest } = current;

  if (!on) return rest;

  const pov = activeVodIndex(current);
  const other = current.vods.findIndex((_vod, at) => at !== pov);

  return other < 0 ? rest : { ...rest, side: [pov, other] };
}

/**
 * A chip clicked while side by side: a shown VOD leaves (keeping at least one), another joins
 * and takes the sound. A fourth VOD pushes out the oldest pick.
 */
export function searchWithPaneToggled(current: RaidSearch, index: number): RaidSearch {
  const panes = sidePanes(current);
  const pov = activeVodIndex(current);

  if (panes.includes(index)) {
    if (panes.length <= 1) return current;
    const rest = panes.filter((pane) => pane !== index);

    return { ...current, side: rest, pov: pov === index ? (rest[0] ?? 0) : pov };
  }

  const kept = panes.length >= MAX_PANES ? panes.slice(1) : panes;

  return { ...current, side: [...kept, index], pov: index };
}
