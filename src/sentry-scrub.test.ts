import { describe, expect, it } from "vitest";

import { jsonBody } from "./json";
import { scrubSentryJson, scrubSentryText } from "./sentry-scrub";

const REPORT = "TPYJD2c4VkLZfBp9";
const VIDEO = "BLJBhzLNt8w";
const WCL_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.wcl-token";
const API_KEY = "AIzaSyDUMMYKEY1234567890";
const TWITCH = "2914150345";

describe("sentry scrub", () => {
  it("removes report codes, video ids, pull ids, the t param, and tokens from text", () => {
    const text = [
      `https://pull-sync.example/raid/${REPORT}?vod=${VIDEO}&pull=42&t=1472&access_token=${WCL_TOKEN}`,
      `https://www.warcraftlogs.com/reports/${REPORT}#fight=99`,
      `https://youtube.com/live/${VIDEO}`,
      `https://youtu.be/${VIDEO}`,
      `https://www.twitch.tv/videos/${TWITCH}?t=0h2m56s`,
      `https://player.twitch.tv/?video=v${TWITCH}&parent=pull-sync.example`,
      `https://pull-sync.example/raid/${REPORT}?vods=${encodeURIComponent(JSON.stringify([{ platform: "twitch", id: TWITCH }]))}&pov=0`,
      `https://www.googleapis.com/youtube/v3/videos?id=${VIDEO}&key=${API_KEY}&part=snippet`,
      `https://www.warcraftlogs.com/oauth/token`,
      "Authorization: Bearer super-secret-token",
      "Authorization: Basic dXNlcjpzZWNyZXQ=",
    ].join(" ");

    const scrubbed = scrubSentryText(text);

    expect(scrubbed).not.toContain(REPORT);
    expect(scrubbed).not.toContain(VIDEO);
    expect(scrubbed).not.toContain(TWITCH);
    expect(scrubbed).toContain("/videos/:video");
    expect(scrubbed).toContain("vods=:vods");
    expect(scrubbed).not.toContain(WCL_TOKEN);
    expect(scrubbed).not.toContain(API_KEY);
    expect(scrubbed).not.toContain("super-secret-token");
    expect(scrubbed).not.toContain("dXNlcjpzZWNyZXQ=");
    expect(scrubbed).not.toContain("pull=42");
    expect(scrubbed).not.toContain("fight=99");
    expect(scrubbed).not.toContain("t=1472");
    expect(scrubbed).toContain("/raid/:report");
    expect(scrubbed).toContain("/reports/:report");
    expect(scrubbed).toContain("vod=:video");
    expect(scrubbed).toContain("pull=:pull");
    expect(scrubbed).toContain("fight=:pull");
    expect(scrubbed).toContain("/live/:video");
    expect(scrubbed).toContain("youtu.be/:video");
    expect(scrubbed).toContain("id=:video");
    expect(scrubbed).toContain("part=snippet");
    expect(scrubbed).toContain("Authorization: [Filtered]");
    expect(scrubbed).toContain("https://www.warcraftlogs.com/oauth/token");
  });

  it("scrubs an event, its request, exceptions, breadcrumbs, and contexts", () => {
    const event = jsonBody.parse({
      message: `Failed while playing https://youtu.be/${VIDEO}`,
      transaction: `GET /raid/${REPORT}?pull=7&t=90`,
      tags: {
        url: `https://pull-sync.example/raid/${REPORT}?vod=${VIDEO}&pull=7&t=90`,
        query: "pulls",
      },
      request: {
        url: `https://pull-sync.example/api/pulls?access_token=${WCL_TOKEN}&t=12`,
        method: "POST",
        query_string: `access_token=${WCL_TOKEN}`,
        data: {
          reportUrl: `https://www.warcraftlogs.com/reports/${REPORT}`,
          vodUrl: `https://youtube.com/live/${VIDEO}`,
          client_secret: "wcl-client-secret",
        },
        headers: {
          Authorization: `Bearer ${WCL_TOKEN}`,
          cookie: "session=topsecret",
        },
        cookies: { session: "topsecret" },
      },
      exception: {
        values: [
          {
            type: "Error",
            value: `Could not load https://pull-sync.example/raid/${REPORT}?vod=${VIDEO}&pull=42&t=1472`,
          },
        ],
      },
      breadcrumbs: [
        {
          category: "fetch",
          message: `POST https://www.googleapis.com/youtube/v3/videos?id=${VIDEO}&key=${API_KEY}`,
          data: {
            method: "POST",
            url: `https://www.warcraftlogs.com/api/v2/client?code=${REPORT}`,
            "url.query": `code=${REPORT}&access_token=${WCL_TOKEN}`,
            body: `{"reportUrl":"https://www.warcraftlogs.com/reports/${REPORT}"}`,
            status_code: 500,
          },
        },
        {
          category: "navigation",
          data: {
            from: `/raid/${REPORT}?vod=${VIDEO}&pull=3&t=10`,
            to: `https://www.youtube.com/watch?v=${VIDEO}`,
          },
        },
      ],
      contexts: {
        user: { ip_address: "203.0.113.8", email: "raid@example.com" },
        trace: {
          description: `https://pull-sync.example/raid/${REPORT}?vod=${VIDEO}&t=15`,
        },
      },
      user: { ip_address: "203.0.113.8" },
      extra: {
        note: `token=${WCL_TOKEN}`,
      },
    });

    const scrubbed = scrubSentryJson(event);
    const serialised = JSON.stringify(scrubbed);

    expect(serialised).not.toContain(REPORT);
    expect(serialised).not.toContain(VIDEO);
    expect(serialised).not.toContain(WCL_TOKEN);
    expect(serialised).not.toContain(API_KEY);
    expect(serialised).not.toContain("wcl-client-secret");
    expect(serialised).not.toContain("topsecret");
    expect(serialised).not.toContain("203.0.113.8");
    expect(serialised).not.toContain("raid@example.com");
    expect(serialised).not.toContain("pull=7");
    expect(serialised).not.toContain("pull=42");
    expect(serialised).not.toContain("pull=3");
    expect(serialised).not.toContain("t=");
    expect(serialised).not.toContain('"headers"');
    expect(serialised).not.toContain('"cookies"');
    expect(serialised).not.toContain('"query_string"');
    expect(serialised).not.toContain('"body"');
    expect(serialised).not.toContain("url.query");
    expect(serialised).toContain('"query":"pulls"');
    expect(serialised).toContain('"method":"POST"');
    expect(serialised).toContain("/raid/:report");
    expect(serialised).toContain("vod=:video");
    expect(serialised).toContain("id=:video");
    expect(serialised).toContain("v=:video");
  });
});
