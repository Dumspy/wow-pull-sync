import { describe, expect, it } from "vitest";

import {
  activeVod,
  raidSearchSchema,
  raidViewSearchSchema,
  searchForPull,
  searchWithOffset,
  searchWithPaneToggled,
  searchWithSideBySide,
  sidePanes,
  searchWithRecorder,
  raidSearchFrom,
  searchWithVod,
  viewSearch,
  type RaidSearch,
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

    expect(searchWithVod({ vods: [YOUTUBE, TWITCH], pov: 0 }, added)).toEqual({
      vods: [YOUTUBE, TWITCH, added],
      pov: 2,
    });
    expect(searchWithVod({ vods: [YOUTUBE, TWITCH], pov: 0, replace: 1 }, added)).toEqual({
      vods: [YOUTUBE, added],
      pov: 1,
    });
    expect(searchWithVod({ vods: [YOUTUBE], replace: 5 }, added)).toEqual({
      vods: [YOUTUBE, added],
      pov: 1,
    });
  });

  it("keeps the raid view through Add VOD, minus the old VOD's pull start", () => {
    const added = { platform: "twitch", id: "2916000000" } as const;

    const view: RaidSearch = {
      vods: [YOUTUBE],
      pull: 7,
      t: 1200,
      spells: [5],
      player: "fake",
    };

    expect(searchWithVod(view, added)).toEqual({
      vods: [YOUTUBE, added],
      pov: 1,
      pull: 7,
      spells: [5],
      player: "fake",
    });
    expect(raidSearchFrom({ ...view, replace: 0 })).toEqual(view);
  });

  it("adds a saved VOD to the panes side by side", () => {
    const added = { platform: "twitch", id: "2916000000" } as const;

    expect(searchWithVod({ vods: [YOUTUBE, TWITCH], pov: 0, side: [0, 1] }, added)).toMatchObject({
      pov: 2,
      side: [0, 1, 2],
    });
    expect(
      searchWithVod({ vods: [YOUTUBE, TWITCH], pov: 0, side: [0, 1], replace: 1 }, added),
    ).toMatchObject({ pov: 1, side: [0, 1] });
  });

  describe("side by side", () => {
    const third = { platform: "twitch", id: "2916000000" } as const;
    const fourth = { platform: "youtube", id: "dQw4w9WgXcQ" } as const;
    const four = [YOUTUBE, TWITCH, third, fourth];

    it("starts with the VOD on screen and the next one", () => {
      expect(searchWithSideBySide({ vods: [YOUTUBE, TWITCH], pov: 1 }, true).side).toEqual([1, 0]);
      expect(searchWithSideBySide({ vods: [YOUTUBE] }, true).side).toBeUndefined();
      expect(searchWithSideBySide({ vods: [YOUTUBE, TWITCH], side: [0, 1] }, false)).toEqual({
        vods: [YOUTUBE, TWITCH],
      });
    });

    it("adds a VOD with sound, and drops the oldest pick past three", () => {
      const three = searchWithPaneToggled({ vods: four, side: [0, 1], pov: 0 }, 2);

      expect(three).toMatchObject({ side: [0, 1, 2], pov: 2 });
      expect(searchWithPaneToggled(three, 3)).toMatchObject({ side: [1, 2, 3], pov: 3 });
    });

    it("removes a VOD and moves the sound if it had it", () => {
      expect(searchWithPaneToggled({ vods: four, side: [0, 1, 2], pov: 1 }, 1)).toMatchObject({
        side: [0, 2],
        pov: 0,
      });
    });

    it("ignores panes past the end and needs two to split", () => {
      expect(sidePanes({ vods: [YOUTUBE, TWITCH], side: [0, 5, 1, 1] })).toEqual([0, 1]);
      expect(sidePanes({ vods: [YOUTUBE, TWITCH], side: [1] })).toEqual([]);
      // No pane has the sound, so there is no leader: one player instead.
      expect(sidePanes({ vods: [YOUTUBE, TWITCH, TWITCH], pov: 0, side: [1, 2] })).toEqual([]);
      expect(raidSearchSchema.safeParse({ vods: four, side: [0, 1, 2, 3] }).success).toBe(false);
    });

    it("keeps the panes when a pull is picked", () => {
      expect(searchForPull({ vods: [YOUTUBE, TWITCH], side: [0, 1] }, 3, null).side).toEqual([
        0, 1,
      ]);
    });
  });
});
