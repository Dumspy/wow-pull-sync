import { describe, expect, it } from "vitest";
import { isVodId, parseReportCode, parseVideoId, parseVodLink, vodLink } from "./urls";

describe("parseVideoId", () => {
  it("accepts a youtube.com/live id, with or without www", () => {
    expect(parseVideoId("https://youtube.com/live/BLJBhzLNt8w")).toBe("BLJBhzLNt8w");
    expect(parseVideoId("https://www.youtube.com/live/BLJBhzLNt8w")).toBe("BLJBhzLNt8w");
    expect(parseVideoId("https://www.youtube.com/live/BLJBhzLNt8w/")).toBe("BLJBhzLNt8w");
  });

  it("accepts watch and youtu.be links, including the mobile host", () => {
    expect(parseVideoId("https://www.youtube.com/watch?v=BLJBhzLNt8w")).toBe("BLJBhzLNt8w");
    expect(parseVideoId("https://m.youtube.com/watch?v=BLJBhzLNt8w&t=12")).toBe("BLJBhzLNt8w");
    expect(parseVideoId("https://youtu.be/BLJBhzLNt8w?t=12")).toBe("BLJBhzLNt8w");
    expect(parseVideoId("https://www.youtube.com/embed/BLJBhzLNt8w")).toBe("BLJBhzLNt8w");
  });

  it("rejects a link that is not a video", () => {
    expect(parseVideoId("https://www.youtube.com/playlist?list=abc")).toBeNull();
    expect(parseVideoId("https://example.com/live/BLJBhzLNt8w")).toBeNull();
    expect(parseVideoId("not a url")).toBeNull();
  });
});

describe("parseVodLink", () => {
  it("tells YouTube and Twitch links apart", () => {
    expect(parseVodLink("https://youtube.com/live/BLJBhzLNt8w")).toEqual({
      platform: "youtube",
      id: "BLJBhzLNt8w",
    });
    expect(parseVodLink("https://www.twitch.tv/videos/2914150345")).toEqual({
      platform: "twitch",
      id: "2914150345",
    });
  });

  it("accepts the mobile, timestamped, channel-scoped and player Twitch links", () => {
    const twitch = { platform: "twitch", id: "2914150345" };

    expect(parseVodLink("https://m.twitch.tv/videos/2914150345")).toEqual(twitch);
    expect(parseVodLink("https://twitch.tv/videos/2914150345?t=0h2m56s")).toEqual(twitch);
    expect(parseVodLink("https://www.twitch.tv/litsyyyy/video/2914150345")).toEqual(twitch);
    expect(parseVodLink("https://player.twitch.tv/?video=v2914150345&parent=x")).toEqual(twitch);
  });

  it("rejects a Twitch channel, a clip and other sites", () => {
    expect(parseVodLink("https://www.twitch.tv/litsyyyy")).toBeNull();
    expect(parseVodLink("https://clips.twitch.tv/SomeClip")).toBeNull();
    expect(parseVodLink("https://vimeo.com/123456")).toBeNull();
    expect(parseVodLink("https://example.com/videos/2914150345")).toBeNull();
  });

  it("round-trips through the canonical link", () => {
    for (const vod of [
      { platform: "youtube", id: "BLJBhzLNt8w" },
      { platform: "twitch", id: "2914150345" },
    ] as const) {
      expect(parseVodLink(vodLink(vod))).toEqual(vod);
      expect(isVodId(vod.platform, vod.id)).toBe(true);
    }

    expect(isVodId("twitch", "BLJBhzLNt8w")).toBe(false);
    expect(isVodId("youtube", "2914150345")).toBe(false);
  });
});

describe("parseReportCode", () => {
  it("reads the report code", () => {
    expect(parseReportCode("https://www.warcraftlogs.com/reports/TPYJD2c4VkLZfBp9")).toBe(
      "TPYJD2c4VkLZfBp9",
    );
    expect(parseReportCode("https://www.warcraftlogs.com/reports/TPYJD2c4VkLZfBp9#fight=2")).toBe(
      "TPYJD2c4VkLZfBp9",
    );
  });

  it("rejects other sites", () => {
    expect(parseReportCode("https://example.com/reports/TPYJD2c4VkLZfBp9")).toBeNull();
    expect(parseReportCode("https://www.youtube.com/live/BLJBhzLNt8w")).toBeNull();
  });
});
