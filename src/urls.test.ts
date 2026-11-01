import { describe, expect, it } from "vitest";
import { parseReportCode, parseVideoId } from "./urls";

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
