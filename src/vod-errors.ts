import type { VodErrorReason } from "./types";

/** Why a VOD link can't be used, worded as on the Add VOD design: a short title and a note. */
export const VOD_ERROR_COPY: Record<VodErrorReason, { title: string; note: string }> = {
  unsupported: {
    title: "This link is not supported",
    note: "pull-sync works with YouTube and Twitch recordings.",
  },
  "not-found": {
    title: "We couldn't find this video",
    note: "Check the link, and that the video is public or unlisted.",
  },
  upcoming: {
    title: "This stream hasn't started yet",
    note: "Add it once the stream is live.",
  },
  live: {
    title: "This Twitch stream is still live",
    note: "Twitch VODs can be added once the stream has ended. Live raids work with YouTube streams.",
  },
  "not-stream": {
    title: "This isn't a recorded live stream",
    note: "pull-sync needs a stream recording to line up with the log. Uploads and highlights have no start time.",
  },
};

/** The title and note as one sentence pair, for API error messages. */
export function vodErrorMessage(reason: VodErrorReason): string {
  const copy = VOD_ERROR_COPY[reason];

  return `${copy.title}. ${copy.note}`;
}
