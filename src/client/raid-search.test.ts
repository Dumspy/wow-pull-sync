import { describe, expect, it } from "vitest";

import {
  activeVod,
  raidSearchSchema,
  raidViewSearchSchema,
  searchForPull,
  searchWithOffset,
  searchWithRecorder,
  searchWithVod,
  viewSearch,
} from "./raid-search";

const YOUTUBE = { platform: "youtube", id: "BLJBhzLNt8w" } as const;
const TWITCH = { platform: "twitch", id: "2914150345" } as const;

describe("raid search", () => {
  it("reads a list of VODs and the one on screen", () => {
    const search = raidSearchSchema.parse({
      vods: [YOUTUBE, { ...TWITCH, offset: 4, by: 12 }],
      pov: 1,
    });

    expect(activeVod(search)).toEqual({ ...TWITCH, offset: 4, by: 12 });
  });

  it("turns an old single-VOD link into a one-VOD list", () => {
    expect(raidSearchSchema.parse({ vod: YOUTUBE.id, offset: 6, pull: 12 })).toEqual({
      vods: [{ ...YOUTUBE, offset: 6 }],
      pull: 12,
    });
    expect(raidViewSearchSchema.parse({ vod: YOUTUBE.id })).toEqual({ vods: [YOUTUBE] });
  });

  it("rejects a link with no VOD, or an id that does not fit its platform", () => {
    expect(raidSearchSchema.safeParse({}).success).toBe(false);
    expect(raidSearchSchema.safeParse({ vods: [] }).success).toBe(false);
    expect(
      raidSearchSchema.safeParse({ vods: [{ platform: "twitch", id: YOUTUBE.id }] }).success,
    ).toBe(false);
  });

  it("falls back to the first VOD when pov is past the end", () => {
    expect(activeVod({ vods: [YOUTUBE], pov: 3 })).toEqual(YOUTUBE);
  });

  it("sets the offset on the VOD on screen only, and drops it at zero", () => {
    const search = { vods: [YOUTUBE, TWITCH], pov: 1 };
    const shifted = searchWithOffset(search, 2.5);

    expect(shifted.vods).toEqual([YOUTUBE, { ...TWITCH, offset: 2.5 }]);
    expect(searchWithOffset(shifted, 0).vods).toEqual([YOUTUBE, TWITCH]);
  });

  it("keeps the VODs and pov when a pull is picked or a view is opened", () => {
    const search = { vods: [YOUTUBE, TWITCH], pov: 1, spells: [5] };

    expect(searchForPull(search, 7, 90)).toEqual({
      vods: [YOUTUBE, TWITCH],
      pov: 1,
      pull: 7,
      t: 90,
      spells: [5],
    });
    expect(viewSearch(search)).toEqual({ vods: [YOUTUBE, TWITCH], pov: 1 });
  });

  it("sets who recorded the VOD on screen only", () => {
    expect(searchWithRecorder({ vods: [YOUTUBE, TWITCH], pov: 1 }, 7).vods).toEqual([
      YOUTUBE,
      { ...TWITCH, by: 7 },
    ]);
  });

  it("adds a VOD at the end, or in place of an expired one, and shows it", () => {
    const added = { platform: "twitch", id: "2916000000", by: 12 } as const;

    expect(searchWithVod({ vods: [YOUTUBE, TWITCH], pov: 0 }, added, undefined)).toEqual({
      vods: [YOUTUBE, TWITCH, added],
      pov: 2,
    });
    expect(searchWithVod({ vods: [YOUTUBE, TWITCH], pov: 0 }, added, 1)).toEqual({
      vods: [YOUTUBE, added],
      pov: 1,
    });
    expect(searchWithVod({ vods: [YOUTUBE] }, added, 5)).toEqual({
      vods: [YOUTUBE, added],
      pov: 1,
    });
  });
});
