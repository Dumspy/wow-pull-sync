import type { VodPlatform } from "./types";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const TWITCH_VIDEO_ID = /^\d{1,20}$/;

/** A video on one platform. `id` is the YouTube video id or the Twitch video number. */
export interface VodRef {
  platform: VodPlatform;
  id: string;
}

export function isVodId(platform: VodPlatform, id: string): boolean {
  return platform === "youtube" ? VIDEO_ID.test(id) : TWITCH_VIDEO_ID.test(id);
}

/** The video a YouTube or Twitch link points at, or null for any other link. */
export function parseVodLink(input: string): VodRef | null {
  const youtube = parseVideoId(input);

  if (youtube) return { platform: "youtube", id: youtube };

  const twitch = parseTwitchVideoId(input);

  if (twitch) return { platform: "twitch", id: twitch };

  return null;
}

/** The canonical link for a VOD, as the API expects it. */
export function vodLink(vod: VodRef): string {
  return vod.platform === "youtube"
    ? `https://www.youtube.com/watch?v=${vod.id}`
    : `https://www.twitch.tv/videos/${vod.id}`;
}

export function parseReportCode(input: string): string | null {
  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();

  if (host !== "warcraftlogs.com" && !host.endsWith(".warcraftlogs.com")) return null;
  const match = url.pathname.match(/^\/reports\/([A-Za-z0-9]+)\/?$/);

  return match?.[1] ?? null;
}

export function parseVideoId(input: string): string | null {
  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0] ?? "";

    return VIDEO_ID.test(id) ? id : null;
  }

  if (host !== "youtube.com" && host !== "m.youtube.com") return null;

  if (url.pathname === "/watch") {
    const id = url.searchParams.get("v") ?? "";

    return VIDEO_ID.test(id) ? id : null;
  }

  const match = url.pathname.match(/^\/(?:live|embed)\/([A-Za-z0-9_-]{11})\/?$/);

  return match?.[1] ?? null;
}

function parseTwitchVideoId(input: string): string | null {
  let url: URL;

  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^(www|m)\./, "");

  if (host === "player.twitch.tv") {
    const id = (url.searchParams.get("video") ?? "").replace(/^v/, "");

    return TWITCH_VIDEO_ID.test(id) ? id : null;
  }

  if (host !== "twitch.tv") return null;

  const match = url.pathname.match(/^\/(?:[A-Za-z0-9_]+\/)?videos?\/(\d{1,20})\/?$/);

  return match?.[1] ?? null;
}
