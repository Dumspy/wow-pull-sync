import { useQueries, type UseQueryResult } from "@tanstack/react-query";

import { vodLengthSeconds } from "../live";
import type { VideoSource } from "../source";
import type { Player, VodPlatform, VodResponse, WowClass } from "../types";
import type { VodRef } from "../urls";
import { VodLoadError, vodQueryOptions } from "./raid-queries";
import type { SearchVod } from "./raid-search";
import { useNow } from "./use-now";

/** `expired` is a VOD the platform no longer has, such as a Twitch VOD past its retention. */
export type VodStatus = "ready" | "loading" | "expired" | "failed";

/** One VOD of the raid as the page shows it. `source` is set only when it is ready. */
export interface RaidVod {
  index: number;
  ref: SearchVod;
  /** The recorded-by player's name, or "VOD n" for a link from before recorded-by. */
  name: string;
  wowClass: WowClass | undefined;
  platformLabel: string;
  status: VodStatus;
  /** The stream is still running. */
  live: boolean;
  source: VideoSource | null;
  error: string | null;
}

export const PLATFORM_LABELS: Record<VodPlatform, string> = {
  youtube: "YouTube",
  twitch: "Twitch",
};

/** Platform and id only, so changing an offset does not reload the VOD. */
export function vodRef(vod: VodRef): VodRef {
  return { platform: vod.platform, id: vod.id };
}

/** `nowMs` sets how far a live stream has got. */
export function raidVod(
  ref: SearchVod,
  index: number,
  query: Pick<UseQueryResult<VodResponse>, "data" | "error">,
  players: Player[],
  nowMs: number,
): RaidVod {
  const player = ref.by == null ? undefined : players.find((item) => item.id === ref.by);

  const base = {
    index,
    ref,
    name: player?.name ?? `VOD ${index + 1}`,
    wowClass: player?.wowClass ?? undefined,
    platformLabel: PLATFORM_LABELS[ref.platform],
  };

  if (query.data) {
    return {
      ...base,
      status: "ready",
      live: query.data.live,
      error: null,
      source: {
        kind: query.data.platform,
        id: query.data.id,
        startedAt: query.data.startedAtMs,
        duration: vodLengthSeconds(query.data, nowMs),
        offset: ref.offset ?? 0,
      },
    };
  }

  if (query.error) {
    const expired = query.error instanceof VodLoadError && query.error.reason === "not-found";

    return {
      ...base,
      status: expired ? "expired" : "failed",
      live: false,
      error: query.error.message,
      source: null,
    };
  }

  return { ...base, status: "loading", live: false, error: null, source: null };
}

/** Every VOD of the raid, loading side by side. A VOD that fails does not fail the page. */
export function useRaidVods(vods: SearchVod[], players: Player[]): RaidVod[] {
  const queries = useQueries({
    queries: vods.map((vod) => vodQueryOptions(vodRef(vod))),
  });

  const now = useNow(queries.some((query) => query.data?.live === true));

  return vods.map((vod, index) =>
    raidVod(vod, index, queries[index] ?? { data: undefined, error: null }, players, now),
  );
}
